'use strict';
const { col } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { buildQuery, paginate } = require('../utils/pagination');
const { ctxFromReq } = require('../services/audit.service');
const svc = require('../services/stockOps.service');

exports.list = asyncHandler(async (req, res) => {
  const q = buildQuery(col('losses'), req.query, { equals: ['status', 'lossType', 'productId'] });
  return ok(res, await paginate(q, col('losses'), req.query));
});

exports.get = asyncHandler(async (req, res) => {
  const snap = await col('losses').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Perte introuvable');
  return ok(res, fromSnap(snap));
});

exports.create = asyncHandler(async (req, res) => {
  const loss = await svc.createLoss(req.body, ctxFromReq(req));
  const msg = loss.status === 'PENDING' ? 'Perte enregistrée : en attente de validation du responsable' : 'Perte enregistrée et stock mis à jour';
  return ok(res, loss, msg, 201);
});

exports.validate = asyncHandler(async (req, res) => ok(res, await svc.validateLoss(req.params.id, ctxFromReq(req)), 'Perte validée : stock mis à jour'));
exports.reject = asyncHandler(async (req, res) => ok(res, await svc.rejectLoss(req.params.id, req.body.reason, ctxFromReq(req)), 'Perte rejetée'));
