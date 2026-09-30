'use strict';
const { ROLES } = require('./defaults');

/**
 * RBAC — permissions par rôle (cahier des charges §8).
 * Format : "module:action". "*" = tout.
 * Extension documentée : le GESTIONNAIRE peut valider les pertes (il est le « responsable »
 * visé au §21) et le CONTROLEUR peut consulter le coût d'achat pour contrôler les stocks.
 */
const PERMISSIONS = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.MANAGER]: [
    'dashboard:read',
    'products:read', 'products:write', 'costs:read',
    'categories:read', 'categories:write',
    'stock:read', 'stock:adjust',
    'purchases:read', 'purchases:create', 'purchases:pay',
    'suppliers:read', 'suppliers:write',
    'inventory:read', 'inventory:create', 'inventory:validate',
    'losses:read', 'losses:validate',
    'reports:read', 'alerts:read',
  ],
  [ROLES.CASHIER]: [
    'products:read', // vue limitée : sans prix d'achat
    'stock:read',    // vue limitée
    'sales:read', 'sales:create', 'sales:pay',
    'invoices:read',
  ],
  [ROLES.CONTROLLER]: [
    'dashboard:read',
    'products:read', 'costs:read',
    'categories:read',
    'stock:read',
    'inventory:read', 'inventory:create',
    'losses:read', 'losses:create',
    'reports:read', 'alerts:read',
    'audit:read',
  ],
};

const can = (role, permission) => {
  const perms = PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
};

module.exports = { PERMISSIONS, can };
