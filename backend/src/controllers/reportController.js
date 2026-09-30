const reportService = require('../services/reportService');

async function daily(req, res, next) {
  try {
    const data = await reportService.getDailyReport(req.query.date);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function sales(req, res, next) {
  try {
    const data = await reportService.getSalesReport(req.query.startDate, req.query.endDate);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function purchases(req, res, next) {
  try {
    const data = await reportService.getPurchasesReport(req.query.startDate, req.query.endDate);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function expenses(req, res, next) {
  try {
    const data = await reportService.getExpensesReport(req.query.startDate, req.query.endDate);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function profit(req, res, next) {
  try {
    const data = await reportService.getProfitReport(req.query.startDate, req.query.endDate);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function stock(req, res, next) {
  try {
    const data = await reportService.getStockReport();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { daily, sales, purchases, expenses, profit, stock };
