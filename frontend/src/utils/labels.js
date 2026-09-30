export const ROLE_LABELS = { ADMINISTRATEUR: 'Administrateur', GESTIONNAIRE: 'Gestionnaire', VENDEUR: 'Vendeur / Caissier', CONTROLEUR: 'Contrôleur' };
export const UNIT_OPTIONS = ['kg', 'g', 'piece', 'carton', 'litre'].map((u) => ({ value: u, label: u }));
export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' }, { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'CARTE', label: 'Carte' }, { value: 'VIREMENT', label: 'Virement' }, { value: 'AUTRE', label: 'Autre' },
];
export const paymentLabel = (v) => (v === 'CREDIT' ? 'Crédit' : PAYMENT_METHODS.find((m) => m.value === v)?.label || v || '—');
export const EXPENSE_CATEGORIES = [
  ['TRANSPORT', 'Transport'], ['ELECTRICITE', 'Électricité'], ['EAU', 'Eau'], ['ENTRETIEN', 'Entretien'],
  ['SALAIRE', 'Salaire'], ['MATERIEL', 'Matériel'], ['ADMINISTRATION', 'Administration'], ['AUTRES', 'Autres'],
].map(([value, label]) => ({ value, label }));
export const LOSS_TYPES = [
  ['DAMAGED', 'Produit abîmé'], ['EXPIRED', 'Produit périmé'], ['LOST', 'Perdu'],
  ['THEFT_SUSPECTED', 'Vol suspecté'], ['COUNT_DIFFERENCE', "Écart d'inventaire"], ['OTHER', 'Autre'],
].map(([value, label]) => ({ value, label }));
export const MOVEMENT_TYPES = [
  ['PURCHASE', 'Achat'], ['SALE', 'Vente'], ['LOSS', 'Perte'], ['RETURN', 'Retour'], ['ADJUSTMENT', 'Ajustement'], ['INVENTORY', 'Inventaire'],
].map(([value, label]) => ({ value, label }));
export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VALIDATE', 'CANCEL', 'LOGIN', 'LOGOUT', 'STOCK_ADJUSTMENT', 'SALE', 'PURCHASE', 'EXPENSE'].map((v) => ({ value: v, label: v }));
export const AUDIT_MODULES = ['auth', 'users', 'products', 'categories', 'suppliers', 'purchases', 'sales', 'stock', 'expenses', 'inventory', 'losses', 'settings'].map((v) => ({ value: v, label: v }));

export const label = (list, value) => list.find((x) => x.value === value)?.label || value || '—';

/** Libellés + couleurs des badges de statut */
export const STATUS = {
  NORMAL: ['Normal', 'green'], STOCK_FAIBLE: ['Stock faible', 'amber'], RUPTURE: ['Rupture', 'red'],
  ACTIVE: ['Actif', 'green'], INACTIVE: ['Inactif', 'gray'], ARCHIVED: ['Archivé', 'gray'],
  VALIDATED: ['Validé', 'green'], CANCELLED: ['Annulé', 'gray'], PENDING: ['En attente', 'amber'], REJECTED: ['Rejeté', 'red'],
  PAID: ['Payé', 'green'], PARTIAL: ['Partiel', 'amber'], UNPAID: ['Impayé', 'red'],
  LOW_STOCK: ['Stock faible', 'amber'], OUT_OF_STOCK: ['Rupture', 'red'],
};
