const { db, admin, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const { logAction } = require('../utils/auditLogger');

async function listProducts(req, res, next) {
  try {
    const snap = await db.collection(COLLECTIONS.PRODUCTS).orderBy('name').get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const snap = await db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id).get();
    if (!snap.exists) throw new ApiError(404, 'Produit introuvable.');
    res.json({ success: true, data: { id: snap.id, ...snap.data() } });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const ref = db.collection(COLLECTIONS.PRODUCTS).doc();
    const data = {
      ...req.body,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(data);

    // Initialiser le stock à 0
    await db.collection(COLLECTIONS.STOCK).doc(ref.id).set({ quantity: 0 });

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'PRODUCT_CREATED',
      entity: 'product',
      entityId: ref.id,
      details: { name: data.name },
    });

    res.status(201).json({ success: true, data: { id: ref.id, ...data } });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const ref = db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, 'Produit introuvable.');

    await ref.set(
      { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'PRODUCT_UPDATED',
      entity: 'product',
      entityId: req.params.id,
      details: req.body,
    });

    const updated = await ref.get();
    res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const ref = db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, 'Produit introuvable.');

    // Suppression logique plutôt que physique pour préserver l'historique
    await ref.set({ active: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'PRODUCT_DELETED',
      entity: 'product',
      entityId: req.params.id,
    });

    res.json({ success: true, message: 'Produit désactivé.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
