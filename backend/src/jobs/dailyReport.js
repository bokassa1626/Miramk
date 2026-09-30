'use strict';
const cron = require('node-cron');
const env = require('../config/env');
const { todayStr } = require('../utils/dates');
const { generateDailyReport } = require('../services/report.service');

/**
 * Génération automatique du rapport journalier chaque soir à 23h55 (heure de Lubumbashi).
 * Alternative serverless : voir docs/architecture.md (Cloud Function planifiée).
 */
const start = () => {
  cron.schedule(
    '55 23 * * *',
    async () => {
      const date = todayStr();
      try {
        await generateDailyReport(date, 'SYSTEM');
        console.log(`[cron] Rapport journalier ${date} généré`);
      } catch (e) {
        console.error('[cron] Échec du rapport journalier', e);
      }
    },
    { timezone: env.timezone },
  );
  console.log('[cron] Rapport journalier planifié (23h55, Africa/Lubumbashi)');
};

module.exports = { start };
