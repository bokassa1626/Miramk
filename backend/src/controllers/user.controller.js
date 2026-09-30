'use strict';
const { col } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { PERMISSIONS } = require('../config/permissions');
const { ctxFromReq } = require('../services/audit.service');
const svc = require('../services/user.service');

exports.list = asyncHandler(async (req, res) => {
  const snap = await col('users').orderBy('lastName').limit(200).get();
  return ok(res, { items: snap.docs.map(fromSnap) });
});
exports.roles = asyncHandler(async (req, res) => ok(res, { roles: Object.entries(PERMISSIONS).map(([role, permissions]) => ({ role, permissions })) }));
exports.get = asyncHandler(async (req, res) => {
  const snap = await col('users').doc(req.params.id).get();
  if (!snap.exists) throw new ApiError(404, 'Utilisateur introuvable');
  return ok(res, fromSnap(snap));
});
exports.create = asyncHandler(async (req, res) => ok(res, await svc.createUser(req.body, ctxFromReq(req)), 'Utilisateur créé', 201));
exports.update = asyncHandler(async (req, res) => ok(res, await svc.updateUser(req.params.id, req.body, ctxFromReq(req)), 'Utilisateur modifié'));
exports.resetPassword = asyncHandler(async (req, res) => {
  await svc.resetPassword(req.params.id, req.body.password, ctxFromReq(req));
  return ok(res, {}, 'Mot de passe réinitialisé');
});
