const ApiError = require('../utils/ApiError');

/**
 * Middleware factory qui valide req.body avec un schéma Zod.
 * En cas d'erreur, renvoie un 400 avec le détail des champs invalides.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ApiError(400, 'Données invalides.', details));
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
