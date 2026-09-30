'use strict';
const { db, col, ts, FieldValue } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { lineTotal, toMinor, fromMinor } = require('../utils/money');
const { loadSequences } = require('./settings.service');
const { loadProducts, applyMovements } = require('./stock.service');
const { normalizePayment, paymentStatus, writePayment, applyToRemaining } = require('./payment.service');
const { addAudit } = require('./audit.service');
const { fromSnap } = require('../utils/serialize');

/**
 * ACHAT (cahier des charges §11 et §33) — une seule transaction Firestore :
 * fournisseur → achat → entrée de stock → mouvements → paiement → audit
 */
const createPurchase = async (input, ctx) => {
  const ref = col('purchases').doc();
  await db.runTransaction(async (tx) => {
    // ---------- LECTURES ----------
    const seq = await loadSequences(tx);
    const supplierSnap = await tx.get(col('suppliers').doc(input.supplierId));
    if (!supplierSnap.exists || supplierSnap.data().status !== 'ACTIVE') {
      throw new ApiError(400, 'Fournisseur introuvable ou inactif');
    }
    const loaded = await loadProducts(tx, input.items.map((i) => i.productId));

    // ---------- CALCULS (entiers) ----------
    const items = input.items.map((i) => {
      const p = loaded.get(i.productId);
      return {
        productId: i.productId,
        productName: p.data.name,
        unit: p.data.unit,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: lineTotal(i.quantity, i.unitPrice),
      };
    });
    const subtotalMinor = items.reduce((a, it) => a + toMinor(it.total), 0);
    const discountMinor = toMinor(input.discount || 0);
    if (discountMinor > subtotalMinor) throw new ApiError(400, 'La remise dépasse le sous-total');
    const totalMinor = subtotalMinor - discountMinor;

    let paidMinor = 0;
    let appliedPayment = null;
    const normalized = normalizePayment(input.payment, seq.company.exchangeRateUSD);
    if (normalized && totalMinor > 0) {
      const r = applyToRemaining(normalized, fromMinor(totalMinor));
      if (r.change > 0) throw new ApiError(400, "Le montant payé dépasse le total de l'achat");
      paidMinor = toMinor(r.applied);
      appliedPayment = r.normalized;
    }

    const purchaseNumber = seq.next('purchase', seq.company.purchasePrefix);
    const total = fromMinor(totalMinor);
    const purchase = {
      purchaseNumber,
      supplierId: input.supplierId,
      supplierName: supplierSnap.data().name,
      items,
      subtotal: fromMinor(subtotalMinor),
      discount: fromMinor(discountMinor),
      total,
      amountPaid: fromMinor(paidMinor),
      remainingAmount: fromMinor(totalMinor - paidMinor),
      paymentStatus: paymentStatus(total, fromMinor(paidMinor)),
      paymentMethod: appliedPayment ? appliedPayment.method : 'CREDIT',
      status: 'VALIDATED',
      note: input.note || null,
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      createdAt: ts(),
    };

    // ---------- ÉCRITURES ----------
    seq.commit(tx);
    tx.set(ref, purchase);

    // Le remise est répartie au prorata pour valoriser correctement le coût du stock
    const movements = items.map((it) => {
      const effMinor = subtotalMinor > 0 ? Math.round((toMinor(it.total) * totalMinor) / subtotalMinor) : 0;
      return {
        productId: it.productId, delta: it.quantity, type: 'PURCHASE',
        referenceId: ref.id, referenceNumber: purchaseNumber,
        reason: `Achat ${purchaseNumber} — ${supplierSnap.data().name}`,
        unitCost: fromMinor(effMinor) / it.quantity,
      };
    });
    applyMovements(tx, loaded, movements, ctx);

    if (appliedPayment) {
      writePayment(tx, ctx, { kind: 'PURCHASE_PAYMENT', referenceId: ref.id, referenceNumber: purchaseNumber, normalized: appliedPayment });
    }
    // Dénormalisation documentée (docs/firestore.md) : totaux fournisseur en centimes entiers
    tx.update(supplierSnap.ref, {
      'stats.count': FieldValue.increment(1),
      'stats.totalMinor': FieldValue.increment(totalMinor),
      'stats.paidMinor': FieldValue.increment(paidMinor),
      'stats.debtMinor': FieldValue.increment(totalMinor - paidMinor),
      updatedAt: ts(),
    });
    addAudit(tx, ctx, {
      action: 'PURCHASE', module: 'purchases', documentId: ref.id,
      description: `Achat ${purchaseNumber} de ${total} CDF auprès de ${supplierSnap.data().name}`,
      newData: { ...purchase, createdAt: undefined },
    });
  });
  return fromSnap(await ref.get());
};

