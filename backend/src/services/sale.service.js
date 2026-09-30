'use strict';
const { db, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { lineTotal, toMinor, fromMinor } = require('../utils/money');
const { can } = require('../config/permissions');
const { loadSequences } = require('./settings.service');
const { loadProducts, applyMovements } = require('./stock.service');
const { normalizePayment, paymentStatus, writePayment, applyToRemaining } = require('./payment.service');
const { addAudit } = require('./audit.service');
const { fromSnap } = require('../utils/serialize');

/**
 * VENTE (cahier des charges §13 et §33) — une seule transaction Firestore :
 * vérification du stock → vente → sortie de stock → mouvements → paiement → audit.
 * Le coût des marchandises vendues est figé sur la vente (purchasePrice au moment de la vente).
 */
const createSale = async (input, ctx) => {
  const ref = col('sales').doc();
  let change = 0;
  await db.runTransaction(async (tx) => {
    change = 0;
    // ---------- LECTURES ----------
    const seq = await loadSequences(tx);
    const loaded = await loadProducts(tx, input.items.map((i) => i.productId));

    // ---------- CALCULS ----------
    const canOverride = can(ctx.role, 'sales:override_price');
    const items = input.items.map((i) => {
      const p = loaded.get(i.productId);
      const unitPrice = canOverride && i.unitPrice != null ? i.unitPrice : p.data.sellingPrice;
      return {
        productId: i.productId,
        productName: p.data.name,
        unit: p.data.unit,
        quantity: i.quantity,
        unitPrice,
        purchasePrice: p.price,
        total: lineTotal(i.quantity, unitPrice),
        cost: lineTotal(i.quantity, p.price),
      };
    });
    const subtotalMinor = items.reduce((a, it) => a + toMinor(it.total), 0);
    const discountMinor = toMinor(input.discount || 0);
    if (discountMinor > subtotalMinor) throw new ApiError(400, 'La remise dépasse le sous-total');
    const totalMinor = subtotalMinor - discountMinor;
    const costMinor = items.reduce((a, it) => a + toMinor(it.cost), 0);

    let paidMinor = 0;
    let appliedPayment = null;
    const normalized = normalizePayment(input.payment, seq.company.exchangeRateUSD);
    if (normalized && totalMinor > 0) {
      const r = applyToRemaining(normalized, fromMinor(totalMinor));
      paidMinor = toMinor(r.applied);
      appliedPayment = r.normalized;
      change = r.change;
    }
    if (totalMinor - paidMinor > 0 && !input.customerName) {
      throw new ApiError(400, 'Le nom du client est obligatoire pour une vente non soldée (crédit)');
    }

    const saleNumber = seq.next('sale', seq.company.salePrefix);
    const invoiceNumber = seq.next('invoice', seq.company.invoicePrefix);
    const total = fromMinor(totalMinor);
    const sale = {
      saleNumber,
      invoiceNumber,
      items,
      subtotal: fromMinor(subtotalMinor),
      discount: fromMinor(discountMinor),
      total,
      costOfGoods: fromMinor(costMinor),
      margin: fromMinor(totalMinor - costMinor),
      amountPaid: fromMinor(paidMinor),
      remainingAmount: fromMinor(totalMinor - paidMinor),
      paymentStatus: paymentStatus(total, fromMinor(paidMinor)),
      paymentMethod: appliedPayment ? appliedPayment.method : 'CREDIT',
      status: 'VALIDATED',
      customerName: input.customerName || null,
      note: input.note || null,
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      createdAt: ts(),
    };

    // ---------- ÉCRITURES ----------
    seq.commit(tx);
    tx.set(ref, sale);
    applyMovements(
      tx, loaded,
      items.map((it) => ({
        productId: it.productId, delta: -it.quantity, type: 'SALE',
        referenceId: ref.id, referenceNumber: saleNumber, reason: `Vente ${saleNumber}`,
      })),
      ctx, // lève 409 si stock insuffisant → toute la transaction est annulée
    );
    if (appliedPayment) {
      writePayment(tx, ctx, { kind: 'SALE_PAYMENT', referenceId: ref.id, referenceNumber: saleNumber, normalized: appliedPayment });
    }
    addAudit(tx, ctx, {
      action: 'SALE', module: 'sales', documentId: ref.id,
      description: `Vente ${saleNumber} — facture ${invoiceNumber} — ${total} CDF`,
      newData: { ...sale, createdAt: undefined },
    });
  });
  return { sale: fromSnap(await ref.get()), change };
};

/** Encaissement d'un solde de vente à crédit */
const addSalePayment = async (id, payment, ctx) => {
  const ref = col('sales').doc(id);
  let change = 0;
  await db.runTransaction(async (tx) => {
    const seq = await loadSequences(tx);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Vente introuvable');
    const s = snap.data();
    if (s.status !== 'VALIDATED') throw new ApiError(409, 'Vente annulée : encaissement impossible');
    const normalized = normalizePayment(payment, seq.company.exchangeRateUSD);
    if (!normalized) throw new ApiError(400, 'Montant invalide');
    const r = applyToRemaining(normalized, s.remainingAmount);
    change = r.change;
    const paidMinor = toMinor(s.amountPaid) + toMinor(r.applied);
    const remainingMinor = toMinor(s.total) - paidMinor;
    tx.update(ref, {
      amountPaid: fromMinor(paidMinor),
      remainingAmount: fromMinor(remainingMinor),
      paymentStatus: paymentStatus(s.total, fromMinor(paidMinor)),
      updatedAt: ts(),
    });
    writePayment(tx, ctx, { kind: 'SALE_PAYMENT', referenceId: id, referenceNumber: s.saleNumber, normalized: r.normalized });
    addAudit(tx, ctx, {
      action: 'UPDATE', module: 'sales', documentId: id,
      description: `Encaissement de ${r.applied} CDF sur la vente ${s.saleNumber}`,
      oldData: { amountPaid: s.amountPaid, remainingAmount: s.remainingAmount },
      newData: { amountPaid: fromMinor(paidMinor), remainingAmount: fromMinor(remainingMinor) },
    });
  });
  return { sale: fromSnap(await ref.get()), change };
};

/** Annulation : la vente reste visible (CANCELLED), le stock est remis (RETURN), le remboursement est tracé */
const cancelSale = async (id, reason, ctx) => {
  const ref = col('sales').doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Vente introuvable');
    const s = snap.data();
    if (s.status !== 'VALIDATED') throw new ApiError(409, 'Cette vente est déjà annulée');
    const loaded = await loadProducts(tx, s.items.map((i) => i.productId), { allowArchived: true });

    applyMovements(
      tx, loaded,
      s.items.map((i) => ({
        productId: i.productId, delta: i.quantity, type: 'RETURN',
        referenceId: id, referenceNumber: s.saleNumber, reason: `Annulation de la vente ${s.saleNumber} : ${reason}`,
      })),
      ctx,
    );
    tx.update(ref, { status: 'CANCELLED', cancelReason: reason, cancelledBy: ctx.userId, cancelledAt: ts(), updatedAt: ts() });
    if (toMinor(s.amountPaid) > 0) {
      writePayment(tx, ctx, {
        kind: 'SALE_REFUND', referenceId: id, referenceNumber: s.saleNumber,
        normalized: { method: s.paymentMethod, currency: 'CDF', amount: s.amountPaid, exchangeRate: 1, amountBase: s.amountPaid },
        note: `Remboursement suite à annulation : ${reason}`,
      });
    }
    addAudit(tx, ctx, {
      action: 'CANCEL', module: 'sales', documentId: id,
      description: `Annulation de la vente ${s.saleNumber} : ${reason}`,
      oldData: { status: 'VALIDATED', total: s.total }, newData: { status: 'CANCELLED' },
    });
  });
  return fromSnap(await ref.get());
};

module.exports = { createSale, addSalePayment, cancelSale };
