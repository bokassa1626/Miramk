'use strict';
const { col, ts, Timestamp } = require('../config/firebase');
const { rangeBounds, todayStr } = require('../utils/dates');
const { toMinor, fromMinor, toMilli, fromMilli, lineTotalMinor } = require('../utils/money');
const { stockStatus, STOCK_STATUS } = require('../utils/stockStatus');
const { ser } = require('../utils/serialize');

const LIMIT = 5000;

const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const millis = (t) => (t && t.toMillis ? t.toMillis() : 0);

const stockValueOf = (products) => {
  let totalMinor = 0;
  const byCategory = new Map();
  const items = products.map((p) => {
    const v = lineTotalMinor(p.currentStock || 0, p.purchasePrice || 0);
    totalMinor += v;
    byCategory.set(p.categoryId, (byCategory.get(p.categoryId) || 0) + v);
    return { productId: p.id, name: p.name, value: fromMinor(v) };
  });
  return {
    total: fromMinor(totalMinor),
    items,
    byCategory: [...byCategory.entries()].map(([categoryId, v]) => ({ categoryId, value: fromMinor(v) })),
  };
};

/**
 * Rapport financier + stock + contrôle pour une période [from, to] (dates locales AAAA-MM-JJ).
 * Toutes les statistiques viennent des données Firestore réelles (règle métier #14) ;
 * les sommes sont faites en centimes entiers.
 */
