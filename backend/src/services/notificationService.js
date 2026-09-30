const { db, COLLECTIONS } = require('../config/firebase');

/**
 * Service simple d'alertes internes (stock bas, etc.).
 * Peut être étendu plus tard vers email/SMS/push.
 */
async function getLowStockAlerts() {
  const productsSnap = await db.collection(COLLECTIONS.PRODUCTS).where('active', '==', true).get();
  const stockSnap = await db.collection(COLLECTIONS.STOCK).get();

  const stockMap = {};
  stockSnap.forEach((d) => (stockMap[d.id] = d.data().quantity ?? 0));

  const alerts = [];
  productsSnap.forEach((doc) => {
    const product = doc.data();
    const currentQuantity = stockMap[doc.id] ?? 0;
    if (currentQuantity <= (product.minStockThreshold ?? 0)) {
      alerts.push({
        productId: doc.id,
        productName: product.name,
        currentQuantity,
        minStockThreshold: product.minStockThreshold,
      });
    }
  });

  return alerts;
}

module.exports = { getLowStockAlerts };
