const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const qf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

export const money = (n, currency = 'CDF') => `${nf.format(Number(n) || 0)} ${currency}`;
export const num = (n) => nf.format(Number(n) || 0);
export const qty = (n, unit = '') => `${qf.format(Number(n) || 0)} ${unit}`.trim();
export const shortMoney = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')} M`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)} k`;
  return String(Math.round(v));
};

export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lubumbashi' }) : '—');
export const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Africa/Lubumbashi' }) : '—');
export const timeOnly = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { timeStyle: 'short', timeZone: 'Africa/Lubumbashi' }) : '—');

/** Date locale AAAA-MM-JJ (Lubumbashi) */
export const todayISO = () => new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10);
export const shiftDay = (iso, days) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
