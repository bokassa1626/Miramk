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
  const q = buildQuery(col('inventory_sessions'), req.query, { equals: ['status'] });
  return ok(res, await paginate(q, col('inventory_sessions'), req.query));
});

exports.get = asyncHandler(async (req, res) => {
  const snap = await col('inventory_sessions').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Session introuvable');
  return ok(res, fromSnap(snap));
});

exports.create = asyncHandler(async (req, res) => ok(res, await svc.createInventory(req.body, ctxFromReq(req)), "Comptage enregistré : en attente de validation", 201));
exports.validate = asyncHandler(async (req, res) => ok(res, await svc.validateInventory(req.params.id, ctxFromReq(req)), 'Inventaire validé : stocks ajustés'));
exports.reject = asyncHandler(async (req, res) => ok(res, await svc.rejectInventory(req.params.id, req.body.reason, ctxFromReq(req)), 'Inventaire rejeté'));
