'use strict';
const { col } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { buildQuery, paginate } = require('../utils/pagination');
const { ctxFromReq } = require('../services/audit.service');
const svc = require('../services/purchase.service');

exports.list = asyncHandler(async (req, res) => {
  const q = buildQuery(col('purchases'), req.query, { equals: ['status', 'supplierId', 'paymentStatus'] });
  return ok(res, await paginate(q, col('purchases'), req.query));
});

exports.get = asyncHandler(async (req, res) => {
  const snap = await col('purchases').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Achat introuvable');
  return ok(res, fromSnap(snap));
});

exports.create = asyncHandler(async (req, res) =>
  ok(res, await svc.createPurchase(req.body, ctxFromReq(req)), 'Achat validé : stock mis à jour', 201));

exports.cancel = asyncHandler(async (req, res) =>
  ok(res, await svc.cancelPurchase(req.params.id, req.body.reason, ctxFromReq(req)), 'Achat annulé'));

exports.pay = asyncHandler(async (req, res) =>
  ok(res, await svc.addPurchasePayment(req.params.id, req.body.payment, ctxFromReq(req)), 'Paiement enregistré'));
