'use strict';
const { col } = require('../config/firebase');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { buildQuery, paginate } = require('../utils/pagination');

/** Lecture seule : aucune route ne permet de modifier ou supprimer les journaux d'audit */
exports.list = asyncHandler(async (req, res) => {
  const q = buildQuery(col('audit_logs'), req.query, { equals: ['userId', 'module', 'action'] });
  return ok(res, await paginate(q, col('audit_logs'), req.query));
});
