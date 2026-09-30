'use strict';
const { col, Timestamp } = require('../config/firebase');
const { todayStr, addDays, dayBounds, localDate } = require('../utils/dates');
const { toMinor, fromMinor, toMilli, fromMilli } = require('../utils/money');
const { stockStatus, STOCK_STATUS } = require('../utils/stockStatus');
const { stockValueOf } = require('./report.service');

let cache = null;
const TTL_MS = 60 * 1000; // évite de relire des centaines de documents à chaque affichage

const monthStartBack = (today, n) => {
  let y = parseInt(today.slice(0, 4), 10);
  let m = parseInt(today.slice(5, 7), 10) - n;
  while (m < 1) { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, '0')}-01`;
};

const getDashboard = async ({ force = false } = {}) => {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const today = todayStr();
  const from30 = addDays(today, -29);
  const from6m = monthStartBack(today, 5);
  const S6 = Timestamp.fromDate(dayBounds(from6m).start);
  const S30 = Timestamp.fromDate(dayBounds(from30).start);

  const [salesSnap, purchSnap, expSnap, prodSnap, repSnap] = await Promise.all([
    col('sales').where('createdAt', '>=', S6).limit(20000).get(),
    col('purchases').where('createdAt', '>=', S30).limit(5000).get(),
    col('expenses').where('createdAt', '>=', S30).limit(5000).get(),
    col('products').limit(1000).get(),
    col('daily_reports').where('date', '>=', from30).orderBy('date', 'asc').limit(31).get(),
  ]);

  // Séries journalières sur 30 jours (centimes entiers)
  const days = [];
  const idx = {};
  for (let i = 0; i < 30; i += 1) {
    const d = addDays(from30, i);
    idx[d] = { date: d, sales: 0, purchases: 0, expenses: 0, margin: 0, count: 0 };
    days.push(idx[d]);
  }
  const monthly = {};
  const top = new Map();

  salesSnap.docs.forEach((doc) => {
    const s = doc.data();
    if (s.status !== 'VALIDATED') return;
    const d = localDate(s.createdAt.toDate());
    const month = d.slice(0, 7);
    monthly[month] = monthly[month] || { month, sales: 0, margin: 0, count: 0 };
    monthly[month].sales += toMinor(s.total);
    monthly[month].margin += toMinor(s.margin);
    monthly[month].count += 1;
    if (idx[d]) {
      idx[d].sales += toMinor(s.total);
      idx[d].margin += toMinor(s.margin);
      idx[d].count += 1;
      s.items.forEach((i) => {
        const e = top.get(i.productId) || { productId: i.productId, name: i.productName, unit: i.unit, qty: 0, total: 0 };
        e.qty += toMilli(i.quantity);
        e.total += toMinor(i.total);
        top.set(i.productId, e);
      });
    }
  });
  purchSnap.docs.forEach((doc) => {
    const p = doc.data();
    if (p.status !== 'VALIDATED') return;
    const d = localDate(p.createdAt.toDate());
    if (idx[d]) idx[d].purchases += toMinor(p.total);
  });
  expSnap.docs.forEach((doc) => {
    const e = doc.data();
    if (e.status !== 'VALIDATED') return;
    const d = localDate(e.createdAt.toDate());
    if (idx[d]) idx[d].expenses += toMinor(e.amount);
  });

  const daily = days.map((d) => ({
    date: d.date,
    sales: fromMinor(d.sales),
    purchases: fromMinor(d.purchases),
    expenses: fromMinor(d.expenses),
    profit: fromMinor(d.margin - d.expenses),
  }));
  const t = idx[today];

  const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.status === 'ACTIVE');
  let low = 0; let out = 0;
  const lowList = [];
  products.forEach((p) => {
    const st = stockStatus(p.currentStock, p.minimumStock);
    if (st === STOCK_STATUS.OUT) { out += 1; lowList.push({ id: p.id, name: p.name, unit: p.unit, currentStock: p.currentStock, minimumStock: p.minimumStock, status: st }); }
    else if (st === STOCK_STATUS.LOW) { low += 1; lowList.push({ id: p.id, name: p.name, unit: p.unit, currentStock: p.currentStock, minimumStock: p.minimumStock, status: st }); }
  });
  const stockValue = stockValueOf(products);

  const stockEvolution = repSnap.docs
    .map((d) => ({ date: d.data().date, value: d.data().stockValue }))
    .filter((r) => r.value != null);
  if (!stockEvolution.find((r) => r.date === today)) stockEvolution.push({ date: today, value: stockValue.total });

  const data = {
    today: {
      date: today,
      sales: fromMinor(t.sales),
      salesCount: t.count,
      purchases: fromMinor(t.purchases),
      expenses: fromMinor(t.expenses),
      estimatedProfit: fromMinor(t.margin - t.expenses),
    },
    stock: { value: stockValue.total, lowCount: low, outCount: out, productCount: products.length, alerts: lowList.slice(0, 10) },
    daily,
    monthly: Object.values(monthly)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ month: m.month, sales: fromMinor(m.sales), margin: fromMinor(m.margin), count: m.count })),
    topProducts: [...top.values()]
      .sort((a, b) => b.total - a.total).slice(0, 8)
      .map((e) => ({ productId: e.productId, name: e.name, unit: e.unit, quantity: fromMilli(e.qty), total: fromMinor(e.total) })),
    stockEvolution,
    generatedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), data };
  return data;
};

module.exports = { getDashboard };
