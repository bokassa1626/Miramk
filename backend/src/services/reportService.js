const admin = require('firebase-admin');
const saleService = require('./saleService');
const purchaseService = require('./purchaseService');
const { db, COLLECTIONS } = require('../config/firebase');
const stockService = require('./stockService');
const { sum, calculateNetProfit, round2 } = require('../utils/calculations');

function toTimestamp(dateStr, endOfDay = false) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return admin.firestore.Timestamp.fromDate(d);
}

function defaultRange(startDate, endDate) {
  const start = toTimestamp(startDate);
  const end = toTimestamp(endDate, true);
  return { start, end };
}

async function getExpensesBetween(start, end) {
  const snap = await db
    .collection(COLLECTIONS.EXPENSES)
    .where('date', '>=', start)
    .where('date', '<=', end)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Rapport journalier: résumé ventes/achats/dépenses/bénéfice du jour
async function getDailyReport(dateStr) {
  const { start, end } = defaultRange(dateStr, dateStr);
  const sales = await saleService.getSalesBetween(start, end);
  const purchases = await purchaseService.getPurchasesBetween(start, end);
  const expenses = await getExpensesBetween(start, end);

  const revenue = sum(sales, (s) => s.totalAmount);
  const costOfGoodsSold = sum(sales, (s) => s.totalCost);
  const purchasesTotal = sum(purchases, (p) => p.totalAmount);
  const expensesTotal = sum(expenses, (e) => e.amount);

  const { grossMargin, netProfit } = calculateNetProfit({
    revenue,
    costOfGoodsSold,
    expenses: expensesTotal,
  });

  return {
    date: dateStr || new Date().toISOString().slice(0, 10),
    salesCount: sales.length,
    revenue,
    purchasesTotal,
    expensesTotal,
    grossMargin,
    netProfit,
  };
}

async function getSalesReport(startDate, endDate) {
  const { start, end } = defaultRange(startDate, endDate);
  const sales = await saleService.getSalesBetween(start, end);
  return {
    startDate,
    endDate,
    count: sales.length,
    totalAmount: sum(sales, (s) => s.totalAmount),
    totalMargin: sum(sales, (s) => s.totalMargin),
    sales,
  };
}

async function getPurchasesReport(startDate, endDate) {
  const { start, end } = defaultRange(startDate, endDate);
  const purchases = await purchaseService.getPurchasesBetween(start, end);
  return {
    startDate,
    endDate,
    count: purchases.length,
    totalAmount: sum(purchases, (p) => p.totalAmount),
    purchases,
  };
}

async function getExpensesReport(startDate, endDate) {
  const { start, end } = defaultRange(startDate, endDate);
  const expenses = await getExpensesBetween(start, end);
  return {
    startDate,
    endDate,
    count: expenses.length,
    totalAmount: sum(expenses, (e) => e.amount),
    expenses,
  };
}

// Bénéfice net = marge brute - dépenses, sur une période donnée
async function getProfitReport(startDate, endDate) {
  const { start, end } = defaultRange(startDate, endDate);
  const sales = await saleService.getSalesBetween(start, end);
  const expenses = await getExpensesBetween(start, end);

  const revenue = sum(sales, (s) => s.totalAmount);
  const costOfGoodsSold = sum(sales, (s) => s.totalCost);
  const expensesTotal = sum(expenses, (e) => e.amount);

  const { grossMargin, netProfit } = calculateNetProfit({
    revenue,
    costOfGoodsSold,
    expenses: expensesTotal,
  });

  return { startDate, endDate, revenue, costOfGoodsSold, expensesTotal, grossMargin, netProfit };
}

async function getStockReport() {
  const stock = await stockService.getAllStock();
  const totalValue = round2(
    stock.reduce((acc, s) => acc + s.currentQuantity, 0)
  );
  return { generatedAt: new Date().toISOString(), items: stock, totalUnitsInStock: totalValue };
}

module.exports = {
  getDailyReport,
  getSalesReport,
  getPurchasesReport,
  getExpensesReport,
  getProfitReport,
  getStockReport,
};
