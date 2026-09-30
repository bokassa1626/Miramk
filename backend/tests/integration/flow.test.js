/**
 * Tests d'intégration — nécessitent les émulateurs Firebase :
 *   npm run test:emulator     (ou firebase emulators:exec --only auth,firestore ...)
 * Sans émulateur, cette suite est ignorée.
 */
const request = require('supertest');

const hasEmulator = !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
const suite = hasEmulator ? describe : describe.skip;

suite('Boucherie Mira-Mk — flux métier complet', () => {
  let app; let db; let auth; let todayStr;
  const PASSWORD = 'Passw0rd!Test';
  const tokens = {};
  const ids = {};

  const api = (method, url, role) => {
    const r = request(app)[method](`/api${url}`);
    return role ? r.set('Authorization', `Bearer ${tokens[role]}`) : r;
  };

  const createUser = async (key, role) => {
    const email = `${key}@test.cd`;
    const rec = await auth.createUser({ email, password: PASSWORD, displayName: key });
    await auth.setCustomUserClaims(rec.uid, { role });
    await db.collection('users').doc(rec.uid).set({ firstName: key, lastName: 'Test', email, role, status: 'ACTIVE' });
    const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(res.status).toBe(200);
    tokens[key] = res.body.data.idToken;
  };

  beforeAll(async () => {
    ({ app } = { app: require('../../src/app') });
    ({ db, auth } = require('../../src/config/firebase'));
    ({ todayStr } = require('../../src/utils/dates'));
    await createUser('admin', 'ADMINISTRATEUR');
    await createUser('manager', 'GESTIONNAIRE');
    await createUser('cashier', 'VENDEUR');
    await createUser('controller', 'CONTROLEUR');
  });

  const stockOf = async () => (await api('get', `/products/${ids.product}`, 'admin')).body.data.currentStock;

  describe('authentification et permissions', () => {
    test('connexion refusée avec un mauvais mot de passe', async () => {
      const r = await request(app).post('/api/auth/login').send({ email: 'admin@test.cd', password: 'faux-mot-de-passe' });
      expect(r.status).toBe(401);
      expect(r.body.success).toBe(false);
    });
    test('accès sans jeton refusé', async () => expect((await api('get', '/products')).status).toBe(401));
    test('le vendeur ne peut pas créer de produit ni lire l\'audit', async () => {
      expect((await api('post', '/products', 'cashier').send({})).status).toBe(403);
      expect((await api('get', '/audit', 'cashier')).status).toBe(403);
    });
    test('le contrôleur ne peut pas vendre', async () => {
      expect((await api('post', '/sales', 'controller').send({ items: [] })).status).toBe(403);
    });
  });

  describe('produit, achat et vente', () => {
    test('création de catégorie, fournisseur et produit', async () => {
      const cat = await api('post', '/categories', 'admin').send({ name: 'Bœuf' });
      expect(cat.status).toBe(201);
      const sup = await api('post', '/suppliers', 'manager').send({ name: 'Abattoir Test' });
      expect(sup.status).toBe(201);
      ids.supplier = sup.body.data.id;
      const p = await api('post', '/products', 'manager').send({
        name: 'Viande de bœuf', categoryId: cat.body.data.id, unit: 'kg',
        purchasePrice: 1, sellingPrice: 24000, minimumStock: 50, supplierId: ids.supplier,
      });
      expect(p.status).toBe(201);
      expect(p.body.data.currentStock).toBe(0);
      ids.product = p.body.data.id;
    });

    test('achat : le stock augmente, le mouvement PURCHASE est créé, la dette fournisseur est calculée', async () => {
      const r = await api('post', '/purchases', 'manager').send({
        supplierId: ids.supplier,
        items: [{ productId: ids.product, quantity: 100, unitPrice: 18000 }],
        payment: { method: 'CASH', currency: 'CDF', amount: 1000000 },
      });
      expect(r.status).toBe(201);
      expect(r.body.data.total).toBe(1800000);
      expect(r.body.data.remainingAmount).toBe(800000);
      ids.purchase = r.body.data.id;
      expect(await stockOf()).toBe(100);
      const mv = await api('get', `/stock/movements?productId=${ids.product}`, 'admin');
      expect(mv.body.data.items[0].type).toBe('PURCHASE');
      const sup = await api('get', `/suppliers/${ids.supplier}`, 'admin');
      expect(sup.body.data.stats.debt).toBe(800000);
    });

    test('vente : le stock diminue, alerte STOCK FAIBLE générée (40 kg <= seuil 50 kg)', async () => {
      const r = await api('post', '/sales', 'cashier').send({
        items: [{ productId: ids.product, quantity: 60 }],
        payment: { method: 'CASH', currency: 'CDF', amount: 1440000 },
      });
      expect(r.status).toBe(201);
      expect(r.body.data.sale.total).toBe(1440000);
      expect(r.body.data.sale.costOfGoods).toBe(1080000);
      expect(r.body.data.sale.invoiceNumber).toMatch(/^FAC-/);
      ids.sale = r.body.data.sale.id;
      expect(await stockOf()).toBe(40);
      const alerts = await api('get', '/alerts', 'admin');
      const a = alerts.body.data.items.find((x) => x.productId === ids.product);
      expect(a.type).toBe('LOW_STOCK');
      expect(a.message).toContain('40');
    });

    test('vente refusée si le stock est insuffisant, sans aucun effet de bord', async () => {
      const r = await api('post', '/sales', 'cashier').send({
        items: [{ productId: ids.product, quantity: 50 }],
        payment: { method: 'CASH', currency: 'CDF', amount: 1200000 },
      });
      expect(r.status).toBe(409);
      expect(await stockOf()).toBe(40);
    });

    test('le vendeur ne voit pas le prix d\'achat', async () => {
      const r = await api('get', `/products/${ids.product}`, 'cashier');
      expect(r.status).toBe(200);
      expect(r.body.data.purchasePrice).toBeUndefined();
    });
  });

  describe('finance', () => {
    test('chiffre d\'affaires, marge et bénéfice estimé (dépenses déduites)', async () => {
      const e = await api('post', '/expenses', 'admin').send({ category: 'TRANSPORT', description: 'Livraison', amount: 100000 });
      expect(e.status).toBe(201);
      const r = await api('get', `/reports/daily?date=${todayStr()}`, 'admin');
      expect(r.status).toBe(200);
      const f = r.body.data.finance;
      expect(f.turnover).toBe(1440000);
      expect(f.costOfGoodsSold).toBe(1080000);
      expect(f.grossMargin).toBe(360000);
      expect(f.expenses).toBe(100000);
      expect(f.estimatedProfit).toBe(260000);
      expect(f.receipts).toBe(1440000);
    });
    test('un achat de stock non vendu ne réduit pas le bénéfice', async () => {
      const r = await api('get', `/reports/daily?date=${todayStr()}`, 'admin');
      expect(r.body.data.purchases.total).toBe(1800000);
      expect(r.body.data.finance.estimatedProfit).toBe(260000);
    });
  });

  describe('pertes, inventaire, correction', () => {
    test('petite perte validée automatiquement', async () => {
      const r = await api('post', '/losses', 'controller').send({ productId: ids.product, quantity: 1, lossType: 'DAMAGED', reason: 'Viande avariée' });
      expect(r.status).toBe(201);
      expect(r.body.data.status).toBe('VALIDATED');
      expect(await stockOf()).toBe(39);
    });
    test('vol suspecté : validation du responsable obligatoire, jamais par son auteur non-admin', async () => {
      const r = await api('post', '/losses', 'controller').send({ productId: ids.product, quantity: 2, lossType: 'THEFT_SUSPECTED', reason: 'Écart constaté' });
      expect(r.body.data.status).toBe('PENDING');
      expect(await stockOf()).toBe(39);
      expect((await api('post', `/losses/${r.body.data.id}/validate`, 'controller')).status).toBe(403);
      expect((await api('post', `/losses/${r.body.data.id}/validate`, 'manager')).status).toBe(200);
      expect(await stockOf()).toBe(37);
    });
    test('inventaire : différence, validation, ajustement historisé', async () => {
      const noReason = await api('post', '/inventory', 'controller').send({ items: [{ productId: ids.product, physicalStock: 35 }] });
      expect(noReason.status).toBe(400);
      const s = await api('post', '/inventory', 'controller').send({ items: [{ productId: ids.product, physicalStock: 35, reason: 'Comptage' }] });
      expect(s.status).toBe(201);
      expect(s.body.data.items[0].difference).toBe(-2);
      expect(await stockOf()).toBe(37);
      expect((await api('post', `/inventory/${s.body.data.id}/validate`, 'controller')).status).toBe(403);
      expect((await api('post', `/inventory/${s.body.data.id}/validate`, 'manager')).status).toBe(200);
      expect(await stockOf()).toBe(35);
      const mv = await api('get', `/stock/movements?productId=${ids.product}&type=INVENTORY`, 'admin');
      expect(mv.body.data.items).toHaveLength(1);
      expect(mv.body.data.items[0].previousStock).toBe(37);
      expect(mv.body.data.items[0].newStock).toBe(35);
    });
    test('correction manuelle exige un motif', async () => {
      expect((await api('post', '/stock/adjust', 'manager').send({ productId: ids.product, delta: 1 })).status).toBe(400);
      expect((await api('post', '/stock/adjust', 'manager').send({ productId: ids.product, delta: 1, reason: 'Erreur de comptage' })).status).toBe(200);
      expect(await stockOf()).toBe(36);
    });
  });

  describe('annulation et audit', () => {
    test('seul l\'administrateur annule une vente ; elle reste visible et le stock est rétabli', async () => {
      expect((await api('post', `/sales/${ids.sale}/cancel`, 'cashier').send({ reason: 'Erreur de saisie' })).status).toBe(403);
      const r = await api('post', `/sales/${ids.sale}/cancel`, 'admin').send({ reason: 'Erreur de saisie' });
      expect(r.status).toBe(200);
      expect(r.body.data.status).toBe('CANCELLED');
      expect(await stockOf()).toBe(96);
      const again = await api('post', `/sales/${ids.sale}/cancel`, 'admin').send({ reason: 'Encore' });
      expect(again.status).toBe(409);
      const list = await api('get', '/sales?status=CANCELLED', 'admin');
      expect(list.body.data.items).toHaveLength(1);
    });
    test('les opérations sont auditées et le journal est en lecture seule', async () => {
      const r = await api('get', '/audit?limit=100', 'controller');
      expect(r.status).toBe(200);
      const actions = r.body.data.items.map((i) => i.action);
      ['SALE', 'PURCHASE', 'CANCEL', 'STOCK_ADJUSTMENT', 'VALIDATE', 'EXPENSE', 'LOGIN'].forEach((a) => expect(actions).toContain(a));
      expect((await api('delete', `/audit/${r.body.data.items[0].id}`, 'admin')).status).toBe(404);
    });
  });
});
