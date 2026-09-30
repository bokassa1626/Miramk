'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // derrière un proxy (Cloud Run, Nginx…) : IP réelle pour l'audit et le rate limit

app.use(helmet());
app.use(cors({
  origin(origin, cb) {
    // Autorise les outils sans en-tête Origin (curl, tests) et les origines configurées
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origine non autorisée par CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard.', error: 'RATE_LIMIT' },
}));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API Boucherie Mira-Mk opérationnelle', data: { time: new Date().toISOString() } }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
