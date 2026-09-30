'use strict';
const app = require('./app');
const env = require('./config/env');

// Render attribue dynamiquement un port via process.env.PORT
const PORT = process.env.PORT || env.port || 4000;

// Écoute sur 0.0.0.0 (requis pour Render) et sur le port assigné
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Boucherie Mira-Mk démarrée sur le port \({PORT} (\){env.nodeEnv})`);
  if (env.enableCron) require('./jobs/dailyReport').start();
});