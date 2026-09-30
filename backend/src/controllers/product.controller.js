'use strict';
const { db, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { can } = require('../config/permissions');
const { stockStatus } = require('../utils/stockStatus');
const { addAudit, ctxFromReq } = require('../services/audit.service');
const { createProduct, archiveProduct } = require('../services/product.service');
const { syncAlertForProduct } = require('../services/stock.service');

/** Vue limitée pour les rôles sans accès aux coûts (ex. vendeur) */
const present = (p, role) => {
  const out = { ...p, stockStatus: stockStatus(p.currentStock, p.minimumStock) };
  if (!can(role, 'costs:read')) {
    delete out.purchasePrice; delete out.supplierId; delete out.initialStock;
  }
  return out;
};

exports.list = asyncHandler(async (req, res) => {
  const snap = await col('products').orderBy('name').limit(1000).get();
  let items = snap.docs.map(fromSnap);
  if (req.query.status !== 'all') items = items.filter((p) => p.status === 'ACTIVE');
  if (req.query.categoryId) items = items.filter((p) => p.categoryId === req.query.categoryId);
  return ok(res, { items: items.map((p) => present(p, req.user.role)) });
});

exports.get = asyncHandler(async (req, res) => {
  const snap = await col('products').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Produit introuvable');
  return ok(res, present(fromSnap(snap), req.user.role));
});

exports.create = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body, ctxFromReq(req));
  return ok(res, present(product, req.user.role), 'Produit créé avec succès', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const ctx = ctxFromReq(req);
  const ref = col('products').doc(req.params.id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Produit introuvable');
    const old = snap.data();
    if (req.body.categoryId && req.body.categoryId !== old.categoryId) {
      const c = await tx.get(col('categories').doc(req.body.categoryId));
      if (!c.exists) throw new ApiError(400, 'Catégorie introuvable');
    }
    if (req.body.code && req.body.code !== old.code) {
      const dup = await tx.get(col('products').where('code', '==', req.body.code).limit(1));
      if (!dup.empty) throw new ApiError(409, `Le code « ${req.body.code} » existe déjà`);
    }
    // currentStock n'est jamais modifiable ici : uniquement via achats/ventes/pertes/inventaires/ajustements
    tx.update(ref, { ...req.body, updatedAt: ts() });
    const before = {};
    Object.keys(req.body).forEach((k) => { before[k] = old[k]; });
    addAudit(tx, ctx, {
      action: 'UPDATE', module: 'products', documentId: ref.id,
      description: `Modification du produit « ${old.name} »`, oldData: before, newData: req.body,
    });
  });
  if (req.body.minimumStock !== undefined || req.body.name !== undefined) await syncAlertForProduct(ref.id);
  return ok(res, present(fromSnap(await ref.get()), req.user.role), 'Produit modifié avec succès');
});

exports.remove = asyncHandler(async (req, res) => {
  await archiveProduct(req.params.id, ctxFromReq(req));
  return ok(res, { id: req.params.id }, "Produit archivé (l'historique est conservé)");
});

exports.present = present;
