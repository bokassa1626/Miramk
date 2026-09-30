const { db, admin, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const stockService = require('./stockService');
const { sum, round2 } = require('../utils/calculations');
const { logAction } = require('../utils/auditLogger');

/**
 * Création d'un achat fournisseur.
 * Stock actuel = Stock actuel + quantité achetée (à la réception).
 */
async function createPurchase({ supplierName, items, notes, user }) {
  const purchaseItems = [];

  for (const item of items) {
    const productSnap = await db.collection(COLLECTIONS.PRODUCTS).doc(item.productId).get();
    if (!productSnap.exists) {
      throw new ApiError(404, `Produit introuvable: ${item.productId}`);
    }
    const product = productSnap.data();
    const totalCost = round2(item.unitCost * item.quantity);
    purchaseItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost,
    });
  }

  const totalAmount = sum(purchaseItems, (i) => i.totalCost);

  const purchaseRef = db.collection(COLLECTIONS.PURCHASES).doc();
  const purchaseData = {
    supplierName,
    items: purchaseItems,
    totalAmount,
    status: 'received', // par défaut on considère la marchandise reçue immédiatement
    notes: notes || null,
    createdBy: user.uid,
    createdByName: user.fullName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await purchaseRef.set(purchaseData);

  // Stock actuel = Stock actuel + quantité achetée, + mise à jour du prix d'achat
  for (const item of purchaseItems) {
    await stockService.applyStockMovement({
      productId: item.productId,
      delta: item.quantity,
      type: 'purchase',
      referenceId: purchaseRef.id,
      userId: user.uid,
      note: `Achat ${purchaseRef.id} - ${supplierName}`,
    });

    // Mettre à jour le dernier prix d'achat connu du produit
    await db.collection(COLLECTIONS.PRODUCTS).doc(item.productId).set(
      { purchasePrice: item.unitCost, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  await logAction({
    userId: user.uid,
    userEmail: user.email,
    action: 'PURCHASE_CREATED',
    entity: 'purchase',
    entityId: purchaseRef.id,
    details: { supplierName, totalAmount },
  });

  return { id: purchaseRef.id, ...purchaseData };
}

async function getPurchases({ limit = 50 } = {}) {
  const snap = await db.collection(COLLECTIONS.PURCHASES).orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getPurchaseById(id) {
  const snap = await db.collection(COLLECTIONS.PURCHASES).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function updatePurchase(id, updates, user) {
  const ref = db.collection(COLLECTIONS.PURCHASES).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'Achat introuvable.');

  await ref.set(
    { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  await logAction({
    userId: user.uid,
    userEmail: user.email,
    action: 'PURCHASE_UPDATED',
    entity: 'purchase',
    entityId: id,
    details: updates,
  });

  const updated = await ref.get();
  return { id, ...updated.data() };
}

async function getPurchasesBetween(startDate, endDate) {
  const snap = await db
    .collection(COLLECTIONS.PURCHASES)
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  getPurchasesBetween,
};
