'use strict';
const { col } = require('../config/firebase');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { ser } = require('../utils/serialize');
const { todayStr, periodRange } = require('../utils/dates');
const { buildReport, generateDailyReport, reportToCsv } = require('../services/report.service');
const { getDashboard } = require('../services/dashboard.service');

exports.daily = asyncHandler(async (req, res) => {
  const date = req.query.date || todayStr();
  return ok(res, await buildReport(date, date));
});

/** ?period=day|week|month|year|custom&from=&to= */
exports.summary = asyncHandler(async (req, res) => {
  const { from, to } = periodRange(req.query.period || 'custom', req.query.from, req.query.to);
  return ok(res, await buildReport(from, to));
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const { from, to } = req.query.period || req.query.from
    ? periodRange(req.query.period || 'custom', req.query.from, req.query.to)
    : { from: req.query.date || todayStr(), to: req.query.date || todayStr() };
  const csv = reportToCsv(await buildReport(from, to));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-mira-mk-${from}_${to}.csv"`);
  res.send(csv);
});

/** Génère et archive le rapport du jour dans daily_reports/{date} */
exports.generate = asyncHandler(async (req, res) => {
  const date = req.body?.date || todayStr();
  const report = await generateDailyReport(date, req.user.name);
  return ok(res, report, `Rapport du ${date} généré et archivé`, 201);
});

exports.history = asyncHandler(async (req, res) => {
  const snap = await col('daily_reports').orderBy('date', 'desc').limit(60).get();
  const items = snap.docs.map((d) => {
    const r = d.data();
    return ser({ id: d.id, date: r.date, sales: r.sales?.total, salesCount: r.sales?.count, purchases: r.purchases?.total, expenses: r.expenses?.total, estimatedProfit: r.finance?.estimatedProfit, generatedBy: r.generatedBy, generatedAt: r.generatedAt });
  });
  return ok(res, { items });
});

exports.dashboard = asyncHandler(async (req, res) => ok(res, await getDashboard({ force: req.query.refresh === 'true' })));
