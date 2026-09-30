'use strict';
const { fromMinor } = require('../utils/money');
const crud = require('./crud.factory');

/** Les totaux fournisseur sont stockés en centimes entiers ; on les expose en montants */
const withStats = (s) => {
  const st = s.stats || {};
  return {
    ...s,
    stats: {
      purchaseCount: st.count || 0,
      totalPurchased: fromMinor(st.totalMinor || 0),
      totalPaid: fromMinor(st.paidMinor || 0),
      debt: fromMinor(st.debtMinor || 0),
    },
  };
};

module.exports = crud({
  collectionName: 'suppliers',
  moduleName: 'suppliers',
  label: 'Fournisseur',
  initial: () => ({ stats: { count: 0, totalMinor: 0, paidMinor: 0, debtMinor: 0 } }),
  transformOut: withStats,
});
