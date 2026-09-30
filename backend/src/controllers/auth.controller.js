'use strict';
const { auth } = require('../config/firebase');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/auth.service');
const { logAudit, ctxFromReq } = require('../services/audit.service');

exports.login = asyncHandler(async (req, res) => {
  const result = await svc.login(req.body.email, req.body.password);
  await logAudit(
    { userId: result.user.id, userName: `${result.user.firstName} ${result.user.lastName}`, role: result.user.role, ip: req.ip },
    { action: 'LOGIN', module: 'auth', description: `Connexion de ${result.user.email}` },
  );
  return ok(res, result, 'Connexion réussie');
});

exports.refresh = asyncHandler(async (req, res) => ok(res, await svc.refresh(req.body.refreshToken)));

exports.me = asyncHandler(async (req, res) => ok(res, await svc.me(req.user.id)));

exports.logout = asyncHandler(async (req, res) => {
  await logAudit(ctxFromReq(req), { action: 'LOGOUT', module: 'auth', description: `Déconnexion de ${req.user.email}` });
  await auth.revokeRefreshTokens(req.user.id);
  return ok(res, {}, 'Déconnexion réussie');
});
