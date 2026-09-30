'use strict';
const admin = require('firebase-admin');
const env = require('./env');

if (!admin.apps.length) {
  const { projectId, clientEmail, privateKey } = env.firebase;
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  } else {
    // Mode émulateur / développement sans identifiants
    admin.initializeApp({ projectId: projectId || 'demo-mira-mk' });
  }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const ts = () => admin.firestore.FieldValue.serverTimestamp();
const col = (name) => db.collection(name);

module.exports = {
  admin,
  db,
  auth: admin.auth(),
  ts,
  col,
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
};
