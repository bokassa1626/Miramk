'use strict';
const { col } = require('../config/firebase');
const { DEFAULT_SETTINGS } = require('../config/defaults');

const COMPANY_REF = col('settings').doc('company');
const COUNTERS_REF = col('settings').doc('counters');

const getSettings = async () => {
  const snap = await COMPANY_REF.get();
  const settings = { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) };
  settings.phone = settings.phone || DEFAULT_SETTINGS.phone;
  settings.email = settings.email || DEFAULT_SETTINGS.email;
  return settings;
};

/**
 * Numérotation séquentielle atomique (à utiliser DANS une transaction).
 * Lit settings/company + settings/counters (lectures avant écritures), puis commit() écrit les compteurs.
 */
const loadSequences = async (tx) => {
  const [companySnap, countersSnap] = await tx.getAll(COMPANY_REF, COUNTERS_REF);
  const company = { ...DEFAULT_SETTINGS, ...(companySnap.exists ? companySnap.data() : {}) };
  const counters = countersSnap.exists ? { ...countersSnap.data() } : {};
  const touched = {};
  return {
    company,
    next(key, prefix) {
      counters[key] = (counters[key] || 0) + 1;
      touched[key] = counters[key];
      return `${prefix}-${String(counters[key]).padStart(6, '0')}`;
    },
    commit(writer) {
      if (Object.keys(touched).length) writer.set(COUNTERS_REF, touched, { merge: true });
    },
  };
};

module.exports = { COMPANY_REF, COUNTERS_REF, getSettings, loadSequences };