const buildReport = async (from, to = from) => {
  const { start, end } = rangeBounds(from, to);
  const S = Timestamp.fromDate(start);
  const E = Timestamp.fromDate(end);
  const range = (name, field = 'createdAt') =>
    col(name).where(field, '>=', S).where(field, '<', E).limit(LIMIT).get();

  const [salesSnap, purchSnap, expSnap, lossSnap, paySnap, invSnap, moveSnap, prodSnap] = await Promise.all([
    range('sales'), range('purchases'), range('expenses'), range('losses'), range('payments'),
    range('inventory_sessions', 'validatedAt'),
    col('stock_movements').where('createdAt', '>=', S).orderBy('createdAt', 'asc').limit(LIMIT * 2).get(),
    col('products').limit(1000).get(),
  ]);

  const allSales = docs(salesSnap);
  const sales = allSales.filter((s) => s.status === 'VALIDATED');
  const purchases = docs(purchSnap).filter((p) => p.status === 'VALIDATED');
  const expenses = docs(expSnap).filter((e) => e.status === 'VALIDATED');
  const losses = docs(lossSnap);
  const payments = docs(paySnap);
  const inventories = docs(invSnap).filter((s) => s.status === 'VALIDATED');
  const products = docs(prodSnap);
  const movements = docs(moveSnap);

  /* ---- Ventes ---- */
  const sumMinor = (arr, f) => arr.reduce((a, x) => a + toMinor(f(x)), 0);
  const turnoverMinor = sumMinor(sales, (s) => s.total);
  const cogsMinor = sumMinor(sales, (s) => s.costOfGoods);
  const soldMap = new Map();
  sales.forEach((s) => s.items.forEach((i) => {
    const e = soldMap.get(i.productId) || { productId: i.productId, productName: i.productName, unit: i.unit, qty: 0, total: 0, cost: 0 };
    e.qty += toMilli(i.quantity);
    e.total += toMinor(i.total);
    e.cost += toMinor(i.cost || 0);
    soldMap.set(i.productId, e);
  }));
  const productsSold = [...soldMap.values()]
    .map((e) => ({ productId: e.productId, productName: e.productName, unit: e.unit, quantity: fromMilli(e.qty), total: fromMinor(e.total), margin: fromMinor(e.total - e.cost) }))
    .sort((a, b) => b.total - a.total);

  /* ---- Achats ---- */
  const purchasesTotalMinor = sumMinor(purchases, (p) => p.total);

  /* ---- Dépenses ---- */
  const expensesTotalMinor = sumMinor(expenses, (e) => e.amount);
  const byCat = {};
  expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + toMinor(e.amount); });

  /* ---- Encaissements / décaissements ---- */
  const sumKind = (kind) => payments.filter((p) => p.kind === kind).reduce((a, p) => a + toMinor(p.amountBase), 0);
  const receiptsMinor = sumKind('SALE_PAYMENT') - sumKind('SALE_REFUND');
  const supplierPaymentsMinor = sumKind('PURCHASE_PAYMENT') - sumKind('PURCHASE_REFUND');
  const receiptsByMethod = {};
  payments.filter((p) => p.kind === 'SALE_PAYMENT' || p.kind === 'SALE_REFUND').forEach((p) => {
    const sign = p.kind === 'SALE_PAYMENT' ? 1 : -1;
    receiptsByMethod[p.method] = (receiptsByMethod[p.method] || 0) + sign * toMinor(p.amountBase);
  });

  /* ---- Pertes ---- */
  const validLosses = losses.filter((l) => l.status === 'VALIDATED');
  const lossesMinor = sumMinor(validLosses, (l) => l.value);

  /* ---- Stocks (ouverture / entrées / sorties / pertes / clôture par produit) ---- */
  const byProduct = new Map();
  movements.forEach((m) => {
    if (!byProduct.has(m.productId)) byProduct.set(m.productId, []);
    byProduct.get(m.productId).push(m);
  });
  const endMs = end.getTime();
  const stockRows = [];
  products.forEach((p) => {
    const ms = byProduct.get(p.id) || [];
    const within = ms.filter((m) => millis(m.createdAt) < endMs);
    const after = ms.filter((m) => millis(m.createdAt) >= endMs);
    let opening;
    let closing;
    if (within.length) { opening = within[0].previousStock; closing = within[within.length - 1].newStock; }
    else if (after.length) { opening = after[0].previousStock; closing = opening; }
    else { opening = p.currentStock || 0; closing = opening; }
    let entries = 0; let exits = 0; let lost = 0; let adjustments = 0;
    within.forEach((m) => {
      const q = toMilli(m.quantity);
      if (m.type === 'PURCHASE' || (m.type === 'RETURN')) entries += q;
      else if (m.type === 'SALE') exits += -q;
      else if (m.type === 'LOSS') lost += -q;
      else adjustments += q; // ADJUSTMENT, INVENTORY (signés)
    });
    if (within.length || opening !== 0) {
      stockRows.push({
        productId: p.id, productName: p.name, unit: p.unit,
        opening, entries: fromMilli(entries), exits: fromMilli(exits), losses: fromMilli(lost),
        adjustments: fromMilli(adjustments), closing,
      });
    }
  });

  /* ---- Contrôle ---- */
  const differences = [];
  inventories.forEach((s) => s.items.filter((i) => i.difference !== 0).forEach((i) => differences.push({
    inventory: s.number, productName: i.productName, unit: i.unit,
    theoretical: i.theoreticalStock, physical: i.physicalStock, difference: i.difference,
    value: i.differenceValue, reason: i.reason,
  })));
  const corrections = movements
    .filter((m) => millis(m.createdAt) < endMs && (m.type === 'ADJUSTMENT' || m.type === 'INVENTORY'))
    .map((m) => ({ productName: m.productName, unit: m.unit, type: m.type, quantity: m.quantity, reason: m.reason, userName: m.userName, at: ser(m.createdAt) }));
  const anomalies = [];
  losses.filter((l) => l.lossType === 'THEFT_SUSPECTED').forEach((l) => anomalies.push({ type: 'THEFT_SUSPECTED', label: `Vol suspecté : ${l.quantity} ${l.unit} de ${l.productName} (${l.status})`, value: l.value }));
  losses.filter((l) => l.status === 'PENDING').forEach((l) => anomalies.push({ type: 'LOSS_PENDING', label: `Perte en attente de validation : ${l.productName}`, value: l.value }));
  sales.filter((s) => toMinor(s.margin) < 0).forEach((s) => anomalies.push({ type: 'NEGATIVE_MARGIN', label: `Vente ${s.saleNumber} sous le coût d'achat`, value: s.margin }));
  sales.filter((s) => toMinor(s.subtotal) > 0 && toMinor(s.discount) * 5 >= toMinor(s.subtotal)).forEach((s) => anomalies.push({ type: 'BIG_DISCOUNT', label: `Remise ≥ 20 % sur la vente ${s.saleNumber} (${s.createdByName})`, value: s.discount }));
  const cancelledSales = allSales.filter((s) => s.status === 'CANCELLED');
  cancelledSales.forEach((s) => anomalies.push({ type: 'SALE_CANCELLED', label: `Vente annulée ${s.saleNumber} (${s.cancelReason || '—'})`, value: s.total }));

  const marginMinor = turnoverMinor - cogsMinor;
  const profitMinor = marginMinor - expensesTotalMinor;
  const stockValue = stockValueOf(products.filter((p) => p.status === 'ACTIVE'));

  return {
    from, to,
    sales: {
      count: sales.length, total: fromMinor(turnoverMinor), cancelledCount: cancelledSales.length,
      receivables: fromMinor(sumMinor(sales, (s) => s.remainingAmount)), productsSold,
    },
    purchases: {
      count: purchases.length, total: fromMinor(purchasesTotalMinor),
      payables: fromMinor(sumMinor(purchases, (p) => p.remainingAmount)),
    },
    stocks: { rows: stockRows.sort((a, b) => a.productName.localeCompare(b.productName)), value: stockValue.total },
    expenses: {
      count: expenses.length, total: fromMinor(expensesTotalMinor),
      byCategory: Object.entries(byCat).map(([category, v]) => ({ category, total: fromMinor(v) })),
      list: expenses.map((e) => ({ id: e.id, category: e.category, description: e.description, amount: e.amount, paymentMethod: e.paymentMethod })),
    },
    finance: {
      receipts: fromMinor(receiptsMinor),
      receiptsByMethod: Object.entries(receiptsByMethod).map(([method, v]) => ({ method, total: fromMinor(v) })),
      supplierPayments: fromMinor(supplierPaymentsMinor),
      turnover: fromMinor(turnoverMinor),
      costOfGoodsSold: fromMinor(cogsMinor),
      grossMargin: fromMinor(marginMinor),
      expenses: fromMinor(expensesTotalMinor),
      estimatedProfit: fromMinor(profitMinor),
      lossesValue: fromMinor(lossesMinor),
      profitAfterLosses: fromMinor(profitMinor - lossesMinor),
    },
    control: {
      differences, corrections, anomalies,
      losses: losses.map((l) => ({ id: l.id, productName: l.productName, quantity: l.quantity, unit: l.unit, lossType: l.lossType, value: l.value, status: l.status, reason: l.reason })),
    },
  };
};

