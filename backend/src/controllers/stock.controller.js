'use strict';
const { col } = require('../config/firebase');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { fromSnap } = require('../utils/serialize');
const { can } = require('../config/permissions');
const { lineTotalMinor, fromMinor } = require('../utils/money');
const { stockStatus } = require('../utils/stockStatus');
const { buildQuery, paginate } = require('../utils/pagination');
const { ctxFromReq } = require('../services/audit.service');
const { adjustStock } = require('../services/stockOps.service');

/** État du stock : quantités, statut, valeur par produit et par catégorie (valeur réservée aux rôles "costs:read") */
exports.overview = asyncHandler(async (req, res) => {
  const [pSnap, cSnap] = await Promise.all([
    col('products').orderBy('name').limit(1000).get(),
    col('categories').limit(500).get(),
  ]);
  const categories = new Map(cSnap.docs.map((d) => [d.id, d.data().name]));
  const showCost = can(req.user.role, 'costs:read');
  let totalMinor = 0;
  const byCat = new Map();
  let items = pSnap.docs.map(fromSnap).filter((p) => p.status === 'ACTIVE').map((p) => {
    const valueMinor = lineTotalMinor(p.currentStock, p.purchasePrice || 0);
    totalMinor += valueMinor;
    byCat.set(p.categoryId, (byCat.get(p.categoryId) || 0) + valueMinor);
    const row = {
      id: p.id, code: p.code, name: p.name, unit: p.unit, categoryId: p.categoryId,
      categoryName: categories.get(p.categoryId) || '—',
      currentStock: p.currentStock, minimumStock: p.minimumStock,
      status: stockStatus(p.currentStock, p.minimumStock),
    };
    if (showCost) { row.purchasePrice = p.purchasePrice; row.value = fromMinor(valueMinor); }
    return row;
  });
  if (req.query.status) items = items.filter((i) => i.status === req.query.status);
  if (req.query.categoryId) items = items.filter((i) => i.categoryId === req.query.categoryId);
  const data = { items };
  if (showCost) {
    data.totals = {
      value: fromMinor(totalMinor),
      byCategory: [...byCat.entries()].map(([id, v]) => ({ categoryId: id, categoryName: categories.get(id) || '—', value: fromMinor(v) })),
    };
  }
  return ok(res, data);
});

exports.movements = asyncHandler(async (req, res) => {
  const q = buildQuery(col('stock_movements'), req.query, { equals: ['productId', 'type'] });
  return ok(res, await paginate(q, col('stock_movements'), req.query));
});

exports.adjust = asyncHandler(async (req, res) => {
  const result = await adjustStock(req.body, ctxFromReq(req));
  return ok(res, result, 'Stock ajusté et historisé');
});
