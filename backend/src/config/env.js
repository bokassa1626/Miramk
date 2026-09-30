'use strict';
require('dotenv').config();

const list = (v, fallback) =>
  (v ? v.split(',') : fallback).map((s) => s.trim()).filter(Boolean);

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  corsOrigins: list(process.env.CORS_ORIGINS, ['http://localhost:5173']),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    webApiKey: process.env.FIREBASE_WEB_API_KEY || 'fake-api-key',
  },
  enableCron: process.env.ENABLE_CRON !== 'false',
  // Lubumbashi = UTC+2 toute l'année (pas d'heure d'été)
  timezone: 'Africa/Lubumbashi',
  utcOffset: '+02:00',
};
