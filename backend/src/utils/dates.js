'use strict';
const { utcOffset } = require('../config/env');
const { ApiError } = require('./errors');

const OFFSET_MS = parseInt(utcOffset.slice(1, 3), 10) * 3600 * 1000 * (utcOffset[0] === '-' ? -1 : 1);
const DAY_MS = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const assertDate = (s, name = 'date') => {
  if (!DATE_RE.test(s || '') || Number.isNaN(new Date(`${s}T00:00:00Z`).getTime())) {
    throw new ApiError(400, `Paramètre « ${name} » invalide (format attendu : AAAA-MM-JJ)`);
  }
  return s;
};

/** Date locale (Lubumbashi) au format AAAA-MM-JJ */
const localDate = (d = new Date()) => new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
const todayStr = () => localDate();

const dayBounds = (dateStr) => {
  assertDate(dateStr);
  const start = new Date(`${dateStr}T00:00:00${utcOffset}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};

const rangeBounds = (from, to) => {
  const start = dayBounds(from).start;
  const end = dayBounds(to || from).end;
  if (end <= start) throw new ApiError(400, 'La date de fin doit être postérieure à la date de début');
  return { start, end };
};

const addDays = (dateStr, n) => localDate(new Date(dayBounds(dateStr).start.getTime() + n * DAY_MS + 3600000));

const monthStart = (dateStr) => `${dateStr.slice(0, 7)}-01`;

/** Périodes prédéfinies : day | week | month | year | custom */
const periodRange = (period, from, to) => {
  const today = todayStr();
  switch (period) {
    case 'day': return { from: today, to: today };
    case 'week': {
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = dimanche
      const back = (dow + 6) % 7; // lundi = début de semaine
      return { from: addDays(today, -back), to: today };
    }
    case 'month': return { from: monthStart(today), to: today };
    case 'year': return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default:
      return { from: assertDate(from, 'from'), to: assertDate(to || from, 'to') };
  }
};

module.exports = { localDate, todayStr, dayBounds, rangeBounds, addDays, monthStart, periodRange, assertDate };
