'use strict';
const { fail } = require('../utils/response');
const { nodeEnv } = require('../config/env');

const notFound = (req, res) => fail(res, 404, `Route introuvable : ${req.method} ${req.originalUrl}`);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      error: err.details ?? err.message,
    });
  }
  if (err.type === 'entity.parse.failed') return fail(res, 400, 'JSON invalide');
  // Firestore : index manquant (FAILED_PRECONDITION)
  if (err.code === 9 || /requires an index/i.test(err.message || '')) {
    console.error('[Firestore] Index manquant :', err.message);
    return fail(res, 500, 'Un index Firestore est requis pour cette requête', nodeEnv === 'production' ? undefined : err.message);
  }
  console.error(err);
  return fail(res, 500, 'Une erreur est survenue', nodeEnv === 'production' ? undefined : err.message);
};

module.exports = { notFound, errorHandler };
