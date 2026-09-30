'use strict';
const { ApiError } = require('../utils/errors');

/** validate(schema, 'body' | 'query' | 'params') — remplace la source par la version validée/nettoyée */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, 'Données invalides', details));
  }
  if (source === 'query') {
    // Express 4 : req.query est modifiable ; on conserve les valeurs brutes + validées
    req.query = { ...req.query, ...result.data };
  } else {
    req[source] = result.data;
  }
  return next();
};

module.exports = { validate };
