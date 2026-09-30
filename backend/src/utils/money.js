'use strict';
/**
 * Calculs financiers exacts.
 * Aucune addition/multiplication de flottants n'est faite directement :
 *  - les montants sont convertis en "minor units" entiers (centimes, x100),
 *  - les quantités en "milli-unités" entières (x1000, ex. 1,250 kg = 1250),
 *  - les opérations se font sur des entiers, puis on reconvertit.
 */
const toMinor = (n) => Math.round(Number(n) * 100);
const fromMinor = (m) => Math.round(m) / 100;
const toMilli = (q) => Math.round(Number(q) * 1000);
const fromMilli = (m) => Math.round(m) / 1000;

/** Total d'une ligne (quantité x prix unitaire) en minor units */
const lineTotalMinor = (qty, unitPrice) => Math.round((toMilli(qty) * toMinor(unitPrice)) / 1000);
const lineTotal = (qty, unitPrice) => fromMinor(lineTotalMinor(qty, unitPrice));

const round2 = (n) => fromMinor(toMinor(n));
const addQty = (a, b) => fromMilli(toMilli(a) + toMilli(b));
const sum = (values) => fromMinor(values.reduce((acc, v) => acc + toMinor(v), 0));

/** Conversion d'un paiement vers la devise de base (CDF) */
const convertToBase = (amount, currency, usdRate) =>
  currency === 'USD' ? fromMinor(Math.round(toMinor(amount) * Number(usdRate))) : round2(amount);

/** Coût moyen pondéré après une entrée en stock (résultat arrondi au centime) */
const weightedAverageCost = (prevQty, prevCost, inQty, inCost) => {
  const prevMilli = toMilli(prevQty);
  const inMilli = toMilli(inQty);
  if (prevMilli <= 0) return round2(inCost);
  const totalMilli = prevMilli + inMilli;
  const minor = Math.round((prevMilli * toMinor(prevCost) + inMilli * toMinor(inCost)) / totalMilli);
  return fromMinor(minor);
};

module.exports = {
  toMinor, fromMinor, toMilli, fromMilli,
  lineTotal, lineTotalMinor, round2, addQty, sum, convertToBase, weightedAverageCost,
};
