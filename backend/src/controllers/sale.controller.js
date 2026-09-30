'use strict';
const { col } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { buildQuery, paginate } = require('../utils/pagination');
const { ROLES } = require('../config/defaults');
const { getSettings } = require('../services/settings.service');
const { ctxFromReq } = require('../services/audit.service');
const svc = require('../services/sale.service');

/** Un vendeur ne voit que ses propres ventes */
const scope = (req) => (req.user.role === ROLES.CASHIER ? { createdBy: req.user.id } : {});

exports.list = asyncHandler(async (req, res) => {
  const q = buildQuery(col('sales'), req.query, { equals: ['status', 'paymentStatus', 'createdBy'], extra: scope(req) });
  return ok(res, await paginate(q, col('sales'), req.query));
});

const getOwned = async (req) => {
  const snap = await col('sales').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Vente introuvable');
  const sale = fromSnap(snap);
  if (req.user.role === ROLES.CASHIER && sale.createdBy !== req.user.id) {
    throw new ApiError(403, "Vous n'avez pas accès à cette vente");
  }
  return sale;
};

exports.get = asyncHandler(async (req, res) => ok(res, await getOwned(req)));

/** Facture générée à partir de la vente validée + informations de l'entreprise */
exports.invoice = asyncHandler(async (req, res) => {
  const sale = await getOwned(req);
  return ok(res, { invoice: sale, company: await getSettings() });
});

exports.create = asyncHandler(async (req, res) => {
  const { sale, change } = await svc.createSale(req.body, ctxFromReq(req));
  return ok(res, { sale, change, company: await getSettings() }, 'Vente validée', 201);
});

exports.cancel = asyncHandler(async (req, res) =>
  ok(res, await svc.cancelSale(req.params.id, req.body.reason, ctxFromReq(req)), 'Vente annulée : stock rétabli'));

exports.pay = asyncHandler(async (req, res) => {
  await getOwned(req);
  const { sale, change } = await svc.addSalePayment(req.params.id, req.body.payment, ctxFromReq(req));
  return ok(res, { sale, change }, 'Encaissement enregistré');
});
