'use strict';
const { db, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { loadSequences } = require('./settings.service');
const { loadProducts, applyMovements, writeAlert } = require('./stock.service');
const { addAudit } = require('./audit.service');
const { fromSnap } = require('../utils/serialize');

const createProduct = async (input, ctx) => {
  const { initialStock = 0, ...fields } = input;
  const ref = col('products').doc();
  await db.runTransaction(async (tx) => {
    const seq = await loadSequences(tx);
    const category = await tx.get(col('categories').doc(fields.categoryId));
    if (!category.exists) throw new ApiError(400, 'Catégorie introuvable');
    const code = fields.code || seq.next('product', 'PRD');
    const dup = await tx.get(col('products').where('code', '==', code).limit(1));
    if (!dup.empty) throw new ApiError(409, `Le code produit « ${code} » existe déjà`);
    if (fields.supplierId) {
      const s = await tx.get(col('suppliers').doc(fields.supplierId));
      if (!s.exists) throw new ApiError(400, 'Fournisseur introuvable');
    }
    const minimumStock = fields.minimumStock ?? seq.company.defaultStockThreshold;

    const data = {
      ...fields,
      code,
      minimumStock,
      supplierId: fields.supplierId || null,
      initialStock,
      currentStock: initialStock, // le mouvement ci-dessous garde la traçabilité
      status: 'ACTIVE',
      createdAt: ts(),
      updatedAt: ts(),
    };
    seq.commit(tx);
    tx.set(ref, data);
    if (initialStock > 0) {
      // Le stock initial est historisé comme un mouvement d'ajustement
      tx.set(col('stock_movements').doc(), {
        productId: ref.id, productName: fields.name, unit: fields.unit, type: 'ADJUSTMENT',
        quantity: initialStock, previousStock: 0, newStock: initialStock,
        referenceId: ref.id, referenceNumber: code, reason: 'Stock initial',
        userId: ctx.userId, userName: ctx.userName, createdAt: ts(),
      });
    }
    writeAlert(tx, {
      id: ref.id, alertRef: col('alerts').doc(`stock_${ref.id}`), alertExists: false,
      data: { ...data, name: fields.name }, stock: initialStock,
    });
    addAudit(tx, ctx, {
      action: 'CREATE', module: 'products', documentId: ref.id,
      description: `Création du produit « ${fields.name} » (${code})`,
      newData: { ...fields, code, initialStock },
    });
  });
  return fromSnap(await ref.get());
};

/**
 * Un produit archivé n'est jamais supprimé physiquement (il apparaît dans l'historique
 * des ventes/achats/mouvements).
 */
const archiveProduct = async (id, ctx) => {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(col('products').doc(id));
    if (!snap.exists) throw new ApiError(404, 'Produit introuvable');
    tx.update(snap.ref, { status: 'ARCHIVED', updatedAt: ts() });
    addAudit(tx, ctx, {
      action: 'DELETE', module: 'products', documentId: id,
      description: `Archivage du produit « ${snap.data().name} »`,
      oldData: { status: snap.data().status }, newData: { status: 'ARCHIVED' },
    });
  });
};

module.exports = { createProduct, archiveProduct };
