const m = require('../../src/utils/money');

describe('money — calculs financiers exacts', () => {
  test('la somme évite les erreurs de flottants (0,1 + 0,2)', () => {
    expect(m.sum([0.1, 0.2])).toBe(0.3);
    expect(0.1 + 0.2).not.toBe(0.3); // ce que l'on évite
  });
  test('total de ligne : quantité décimale x prix', () => {
    expect(m.lineTotal(1.25, 18000)).toBe(22500);
    expect(m.lineTotal(0.333, 100)).toBe(33.3);
    expect(m.lineTotal(60, 24000)).toBe(1440000);
  });
  test('addition de quantités sans dérive', () => {
    expect(m.addQty(0.1, 0.2)).toBe(0.3);
    expect(m.addQty(100, -60)).toBe(40);
  });
  test('conversion USD -> CDF', () => {
    expect(m.convertToBase(10, 'USD', 2800)).toBe(28000);
    expect(m.convertToBase(1500.5, 'CDF', 1)).toBe(1500.5);
  });
  test('coût moyen pondéré', () => {
    expect(m.weightedAverageCost(100, 18000, 50, 21000)).toBe(19000);
    expect(m.weightedAverageCost(0, 5000, 10, 18000)).toBe(18000);
  });
});