const generateDailyReport = async (date, generatedBy = 'SYSTEM') => {
  const report = await buildReport(date, date);
  await col('daily_reports').doc(date).set({
    ...report, date, generatedBy, generatedAt: ts(),
    stockValue: report.stocks.value,
  });
  return report;
};

/* ---------- CSV (compatible Excel : BOM UTF-8, séparateur point-virgule) ---------- */
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const reportToCsv = (r) => {
  const rows = [];
  const line = (...cells) => rows.push(cells.map(csvCell).join(';'));
  line('BOUCHERIE MIRA-MK — Rapport', r.from === r.to ? r.from : `${r.from} au ${r.to}`);
  line();
  line('FINANCE');
  line("Chiffre d'affaires", r.finance.turnover);
  line('Coût des marchandises vendues', r.finance.costOfGoodsSold);
  line('Marge brute', r.finance.grossMargin);
  line('Dépenses', r.finance.expenses);
  line('Bénéfice estimé', r.finance.estimatedProfit);
  line('Recettes encaissées', r.finance.receipts);
  line('Pertes (valeur)', r.finance.lossesValue);
  line();
  line('VENTES PAR PRODUIT'); line('Produit', 'Quantité', 'Unité', 'Total', 'Marge');
  r.sales.productsSold.forEach((p) => line(p.productName, p.quantity, p.unit, p.total, p.margin));
  line();
  line('ACHATS', `${r.purchases.count} achat(s)`, r.purchases.total);
  line();
  line('STOCKS'); line('Produit', 'Stock initial', 'Entrées', 'Ventes', 'Pertes', 'Ajustements', 'Stock final', 'Unité');
  r.stocks.rows.forEach((s) => line(s.productName, s.opening, s.entries, s.exits, s.losses, s.adjustments, s.closing, s.unit));
  line();
  line('DÉPENSES'); line('Catégorie', 'Description', 'Montant');
  r.expenses.list.forEach((e) => line(e.category, e.description, e.amount));
  line();
  line('CONTRÔLE — ANOMALIES');
  r.control.anomalies.forEach((a) => line(a.type, a.label, a.value));
  return `\uFEFF${rows.join('\r\n')}`;
};

module.exports = { buildReport, generateDailyReport, reportToCsv, stockValueOf, todayStr };
