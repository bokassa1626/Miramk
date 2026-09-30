const { stockStatus, STOCK_STATUS } = require('../../src/utils/stockStatus');

describe('alertes de stock (cahier des charges §19)', () => {
  test('NORMAL au-dessus du seuil', () => expect(stockStatus(60, 50)).toBe(STOCK_STATUS.NORMAL));
  test('STOCK FAIBLE en dessous ou égal au seuil (exemple : 45 kg pour un seuil de 50 kg)', () => {
    expect(stockStatus(45, 50)).toBe(STOCK_STATUS.LOW);
    expect(stockStatus(50, 50)).toBe(STOCK_STATUS.LOW);
  });
  test('RUPTURE quand le stock est nul', () => expect(stockStatus(0, 50)).toBe(STOCK_STATUS.OUT));
});
