'use strict';
const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`API Boucherie Mira-Mk démarrée sur http://localhost:${env.port}/api (${env.nodeEnv})`);
  if (env.enableCron) require('./jobs/dailyReport').start();
});
