const { db, admin, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');

/**
 * Toute la logique de stock passe par ce service afin de garantir
 * la cohérence: stock/{productId} + un mouvement dans stock_movements.
 *
 * Types de mouvement: 'purchase' | 'sale' | 'loss' | 'adjustment'
 */

async function getStockDoc(productId, tx = null) {
  const ref = db.collection(COLLECTIONS.STOCK).doc(productId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  return { ref, snap };
}

async function getAllStock() {
  const snap = await db.collection(COLLECTIONS.PRODUCTS).where('active', '==', true).get();
  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const stockSnap = await db.collection(COLLECTIONS.STOCK).get();
  const stockMap = {};
  stockSnap.forEach((d) => (stockMap[d.id] = d.data()));

  return products.map((p) => ({
    productId: p.id,
    productName: p.name,
    unit: p.unit,
    minStockThreshold: p.minStockThreshold,
    currentQuantity: stockMap[p.id]?.quantity ?? 0,
    lowStock: (stockMap[p.id]?.quantity ?? 0) <= (p.minStockThreshold ?? 0),
  }));
}

async function getStockByProduct(productId) {
  const { snap } = await getStockDoc(productId);
  if (!snap.exists) return { productId, quantity: 0 };
  return { productId, ...snap.data() };
}

async function getMovements({ productId, limit = 50 } = {}) {
  let query = db.collection(COLLECTIONS.STOCK_MOVEMENTS).orderBy('createdAt', 'desc').limit(limit);
  if (productId) {
    query = db
      .collection(COLLECTIONS.STOCK_MOVEMENTS)
      .where('productId', '==', productId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Applique une variation de stock (delta positif ou négatif) de façon atomique
 * et enregistre le mouvement correspondant. Utilisé par achats/ventes/pertes.
 */
async function applyStockMovement({ productId, delta, type, referenceId, userId, note }) {
  const stockRef = db.collection(COLLECTIONS.STOCK).doc(productId);
  const movementRef = db.collection(COLLECTIONS.STOCK_MOVEMENTS).doc();

  const newQuantity = await db.runTransaction(async (tx) => {
    const snap = await tx.get(stockRef);
    const current = snap.exists ? snap.data().quantity : 0;
    const updated = current + delta;

    if (updated < 0) {
      throw new ApiError(400, 'Stock insuffisant pour cette opération.');
    }

    tx.set(
      stockRef,
      { quantity: updated, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    tx.set(movementRef, {
      productId,
      type, // purchase | sale | loss | adjustment
      delta,
      resultingQuantity: updated,
      referenceId: referenceId || null,
      userId,
      note: note || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return updated;
  });

  return newQuantity;
}

/**
 * Ajustement manuel: on fixe le stock à une valeur physique validée.
 * Stock actuel = stock physique validé.
 */
async function adjustStock({ productId, newQuantity, reason, userId }) {
  const stockRef = db.collection(COLLECTIONS.STOCK).doc(productId);
  const movementRef = db.collection(COLLECTIONS.STOCK_MOVEMENTS).doc();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(stockRef);
    const current = snap.exists ? snap.data().quantity : 0;
    const delta = newQuantity - current;

    tx.set(
      stockRef,
      { quantity: newQuantity, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    tx.set(movementRef, {
      productId,
      type: 'adjustment',
      delta,
      resultingQuantity: newQuantity,
      referenceId: null,
      userId,
      note: reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { productId, previousQuantity: current, newQuantity, delta };
  });
}

/**
 * Inventaire complet: compare le stock théorique au stock physique
 * pour une liste de produits, applique les ajustements et retourne les écarts.
 */
async function performInventory({ items, notes, userId }) {
  const results = [];
  const inventoryRef = db.collection(COLLECTIONS.INVENTORIES).doc();

  for (const item of items) {
    const stockData = await getStockByProduct(item.productId);
    const theoretical = stockData.quantity || 0;
    const diff = item.physicalQuantity - theoretical;

    await adjustStock({
      productId: item.productId,
      newQuantity: item.physicalQuantity,
      reason: `Inventaire ${inventoryRef.id}`,
      userId,
    });

    results.push({
      productId: item.productId,
      theoreticalQuantity: theoretical,
      physicalQuantity: item.physicalQuantity,
      difference: diff,
    });
  }

  await inventoryRef.set({
    userId,
    notes: notes || null,
    results,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { inventoryId: inventoryRef.id, results };
}

async function checkAvailability(productId, quantity, tx = null) {
  const { snap } = await getStockDoc(productId, tx);
  const current = snap.exists ? snap.data().quantity : 0;
  if (current < quantity) {
    throw new ApiError(400, `Stock insuffisant pour le produit ${productId}. Disponible: ${current}.`);
  }
  return current;
}

module.exports = {
  getAllStock,
  getStockByProduct,
  getMovements,
  applyStockMovement,
  adjustStock,
  performInventory,
  checkAvailability,
};
