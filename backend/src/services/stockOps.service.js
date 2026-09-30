'use strict';
/** Ajustements manuels, pertes et inventaires (cahier des charges §20, §21, §33) */
const { db, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { lineTotalMinor, fromMinor, toMinor, addQty } = require('../utils/money');
const { ROLES } = require('../config/defaults');
const { loadSequences } = require('./settings.service');
const { loadProducts, applyMovements } = require('./stock.service');
const { addAudit } = require('./audit.service');
const { fromSnap } = require('../utils/serialize');

const MAX_WRITES_LINES = 80; // 500 écritures max par transaction Firestore

/* ------------------------------------------------------------------ AJUSTEMENT */
const adjustStock = async ({ productId, delta, reason }, ctx) => {
  let result;
  await db.runTransaction(async (tx) => {
    const loaded = await loadProducts(tx, [productId]);
    const entry = loaded.get(productId);
    const before = entry.stock;
    [result] = applyMovements(tx, loaded, [{ productId, delta, type: 'ADJUSTMENT', reason }], ctx);
    addAudit(tx, ctx, {
      action: 'STOCK_ADJUSTMENT', module: 'stock', documentId: productId,
      description: `Ajustement de stock « ${entry.data.name} » : ${before} → ${result.newStock} ${entry.data.unit} (${reason})`,
      oldData: { currentStock: before }, newData: { currentStock: result.newStock, delta },
    });
  });
  return result;
};

/* ------------------------------------------------------------------ PERTES */
const createLoss = async (input, ctx) => {
  const ref = col('losses').doc();
  await db.runTransaction(async (tx) => {
    const seq = await loadSequences(tx);
    const loaded = await loadProducts(tx, [input.productId]);
    const entry = loaded.get(input.productId);
    if (input.quantity > entry.stock) {
      throw new ApiError(409, `La perte (${input.quantity} ${entry.data.unit}) dépasse le stock disponible (${entry.stock})`);
    }
    const valueMinor = lineTotalMinor(input.quantity, entry.price);
    const needsApproval =
      input.lossType === 'THEFT_SUSPECTED' || valueMinor >= toMinor(seq.company.lossApprovalThreshold);

    const loss = {
      productId: input.productId,
      productName: entry.data.name,
      unit: entry.data.unit,
      quantity: input.quantity,
      lossType: input.lossType,
      reason: input.reason,
      unitCost: entry.price,
      value: fromMinor(valueMinor),
      status: needsApproval ? 'PENDING' : 'VALIDATED',
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      createdAt: ts(),
    };
    if (!needsApproval) {
      loss.validatedBy = ctx.userId;
      loss.validatedAt = ts();
    }
    tx.set(ref, loss);
    if (!needsApproval) {
      applyMovements(tx, loaded, [{
        productId: input.productId, delta: -input.quantity, type: 'LOSS',
        referenceId: ref.id, reason: `Perte (${input.lossType}) : ${input.reason}`,
      }], ctx);
    }
    addAudit(tx, ctx, {
      action: needsApproval ? 'CREATE' : 'VALIDATE', module: 'losses', documentId: ref.id,
      description: `Perte déclarée : ${input.quantity} ${entry.data.unit} de « ${entry.data.name} » (${input.lossType}) — ${
        needsApproval ? 'en attente de validation' : 'validée automatiquement'}`,
      newData: { ...loss, createdAt: undefined, validatedAt: undefined },
    });
  });
  return fromSnap(await ref.get());
};

const validateLoss = async (id, ctx) => {
  const ref = col('losses').doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Perte introuvable');
    const l = snap.data();
    if (l.status !== 'PENDING') throw new ApiError(409, `Cette perte est déjà ${l.status}`);
    if (l.createdBy === ctx.userId && ctx.role !== ROLES.ADMIN) {
      throw new ApiError(403, 'Vous ne pouvez pas valider une perte que vous avez déclarée');
    }
    const loaded = await loadProducts(tx, [l.productId], { allowArchived: true });
    applyMovements(tx, loaded, [{
      productId: l.productId, delta: -l.quantity, type: 'LOSS',
      referenceId: id, reason: `Perte validée (${l.lossType}) : ${l.reason}`,
    }], ctx);
    tx.update(ref, { status: 'VALIDATED', validatedBy: ctx.userId, validatedAt: ts() });
    addAudit(tx, ctx, {
      action: 'VALIDATE', module: 'losses', documentId: id,
      description: `Validation de la perte de ${l.quantity} ${l.unit} de « ${l.productName} »`,
      oldData: { status: 'PENDING' }, newData: { status: 'VALIDATED' },
    });
  });
  return fromSnap(await ref.get());
};

const rejectLoss = async (id, reason, ctx) => {
  const ref = col('losses').doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Perte introuvable');
    if (snap.data().status !== 'PENDING') throw new ApiError(409, `Cette perte est déjà ${snap.data().status}`);
    tx.update(ref, { status: 'REJECTED', rejectReason: reason, rejectedBy: ctx.userId, rejectedAt: ts() });
    addAudit(tx, ctx, {
      action: 'CANCEL', module: 'losses', documentId: id,
      description: `Rejet de la perte (${snap.data().productName}) : ${reason}`,
      oldData: { status: 'PENDING' }, newData: { status: 'REJECTED' },
    });
  });
  return fromSnap(await ref.get());
};

