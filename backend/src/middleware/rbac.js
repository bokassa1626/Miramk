'use strict';
const { can } = require('../config/permissions');
const { ApiError } = require('../utils/errors');

/** authorize('sales:create') — autorise si l'utilisateur possède AU MOINS une des permissions */
const authorize = (...permissions) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentification requise'));
  if (permissions.some((p) => can(req.user.role, p))) return next();
  return next(new ApiError(403, "Vous n'avez pas la permission d'effectuer cette action"));
};

module.exports = { authorize };
