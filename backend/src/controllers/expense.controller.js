'use strict';
const { db, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { buildQuery, paginate } = require('../utils/pagination');
const { convertToBase } = require('../utils/money');
const { getSettings } = require('../services/settings.service');
const { addAudit, ctxFromReq } = require('../services/audit.service');

exports.list = asyncHandler(async (req, res) => {
  const q = buildQuery(col('expenses'), req.query, { equals: ['category', 'status'] });
  return ok(res, await paginate(q, col('expenses'), req.query));
});

exports.get = asyncHandler(async (req, res) => {
  const snap = await col('expenses').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Dépense introuvable');
  return ok(res, fromSnap(snap));
});

exports.create = asyncHandler(async (req, res) => {
  const ctx = ctxFromReq(req);
  const settings = await getSettings();
  const { currency, amount, ...rest } = req.body;
  const rate = currency === 'USD' ? settings.exchangeRateUSD : 1;
  const ref = col('expenses').doc();
  const doc = {
    ...rest,
    amount: convertToBase(amount, currency, rate), // toujours en CDF pour les rapports
    originalAmount: amount, currency, exchangeRate: rate,
    status: 'VALIDATED',
    createdBy: ctx.userId, createdByName: ctx.userName, createdAt: ts(),
  };
  const batch = db.batch();
  batch.set(ref, doc);
  addAudit(batch, ctx, {
    action: 'EXPENSE', module: 'expenses', documentId: ref.id,
    description: `Dépense ${rest.category} de ${doc.amount} CDF : ${rest.description}`,
    newData: { ...doc, createdAt: undefined },
  });
  await batch.commit();
  return ok(res, fromSnap(await ref.get()), 'Dépense enregistrée', 201);
});

/** Une dépense n'est jamais supprimée : elle est annulée et reste visible */
exports.cancel = asyncHandler(async (req, res) => {
  const ctx = ctxFromReq(req);
  const ref = col('expenses').doc(req.params.id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'Dépense introuvable');
    if (snap.data().status !== 'VALIDATED') throw new ApiError(409, 'Cette dépense est déjà annulée');
    tx.update(ref, { status: 'CANCELLED', cancelReason: req.body.reason, cancelledBy: ctx.userId, cancelledAt: ts() });
    addAudit(tx, ctx, {
      action: 'CANCEL', module: 'expenses', documentId: ref.id,
      description: `Annulation de la dépense « ${snap.data().description} » : ${req.body.reason}`,
      oldData: { status: 'VALIDATED', amount: snap.data().amount }, newData: { status: 'CANCELLED' },
    });
  });
  return ok(res, fromSnap(await ref.get()), 'Dépense annulée');
});
