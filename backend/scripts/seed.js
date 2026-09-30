'use strict';
/**
 * Données initiales : paramètres, rôles, catégories, fournisseur, produits, comptes de test.
 * Usage : npm run seed   (idempotent : peut être relancé sans créer de doublons)
 */
require('dotenv').config();
const { admin, db, auth, ts } = require('../src/config/firebase');
const { DEFAULT_SETTINGS, ROLES } = require('../src/config/defaults');
const { PERMISSIONS } = require('../src/config/permissions');

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'ChangeMoi!2026';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@mira-mk.cd';

const USERS = [
  { firstName: 'Admin', lastName: 'Mira-Mk', email: ADMIN_EMAIL, role: ROLES.ADMIN },
  { firstName: 'Gestion', lastName: 'Mira-Mk', email: 'gestionnaire@mira-mk.cd', role: ROLES.MANAGER },
  { firstName: 'Caisse', lastName: 'Mira-Mk', email: 'vendeur@mira-mk.cd', role: ROLES.CASHIER },
  { firstName: 'Controle', lastName: 'Mira-Mk', email: 'controleur@mira-mk.cd', role: ROLES.CONTROLLER },
];

const CATEGORIES = ['Bœuf', 'Porc', 'Chèvre', 'Volaille', 'Abats', 'Charcuterie'];

// [code, nom, catégorie, unité, prix d'achat CDF, prix de vente CDF, stock initial, seuil minimum]
const PRODUCTS = [
  ['BOEUF-01', 'Viande de bœuf', 'Bœuf', 'kg', 18000, 24000, 100, 50],
  ['PORC-01', 'Viande de porc', 'Porc', 'kg', 16000, 21000, 60, 25],
  ['CHEV-01', 'Viande de chèvre', 'Chèvre', 'kg', 20000, 26000, 40, 20],
  ['POUL-01', 'Poulet', 'Volaille', 'kg', 12000, 16000, 80, 30],
  ['ABAT-01', 'Abats', 'Abats', 'kg', 8000, 12000, 30, 15],
  ['SAUC-01', 'Saucisses', 'Charcuterie', 'kg', 14000, 19000, 25, 10],
];

(async () => {
  console.log('→ Paramètres de l\'entreprise');
  await db.collection('settings').doc('company').set({ ...DEFAULT_SETTINGS, updatedAt: ts() }, { merge: true });

  console.log('→ Rôles');
  for (const [role, permissions] of Object.entries(PERMISSIONS)) {
    await db.collection('roles').doc(role).set({ name: role, permissions, updatedAt: ts() });
  }

  console.log('→ Utilisateurs');
  const ids = {};
  for (const u of USERS) {
    let record;
    try {
      record = await auth.getUserByEmail(u.email);
    } catch (e) {
      record = await auth.createUser({ email: u.email, password: PASSWORD, displayName: `${u.firstName} ${u.lastName}` });
    }
    await auth.setCustomUserClaims(record.uid, { role: u.role });
    await db.collection('users').doc(record.uid).set({
      firstName: u.firstName, lastName: u.lastName, email: u.email, phone: '', role: u.role,
      status: 'ACTIVE', photoURL: '', createdAt: ts(), updatedAt: ts(), lastLogin: null,
    }, { merge: true });
    ids[u.role] = record.uid;
    console.log(`   ${u.role.padEnd(15)} ${u.email}`);
  }
  const seedCtx = { userId: ids[ROLES.ADMIN], userName: 'Admin Mira-Mk' };

  console.log('→ Catégories');
  const catId = {};
  for (const name of CATEGORIES) {
    const q = await db.collection('categories').where('nameLower', '==', name.toLowerCase()).limit(1).get();
    if (!q.empty) { catId[name] = q.docs[0].id; continue; }
    const ref = db.collection('categories').doc();
    await ref.set({ name, nameLower: name.toLowerCase(), description: '', status: 'ACTIVE', createdAt: ts(), updatedAt: ts() });
    catId[name] = ref.id;
  }

  console.log('→ Fournisseur');
  let supplierId;
  const sq = await db.collection('suppliers').where('nameLower', '==', 'abattoir central').limit(1).get();
  if (sq.empty) {
    const ref = db.collection('suppliers').doc();
    await ref.set({
      name: 'Abattoir Central', nameLower: 'abattoir central', phone: '', email: '', address: 'Lubumbashi', contactPerson: '',
      stats: { count: 0, totalMinor: 0, paidMinor: 0, debtMinor: 0 }, status: 'ACTIVE', createdAt: ts(), updatedAt: ts(),
    });
    supplierId = ref.id;
  } else supplierId = sq.docs[0].id;

  console.log('→ Produits');
  const { createProduct } = require('../src/services/product.service');
  for (const [code, name, cat, unit, purchasePrice, sellingPrice, initialStock, minimumStock] of PRODUCTS) {
    const exists = await db.collection('products').where('code', '==', code).limit(1).get();
    if (!exists.empty) continue;
    await createProduct({ code, name, categoryId: catId[cat], unit, purchasePrice, sellingPrice, initialStock, minimumStock, supplierId }, seedCtx);
  }

  console.log('\n✔ Données initiales prêtes.');
  console.log(`  Mot de passe des comptes de test : ${PASSWORD}  (à changer en production !)`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
