'use strict';
const { db, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { addQty, weightedAverageCost } = require('../utils/money');
const { stockStatus, STOCK_STATUS, formatQty } = require('../utils/stockStatus');

/**
 * Charge (dans une transaction) les produits concernés + leur alerte de stock.
 * ⚠ Firestore impose toutes les LECTURES avant la première ÉCRITURE.
 */
const loadProducts = async (tx, ids, { allowArchived = false } = {}) => {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const refs = unique.flatMap((id) => [col('products').doc(id), col('alerts').doc(`stock_${id}`)]);
  const snaps = await tx.getAll(...refs);
  const map = new Map();
  unique.forEach((id, i) => {
    const p = snaps[2 * i];
    const a = snaps[2 * i + 1];
    if (!p.exists) throw new ApiError(404, `Produit introuvable (${id})`);
    const data = p.data();
    if (!allowArchived && data.status !== 'ACTIVE') {
      throw new ApiError(409, `Le produit « ${data.name} » est archivé`);
    }
    map.set(id, {
      id,
      ref: p.ref,
      alertRef: a.ref,
      alertExists: a.exists,
      data,
      stock: data.currentStock || 0,
      price: data.purchasePrice || 0,
      touched: false,
    });
  });
  return map;
};

/** Écrit / résout l'alerte d'un produit selon son stock (writer = Transaction ou WriteBatch) */
const writeAlert = (writer, e) => {
  const status = stockStatus(e.stock, e.data.minimumStock);
  if (status === STOCK_STATUS.NORMAL) {
    if (e.alertExists) writer.update(e.alertRef, { status: 'RESOLVED', resolvedAt: ts(), updatedAt: ts() });
    return;
  }
  const isOut = status === STOCK_STATUS.OUT;
  writer.set(e.alertRef, {
    type: isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    severity: isOut ? 'CRITICAL' : 'WARNING',
    productId: e.id,
    productName: e.data.name,
    unit: e.data.unit,
    currentStock: e.stock,
    minimumStock: e.data.minimumStock || 0,
    message: isOut
      ? `RUPTURE DE STOCK — ${e.data.name} : 0 ${e.data.unit} disponible.`
      : `ALERTE STOCK FAIBLE — ${e.data.name} : ${formatQty(e.stock, e.data.unit)} disponibles.`,
    status: 'ACTIVE',
    triggeredAt: ts(),
    updatedAt: ts(),
  });
};

/**
 * Applique une liste de mouvements de stock dans la transaction.
 * movement = { productId, delta (signé), type, referenceId, referenceNumber, reason, unitCost?, allowNegative? }
 * - refuse tout stock négatif (règle métier #15) sauf allowNegative explicite ;
 * - crée un document stock_movements par mouvement (jamais modifié ensuite) ;
 * - met à jour currentStock (+ coût moyen pondéré pour les achats) et l'alerte.
 */
const applyMovements = (tx, loaded, movements, ctx) => {
  const results = [];
  movements.forEach((m) => {
    const entry = loaded.get(m.productId);
    if (!entry) throw new ApiError(500, `Produit non chargé (${m.productId})`);
    const previousStock = entry.stock;
    const newStock = addQty(previousStock, m.delta);
    if (newStock < 0 && !m.allowNegative) {
      throw new ApiError(
        409,
        `Stock insuffisant pour « ${entry.data.name} » : ${formatQty(previousStock, entry.data.unit)} disponible(s), ${formatQty(Math.abs(m.delta), entry.data.unit)} demandé(s)`,
      );
    }
    entry.stock = newStock;
    entry.touched = true;
    if (m.unitCost != null && m.delta > 0) {
      entry.price = weightedAverageCost(previousStock, entry.price, m.delta, m.unitCost);
    }
    const ref = col('stock_movements').doc();
    tx.set(ref, {
      productId: m.productId,
      productName: entry.data.name,
      unit: entry.data.unit,
      type: m.type,
      quantity: m.delta,
      previousStock,
      newStock,
      referenceId: m.referenceId || null,
      referenceNumber: m.referenceNumber || null,
      reason: m.reason || null,
      userId: ctx.userId,
      userName: ctx.userName,
      createdAt: ts(),
    });
    results.push({ id: ref.id, productId: m.productId, previousStock, newStock });
  });

  loaded.forEach((e) => {
    if (!e.touched) return;
    tx.update(e.ref, { currentStock: e.stock, purchasePrice: e.price, updatedAt: ts() });
    writeAlert(tx, e);
  });
  return results;
};

/** Resynchronise l'alerte d'un produit hors transaction (ex. changement de seuil minimum) */
const syncAlertForProduct = async (productId) => {
  const [p, a] = await Promise.all([
    col('products').doc(productId).get(),
    col('alerts').doc(`stock_${productId}`).get(),
  ]);
  if (!p.exists) return;
  const data = p.data();
  const batch = db.batch();
  writeAlert(batch, {
    id: productId,
    alertRef: a.ref,
    alertExists: a.exists,
    data,
    stock: data.currentStock || 0,
  });
  await batch.commit();
};

module.exports = { loadProducts, applyMovements, writeAlert, syncAlertForProduct };
