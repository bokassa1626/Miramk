const d = require('../../src/utils/dates');

describe('dates (fuseau Lubumbashi UTC+2)', () => {
  test('bornes de journée', () => {
    const { start, end } = d.dayBounds('2026-03-10');
    expect(start.toISOString()).toBe('2026-03-09T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-10T22:00:00.000Z');
  });
  test('date locale : 23h30 UTC = lendemain à Lubumbashi', () => {
    expect(d.localDate(new Date('2026-03-10T23:30:00Z'))).toBe('2026-03-11');
  });
  test('addDays', () => {
    expect(d.addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(d.addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  test('date invalide refusée', () => {
    expect(() => d.dayBounds('10/03/2026')).toThrow();
  });
});
