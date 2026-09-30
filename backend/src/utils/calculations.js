/**
 * Utilitaires de calcul financier partagés par les services.
 * Toutes les valeurs monétaires sont manipulées en nombre flottant "unités"
 * (ex: Francs Congolais ou USD selon la config de la boucherie).
 */

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// Marge brute d'une vente = prix de vente total - coût d'achat total
function calculateSaleMargin(unitSalePrice, unitCostPrice, quantity) {
  const totalSale = round2(unitSalePrice * quantity);
  const totalCost = round2(unitCostPrice * quantity);
  const margin = round2(totalSale - totalCost);
  return { totalSale, totalCost, margin };
}

// Bénéfice net d'une période = marge brute - dépenses
function calculateNetProfit({ revenue, costOfGoodsSold, expenses }) {
  const grossMargin = round2(revenue - costOfGoodsSold);
  const netProfit = round2(grossMargin - expenses);
  return { grossMargin, netProfit };
}

function sum(items, picker) {
  return round2(items.reduce((acc, item) => acc + Number(picker(item) || 0), 0));
}

module.exports = { round2, calculateSaleMargin, calculateNetProfit, sum };
