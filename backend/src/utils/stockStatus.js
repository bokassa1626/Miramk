'use strict';
/** NORMAL > seuil ; STOCK_FAIBLE <= seuil ; RUPTURE = 0 (cahier des charges §19) */
const STOCK_STATUS = { NORMAL: 'NORMAL', LOW: 'STOCK_FAIBLE', OUT: 'RUPTURE' };

const stockStatus = (current, minimum) => {
  if (Number(current) <= 0) return STOCK_STATUS.OUT;
  if (Number(current) <= Number(minimum || 0)) return STOCK_STATUS.LOW;
  return STOCK_STATUS.NORMAL;
};

const formatQty = (n, unit) => `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} ${unit || ''}`.trim();

module.exports = { STOCK_STATUS, stockStatus, formatQty };