/* ------------------------------------------------------------------ INVENTAIRE */
/** Comptage physique : compare stock théorique et stock physique (aucun stock modifié à ce stade) */
const createInventory = async (input, ctx) => {
  const ref = col('inventory_sessions').doc();
  await db.runTransaction(async (tx) => {
    const seq = await loadSequences(tx);
    const loaded = await loadProducts(tx, input.items.map((i) => i.productId), { allowArchived: true });
    let positive = 0;
    let negative = 0;
    let withDiff = 0;
    const items = input.items.map((i) => {
      const e = loaded.get(i.productId);
      const difference = addQty(i.physicalStock, -e.stock);
      const valueMinor = lineTotalMinor(difference, e.price);
      if (difference !== 0) {
        withDiff += 1;
        if (!i.reason) throw new ApiError(400, `Un motif est obligatoire pour « ${e.data.name} » (différence de ${difference})`);
        if (valueMinor >= 0) positive += valueMinor; else negative += valueMinor;
      }
      return {
        productId: i.productId,
        productName: e.data.name,
        unit: e.data.unit,
        theoreticalStock: e.stock,
        physicalStock: i.physicalStock,
        difference,
        unitCost: e.price,
        differenceValue: fromMinor(valueMinor),
        reason: i.reason || null,
      };
    });
    if (withDiff > MAX_WRITES_LINES) {
      throw new ApiError(400, `Trop de lignes avec différence (${withDiff}). Limite : ${MAX_WRITES_LINES} par session.`);
    }
    const number = seq.next('inventory', 'INV');
    seq.commit(tx);
    tx.set(ref, {
      number,
      status: 'PENDING',
      note: input.note || null,
      items,
      summary: {
        lines: items.length,
        linesWithDifference: withDiff,
        positiveValue: fromMinor(positive),
        negativeValue: fromMinor(negative),
        netValue: fromMinor(positive + negative),
      },
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      createdAt: ts(),
    });
    addAudit(tx, ctx, {
      action: 'CREATE', module: 'inventory', documentId: ref.id,
      description: `Session d'inventaire ${number} : ${withDiff} écart(s) sur ${items.length} produit(s)`,
      newData: { number, linesWithDifference: withDiff },
    });
  });
  return fromSnap(await ref.get());
};

/**
 * Validation : applique les différences enregistrées (physique − théorique au moment du comptage),
 * ce qui préserve les ventes intervenues depuis. Les écarts négatifs génèrent une perte COUNT_DIFFERENCE.
 */
const validateInventory = async (id, ctx) => {
  const ref = col('inventory_sessions').doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Session introuvable');
    const s = snap.data();
    if (s.status !== 'PENDING') throw new ApiError(409, `Cette session est déjà ${s.status}`);
    const diffLines = s.items.filter((i) => i.difference !== 0);
    const loaded = await loadProducts(tx, diffLines.map((i) => i.productId), { allowArchived: true });

    if (diffLines.length) {
      applyMovements(tx, loaded, diffLines.map((i) => ({
        productId: i.productId, delta: i.difference, type: 'INVENTORY',
        referenceId: id, referenceNumber: s.number, reason: i.reason || `Inventaire ${s.number}`,
      })), ctx);
    }
    diffLines.forEach((i) => {
      if (i.difference < 0) {
        tx.set(col('losses').doc(), {
          productId: i.productId, productName: i.productName, unit: i.unit,
          quantity: Math.abs(i.difference), lossType: 'COUNT_DIFFERENCE',
          reason: i.reason || `Écart d'inventaire ${s.number}`,
          unitCost: i.unitCost, value: Math.abs(i.differenceValue),
          status: 'VALIDATED', referenceId: id, referenceNumber: s.number,
          createdBy: ctx.userId, createdByName: ctx.userName, createdAt: ts(),
          validatedBy: ctx.userId, validatedAt: ts(),
        });
      }
      addAudit(tx, ctx, {
        action: 'STOCK_ADJUSTMENT', module: 'inventory', documentId: id,
        description: `Inventaire ${s.number} — « ${i.productName} » : ${i.theoreticalStock} → ${i.physicalStock} ${i.unit} (${i.reason})`,
        oldData: { stock: i.theoreticalStock }, newData: { stock: i.physicalStock, difference: i.difference },
      });
    });
    tx.update(ref, { status: 'VALIDATED', validatedBy: ctx.userId, validatedAt: ts() });
    addAudit(tx, ctx, {
      action: 'VALIDATE', module: 'inventory', documentId: id,
      description: `Validation de l'inventaire ${s.number} (${diffLines.length} ajustement(s))`,
      oldData: { status: 'PENDING' }, newData: { status: 'VALIDATED' },
    });
  });
  return fromSnap(await ref.get());
};

const rejectInventory = async (id, reason, ctx) => {
  const ref = col('inventory_sessions').doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Session introuvable');
    if (snap.data().status !== 'PENDING') throw new ApiError(409, `Cette session est déjà ${snap.data().status}`);
    tx.update(ref, { status: 'REJECTED', rejectReason: reason, rejectedBy: ctx.userId, rejectedAt: ts() });
    addAudit(tx, ctx, {
      action: 'CANCEL', module: 'inventory', documentId: id,
      description: `Rejet de l'inventaire ${snap.data().number} : ${reason}`,
      oldData: { status: 'PENDING' }, newData: { status: 'REJECTED' },
    });
  });
  return fromSnap(await ref.get());
};

module.exports = {
  adjustStock, createLoss, validateLoss, rejectLoss,
  createInventory, validateInventory, rejectInventory,
};
