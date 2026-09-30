const ApiError = require('../utils/ApiError');

/**
 * Middleware factory: restreint l'accès à une route à une liste de rôles.
 * Exemple: roleMiddleware('ADMIN', 'MANAGER')
 */
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Non authentifié.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Accès refusé: rôle insuffisant pour cette action."));
    }
    next();
  };
}

module.exports = roleMiddleware;
