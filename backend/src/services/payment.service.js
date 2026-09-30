'use strict';
const { col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { toMinor, fromMinor, convertToBase } = require('../utils/money');

const KINDS = {
  SALE_PAYMENT: 'IN',
  SALE_REFUND: 'OUT',
  PURCHASE_PAYMENT: 'OUT',
  PURCHASE_REFUND: 'IN',
};

/**
 * Normalise un paiement saisi { method, currency, amount } en devise de base (CDF).
 * Retourne { amountBase (CDF), currency, amount (saisi), exchangeRate }.
 */
const normalizePayment = (payment, usdRate) => {
  if (!payment || !(payment.amount > 0)) return null;
  const currency = payment.currency || 'CDF';
  const exchangeRate = currency === 'USD' ? Number(usdRate) : 1;
  return {
    method: payment.method || 'CASH',
    currency,
    amount: payment.amount,
    exchangeRate,
    amountBase: convertToBase(payment.amount, currency, exchangeRate),
  };
};

/** Statut de paiement d'un document */
const paymentStatus = (total, paid) => {
  if (toMinor(paid) <= 0) return total > 0 ? 'UNPAID' : 'PAID';
  return toMinor(paid) >= toMinor(total) ? 'PAID' : 'PARTIAL';
};

/**
 * Écrit un document payments/{id} (Transaction ou WriteBatch).
 * amountBase est toujours positif ; le sens est porté par "direction".
 */
const writePayment = (writer, ctx, { kind, referenceId, referenceNumber, normalized, note }) => {
  const ref = col('payments').doc();
  writer.set(ref, {
    kind,
    direction: KINDS[kind],
    referenceId,
    referenceNumber,
    method: normalized.method,
    currency: normalized.currency,
    amount: normalized.amount,
    exchangeRate: normalized.exchangeRate,
    amountBase: normalized.amountBase,
    note: note || null,
    createdBy: ctx.userId,
    createdByName: ctx.userName,
    createdAt: ts(),
  });
  return ref;
};

/** Répartit un paiement sur le reste dû : encaisse au plus le reste, le surplus est rendu au client */
const applyToRemaining = (normalized, remaining) => {
  const due = toMinor(remaining);
  const given = toMinor(normalized.amountBase);
  const applied = Math.min(due, given);
  if (applied <= 0) throw new ApiError(409, 'Rien à payer sur ce document');
  const ratio = applied / given;
  return {
    applied: fromMinor(applied),
    change: fromMinor(given - applied),
    // montant saisi (devise d'origine) effectivement imputé
    normalized: {
      ...normalized,
      amount: Math.round(normalized.amount * ratio * 100) / 100,
      amountBase: fromMinor(applied),
    },
  };
};

module.exports = { KINDS, normalizePayment, paymentStatus, writePayment, applyToRemaining };
