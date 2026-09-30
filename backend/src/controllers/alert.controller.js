'use strict';
const { col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');

exports.list = asyncHandler(async (req, res) => {
  const status = req.query.status || 'ACTIVE';
  const snap = await col('alerts').where('status', '==', status).limit(300).get();
  const rank = { CRITICAL: 0, WARNING: 1 };
  const items = snap.docs.map(fromSnap).sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || a.productName.localeCompare(b.productName));
  return ok(res, {
    items,
    counts: {
      total: items.length,
      outOfStock: items.filter((a) => a.type === 'OUT_OF_STOCK').length,
      lowStock: items.filter((a) => a.type === 'LOW_STOCK').length,
    },
  });
});

exports.acknowledge = asyncHandler(async (req, res) => {
  const ref = col('alerts').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'Alerte introuvable');
  await ref.update({ acknowledgedBy: req.user.id, acknowledgedByName: req.user.name, acknowledgedAt: ts() });
  return ok(res, fromSnap(await ref.get()), 'Alerte prise en compte');
});
