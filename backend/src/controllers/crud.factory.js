'use strict';
/** Contrôleur CRUD générique (catégories, fournisseurs) : suppression = archivage + audit */
const { db, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { addAudit, ctxFromReq } = require('../services/audit.service');

module.exports = ({ collectionName, moduleName, label, initial = () => ({}), transformOut = (x) => x, beforeArchive }) => ({
  list: asyncHandler(async (req, res) => {
    const snap = await col(collectionName).orderBy('nameLower').limit(1000).get();
    let items = snap.docs.map(fromSnap).map(transformOut);
    if (req.query.status !== 'all') items = items.filter((i) => i.status === 'ACTIVE');
    return ok(res, { items });
  }),

  get: asyncHandler(async (req, res) => {
    const snap = await col(collectionName).doc(req.params.id).get();
    if (!snap.exists) throw new ApiError(404, `${label} introuvable`);
    return ok(res, transformOut(fromSnap(snap)));
  }),

  create: asyncHandler(async (req, res) => {
    const ctx = ctxFromReq(req);
    const nameLower = req.body.name.toLowerCase();
    const ref = col(collectionName).doc();
    await db.runTransaction(async (tx) => {
      const dup = await tx.get(col(collectionName).where('nameLower', '==', nameLower).where('status', '==', 'ACTIVE').limit(1));
      if (!dup.empty) throw new ApiError(409, `${label} « ${req.body.name} » existe déjà`);
      tx.set(ref, { ...req.body, ...initial(), nameLower, status: 'ACTIVE', createdAt: ts(), updatedAt: ts() });
      addAudit(tx, ctx, { action: 'CREATE', module: moduleName, documentId: ref.id, description: `Création : ${req.body.name}`, newData: req.body });
    });
    return ok(res, transformOut(fromSnap(await ref.get())), `${label} créé(e) avec succès`, 201);
  }),

  update: asyncHandler(async (req, res) => {
    const ctx = ctxFromReq(req);
    const ref = col(collectionName).doc(req.params.id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new ApiError(404, `${label} introuvable`);
      const old = snap.data();
      const patch = { ...req.body, updatedAt: ts() };
      if (req.body.name) patch.nameLower = req.body.name.toLowerCase();
      tx.update(ref, patch);
      const before = {};
      Object.keys(req.body).forEach((k) => { before[k] = old[k]; });
      addAudit(tx, ctx, { action: 'UPDATE', module: moduleName, documentId: ref.id, description: `Modification : ${old.name}`, oldData: before, newData: req.body });
    });
    return ok(res, transformOut(fromSnap(await ref.get())), `${label} modifié(e) avec succès`);
  }),

  archive: asyncHandler(async (req, res) => {
    const ctx = ctxFromReq(req);
    const ref = col(collectionName).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, `${label} introuvable`);
    if (beforeArchive) await beforeArchive(req.params.id, snap.data());
    const batch = db.batch();
    batch.update(ref, { status: 'INACTIVE', updatedAt: ts() });
    addAudit(batch, ctx, { action: 'DELETE', module: moduleName, documentId: ref.id, description: `Archivage : ${snap.data().name}`, oldData: { status: snap.data().status }, newData: { status: 'INACTIVE' } });
    await batch.commit();
    return ok(res, { id: ref.id }, `${label} archivé(e) (l'historique est conservé)`);
  }),
});
