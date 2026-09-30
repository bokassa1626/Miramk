const { db, admin, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const stockService = require('./stockService');
const invoiceService = require('./invoiceService');
const { calculateSaleMargin, sum, round2 } = require('../utils/calculations');
const { logAction } = require('../utils/auditLogger');

/**
 * Implémente précisément la séquence décrite dans le cahier des charges
 * pour POST /api/sales (étapes 4 à 14).
 */
async function createSale({ items, customerName, paymentMethod, notes, user }) {
  // 4. Vérifier l'existence du produit + 5. Vérifier la quantité disponible
  const productsData = [];
  for (const item of items) {
    const productSnap = await db.collection(COLLECTIONS.PRODUCTS).doc(item.productId).get();
    if (!productSnap.exists) {
      throw new ApiError(404, `Produit introuvable: ${item.productId}`);
    }
    await stockService.checkAvailability(item.productId, item.quantity);
    productsData.push({ id: productSnap.id, ...productSnap.data() });
  }

  // 6. Calculer le montant + 7. coût d'achat + 8. marge (par article puis total)
  const saleItems = items.map((item, idx) => {
    const product = productsData[idx];
    const { totalSale, totalCost, margin } = calculateSaleMargin(
      product.salePrice,
      product.purchasePrice,
      item.quantity
    );
    return {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      quantity: item.quantity,
      unitSalePrice: product.salePrice,
      unitCostPrice: product.purchasePrice,
      totalSale,
      totalCost,
      margin,
    };
  });

  const totalAmount = sum(saleItems, (i) => i.totalSale);
  const totalCost = sum(saleItems, (i) => i.totalCost);
  const totalMargin = round2(totalAmount - totalCost);

  // 9. Enregistrer la vente
  const saleRef = db.collection(COLLECTIONS.SALES).doc();
  const saleData = {
    items: saleItems,
    customerName: customerName || 'Client comptant',
    paymentMethod,
    notes: notes || null,
    totalAmount,
    totalCost,
    totalMargin,
    soldBy: user.uid,
    soldByName: user.fullName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await saleRef.set(saleData);

  // 10. Mettre à jour le stock + 11. Créer les mouvements de stock
  for (const item of saleItems) {
    await stockService.applyStockMovement({
      productId: item.productId,
      delta: -item.quantity,
      type: 'sale',
      referenceId: saleRef.id,
      userId: user.uid,
      note: `Vente ${saleRef.id}`,
    });
  }

  const sale = { id: saleRef.id, ...saleData };

  // 12. Générer le numéro de facture + 13. Enregistrer la facture
  const invoice = await invoiceService.createInvoiceForSale({ sale, userId: user.uid });

  // 14. Enregistrer l'action dans audit_logs
  await logAction({
    userId: user.uid,
    userEmail: user.email,
    action: 'SALE_CREATED',
    entity: 'sale',
    entityId: saleRef.id,
    details: { totalAmount, invoiceNumber: invoice.invoiceNumber },
  });

  // 15. Retourner le résultat au frontend
  return { sale, invoice };
}

async function getSales({ limit = 50 } = {}) {
  const snap = await db.collection(COLLECTIONS.SALES).orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getSaleById(id) {
  const snap = await db.collection(COLLECTIONS.SALES).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getSalesBetween(startDate, endDate) {
  const snap = await db
    .collection(COLLECTIONS.SALES)
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = { createSale, getSales, getSaleById, getSalesBetween };