/** Paiement ultérieur d'une dette fournisseur */
const addPurchasePayment = async (id, payment, ctx) => {
  const ref = col('purchases').doc(id);
  await db.runTransaction(async (tx) => {
    const seq = await loadSequences(tx);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Achat introuvable');
    const p = snap.data();
    if (p.status !== 'VALIDATED') throw new ApiError(409, 'Achat annulé : paiement impossible');
    const normalized = normalizePayment(payment, seq.company.exchangeRateUSD);
    if (!normalized) throw new ApiError(400, 'Montant invalide');
    const r = applyToRemaining(normalized, p.remainingAmount);
    if (r.change > 0) throw new ApiError(400, `Le montant dépasse la dette restante (${p.remainingAmount})`);
    const paidMinor = toMinor(p.amountPaid) + toMinor(r.applied);
    const remainingMinor = toMinor(p.total) - paidMinor;
    tx.update(ref, {
      amountPaid: fromMinor(paidMinor),
      remainingAmount: fromMinor(remainingMinor),
      paymentStatus: paymentStatus(p.total, fromMinor(paidMinor)),
      updatedAt: ts(),
    });
    tx.update(col('suppliers').doc(p.supplierId), {
      'stats.paidMinor': FieldValue.increment(toMinor(r.applied)),
      'stats.debtMinor': FieldValue.increment(-toMinor(r.applied)),
      updatedAt: ts(),
    });
    writePayment(tx, ctx, { kind: 'PURCHASE_PAYMENT', referenceId: id, referenceNumber: p.purchaseNumber, normalized: r.normalized });
    addAudit(tx, ctx, {
      action: 'UPDATE', module: 'purchases', documentId: id,
      description: `Paiement de ${r.applied} CDF sur l'achat ${p.purchaseNumber}`,
      oldData: { amountPaid: p.amountPaid, remainingAmount: p.remainingAmount },
      newData: { amountPaid: fromMinor(paidMinor), remainingAmount: fromMinor(remainingMinor) },
    });
  });
  return fromSnap(await ref.get());
};

/** Annulation : l'achat reste visible (statut CANCELLED), le stock est repris, un remboursement est tracé */
const cancelPurchase = async (id, reason, ctx) => {
  const ref = col('purchases').doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Achat introuvable');
    const p = snap.data();
    if (p.status !== 'VALIDATED') throw new ApiError(409, 'Cet achat est déjà annulé');
    const loaded = await loadProducts(tx, p.items.map((i) => i.productId), { allowArchived: true });

    const movements = p.items.map((i) => ({
      productId: i.productId, delta: -i.quantity, type: 'ADJUSTMENT',
      referenceId: id, referenceNumber: p.purchaseNumber,
      reason: `Annulation de l'achat ${p.purchaseNumber} : ${reason}`,
    }));
    applyMovements(tx, loaded, movements, ctx); // 409 si une partie a déjà été vendue

    tx.update(ref, { status: 'CANCELLED', cancelReason: reason, cancelledBy: ctx.userId, cancelledAt: ts(), updatedAt: ts() });
    const paidMinor = toMinor(p.amountPaid);
    if (paidMinor > 0) {
      writePayment(tx, ctx, {
        kind: 'PURCHASE_REFUND', referenceId: id, referenceNumber: p.purchaseNumber,
        normalized: { method: p.paymentMethod, currency: 'CDF', amount: p.amountPaid, exchangeRate: 1, amountBase: p.amountPaid },
        note: `Remboursement suite à annulation : ${reason}`,
      });
    }
    tx.update(col('suppliers').doc(p.supplierId), {
      'stats.count': FieldValue.increment(-1),
      'stats.totalMinor': FieldValue.increment(-toMinor(p.total)),
      'stats.paidMinor': FieldValue.increment(-paidMinor),
      'stats.debtMinor': FieldValue.increment(-(toMinor(p.total) - paidMinor)),
      updatedAt: ts(),
    });
    addAudit(tx, ctx, {
      action: 'CANCEL', module: 'purchases', documentId: id,
      description: `Annulation de l'achat ${p.purchaseNumber} : ${reason}`,
      oldData: { status: 'VALIDATED' }, newData: { status: 'CANCELLED' },
    });
  });
  return fromSnap(await ref.get());
};

module.exports = { createPurchase, addPurchasePayment, cancelPurchase };
