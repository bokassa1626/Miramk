'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const v = require('../validators');

const auth = require('../controllers/auth.controller');
const users = require('../controllers/user.controller');
const categories = require('../controllers/category.controller');
const suppliers = require('../controllers/supplier.controller');
const products = require('../controllers/product.controller');
const purchases = require('../controllers/purchase.controller');
const sales = require('../controllers/sale.controller');
const stock = require('../controllers/stock.controller');
const expenses = require('../controllers/expense.controller');
const inventory = require('../controllers/inventory.controller');
const losses = require('../controllers/loss.controller');
const reports = require('../controllers/report.controller');
const alerts = require('../controllers/alert.controller');
const audit = require('../controllers/audit.controller');
const settings = require('../controllers/settings.controller');

const router = express.Router();

/* ------------------------------------------------------------ AUTH (public) */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.', error: 'RATE_LIMIT' },
});
router.post('/auth/login', loginLimiter, validate(v.login), auth.login);
router.post('/auth/refresh', loginLimiter, validate(v.refresh), auth.refresh);

/* Toutes les routes suivantes exigent un jeton valide */
router.use(authenticate);
router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);

/* ------------------------------------------------------------ UTILISATEURS */
router.get('/users', authorize('users:manage'), users.list);
router.get('/users/roles', authorize('users:manage'), users.roles);
router.post('/users', authorize('users:manage'), validate(v.userCreate), users.create);
router.get('/users/:id', authorize('users:manage'), users.get);
router.put('/users/:id', authorize('users:manage'), validate(v.userUpdate), users.update);
router.post('/users/:id/reset-password', authorize('users:manage'), validate(v.passwordReset), users.resetPassword);

/* ------------------------------------------------------------ CATALOGUE */
router.get('/categories', authorize('categories:read'), categories.list);
router.post('/categories', authorize('categories:write'), validate(v.categoryCreate), categories.create);
router.get('/categories/:id', authorize('categories:read'), categories.get);
router.put('/categories/:id', authorize('categories:write'), validate(v.categoryUpdate), categories.update);
router.delete('/categories/:id', authorize('categories:write'), categories.archive);

router.get('/products', authorize('products:read'), products.list);
router.post('/products', authorize('products:write'), validate(v.productCreate), products.create);
router.get('/products/:id', authorize('products:read'), products.get);
router.put('/products/:id', authorize('products:write'), validate(v.productUpdate), products.update);
router.delete('/products/:id', authorize('products:write'), products.remove);

router.get('/suppliers', authorize('suppliers:read'), suppliers.list);
router.post('/suppliers', authorize('suppliers:write'), validate(v.supplierCreate), suppliers.create);
router.get('/suppliers/:id', authorize('suppliers:read'), suppliers.get);
router.put('/suppliers/:id', authorize('suppliers:write'), validate(v.supplierUpdate), suppliers.update);
router.delete('/suppliers/:id', authorize('suppliers:write'), suppliers.archive);

/* ------------------------------------------------------------ STOCK */
router.get('/stock', authorize('stock:read'), stock.overview);
router.get('/stock/movements', authorize('stock:adjust', 'inventory:read', 'reports:read'), stock.movements);
router.post('/stock/adjust', authorize('stock:adjust'), validate(v.stockAdjust), stock.adjust);

/* ------------------------------------------------------------ ACHATS */
router.get('/purchases', authorize('purchases:read'), purchases.list);
router.post('/purchases', authorize('purchases:create'), validate(v.purchaseCreate), purchases.create);
router.get('/purchases/:id', authorize('purchases:read'), purchases.get);
router.post('/purchases/:id/payments', authorize('purchases:pay'), validate(v.paymentBody), purchases.pay);
router.post('/purchases/:id/cancel', authorize('purchases:cancel'), validate(v.cancel), purchases.cancel);

/* ------------------------------------------------------------ VENTES & FACTURES */
router.get('/sales', authorize('sales:read'), sales.list);
router.post('/sales', authorize('sales:create'), validate(v.saleCreate), sales.create);
router.get('/sales/:id', authorize('sales:read'), sales.get);
router.post('/sales/:id/payments', authorize('sales:pay'), validate(v.paymentBody), sales.pay);
router.post('/sales/:id/cancel', authorize('sales:cancel'), validate(v.cancel), sales.cancel);

router.get('/invoices', authorize('invoices:read'), sales.list);
router.get('/invoices/:id', authorize('invoices:read'), sales.invoice);

/* ------------------------------------------------------------ DÉPENSES */
router.get('/expenses', authorize('expenses:read'), expenses.list);
router.post('/expenses', authorize('expenses:create'), validate(v.expenseCreate), expenses.create);
router.get('/expenses/:id', authorize('expenses:read'), expenses.get);
router.post('/expenses/:id/cancel', authorize('expenses:cancel'), validate(v.cancel), expenses.cancel);

/* ------------------------------------------------------------ INVENTAIRE & PERTES */
router.get('/inventory', authorize('inventory:read'), inventory.list);
router.post('/inventory', authorize('inventory:create'), validate(v.inventoryCreate), inventory.create);
router.get('/inventory/:id', authorize('inventory:read'), inventory.get);
router.post('/inventory/:id/validate', authorize('inventory:validate'), inventory.validate);
router.post('/inventory/:id/reject', authorize('inventory:validate'), validate(v.cancel), inventory.reject);

router.get('/losses', authorize('losses:read'), losses.list);
router.post('/losses', authorize('losses:create'), validate(v.lossCreate), losses.create);
router.get('/losses/:id', authorize('losses:read'), losses.get);
router.post('/losses/:id/validate', authorize('losses:validate'), losses.validate);
router.post('/losses/:id/reject', authorize('losses:validate'), validate(v.cancel), losses.reject);

/* ------------------------------------------------------------ RAPPORTS, ALERTES, AUDIT */
router.get('/reports/dashboard', authorize('dashboard:read'), reports.dashboard);
router.get('/reports/daily', authorize('reports:read'), reports.daily);
router.get('/reports/summary', authorize('reports:read'), reports.summary);
router.get('/reports/export', authorize('reports:read'), reports.exportCsv);
router.get('/reports/history', authorize('reports:read'), reports.history);
router.post('/reports/daily/generate', authorize('reports:generate'), reports.generate);

router.get('/alerts', authorize('alerts:read'), alerts.list);
router.post('/alerts/:id/acknowledge', authorize('alerts:read'), alerts.acknowledge);

router.get('/audit', authorize('audit:read'), audit.list);

/* ------------------------------------------------------------ PARAMÈTRES */
router.get('/settings', settings.get); // informations société (utiles à tous les rôles pour les factures)
router.put('/settings', authorize('settings:write'), validate(v.settingsUpdate), settings.update);

module.exports = router;
