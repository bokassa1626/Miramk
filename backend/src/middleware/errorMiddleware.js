const ApiError = require('../utils/ApiError');

// 404 pour les routes inexistantes
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route introuvable: ${req.method} ${req.originalUrl}`));
}

// Gestion centralisée des erreurs
function errorHandler(err, req, res, next) {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || 'Erreur interne du serveur.';

  if (!(err instanceof ApiError) && process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV === 'development' && !(err instanceof ApiError)
      ? { stack: err.stack }
      : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
