const app = require('./src/app');
const env = require('./src/config/env');

app.listen(env.PORT, () => {
  console.log(`✅ Serveur Boucherie Mira-Mk démarré sur http://localhost:${env.PORT}`);
  console.log(`   Environnement: ${env.NODE_ENV}`);
});
