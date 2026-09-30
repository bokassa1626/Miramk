const { can } = require('../../src/config/permissions');
const { ROLES } = require('../../src/config/defaults');

describe('RBAC (cahier des charges §8)', () => {
  test("l'administrateur a tous les droits", () => {
    expect(can(ROLES.ADMIN, 'users:manage')).toBe(true);
    expect(can(ROLES.ADMIN, 'sales:cancel')).toBe(true);
  });
  test('le vendeur vend mais ne gère ni achats, ni utilisateurs, ni audit, ni coûts', () => {
    expect(can(ROLES.CASHIER, 'sales:create')).toBe(true);
    expect(can(ROLES.CASHIER, 'purchases:create')).toBe(false);
    expect(can(ROLES.CASHIER, 'users:manage')).toBe(false);
    expect(can(ROLES.CASHIER, 'audit:read')).toBe(false);
    expect(can(ROLES.CASHIER, 'costs:read')).toBe(false);
  });
  test('le gestionnaire gère produits, achats et inventaires mais ne vend pas', () => {
    expect(can(ROLES.MANAGER, 'purchases:create')).toBe(true);
    expect(can(ROLES.MANAGER, 'inventory:validate')).toBe(true);
    expect(can(ROLES.MANAGER, 'sales:create')).toBe(false);
    expect(can(ROLES.MANAGER, 'audit:read')).toBe(false);
  });
  test("le contrôleur audite mais ne modifie ni ventes ni achats", () => {
    expect(can(ROLES.CONTROLLER, 'audit:read')).toBe(true);
    expect(can(ROLES.CONTROLLER, 'losses:create')).toBe(true);
    expect(can(ROLES.CONTROLLER, 'sales:create')).toBe(false);
    expect(can(ROLES.CONTROLLER, 'purchases:create')).toBe(false);
  });
  test('rôle inconnu : aucun droit', () => expect(can('PIRATE', 'sales:read')).toBe(false));
});
