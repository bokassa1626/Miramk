'use strict';

/** Valeurs initiales de settings/company (voir cahier des charges §32) */
const DEFAULT_SETTINGS = {
  companyName: 'Boucherie Mira-Mk',
  address: 'Mitipisha, Gécamines, Avenue de Kinshasa, Lubumbashi',
  phone: '+243892210068, +243970252553, +243973936366',
  email: 'calebmuya2@gmail.com',
  logo: '',
  currency: 'CDF',
  invoicePrefix: 'FAC',
  salePrefix: 'VTE',
  purchasePrefix: 'ACH',
  defaultStockThreshold: 10,
  // Taux de conversion USD -> CDF appliqué aux paiements en dollars
  exchangeRateUSD: 2800,
  // Une perte dont la valeur (CDF) atteint ce seuil doit être validée par un responsable
  lossApprovalThreshold: 100000,
};

const ROLES = {
  ADMIN: 'ADMINISTRATEUR',
  MANAGER: 'GESTIONNAIRE',
  CASHIER: 'VENDEUR',
  CONTROLLER: 'CONTROLEUR',
};

const EXPENSE_CATEGORIES = [
  'TRANSPORT', 'ELECTRICITE', 'EAU', 'ENTRETIEN', 'SALAIRE', 'MATERIEL', 'ADMINISTRATION', 'AUTRES',
];

const LOSS_TYPES = ['DAMAGED', 'EXPIRED', 'LOST', 'THEFT_SUSPECTED', 'COUNT_DIFFERENCE', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CARTE', 'VIREMENT', 'CREDIT', 'AUTRE'];
const UNITS = ['kg', 'g', 'piece', 'carton', 'litre'];

module.exports = { DEFAULT_SETTINGS, ROLES, EXPENSE_CATEGORIES, LOSS_TYPES, PAYMENT_METHODS, UNITS };
