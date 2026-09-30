const { db, admin, COLLECTIONS } = require('../config/firebase');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');

/**
 * Crée une facture liée à une vente. Appelé depuis saleService
 * dans la même chaîne d'opérations (Firestore ne supporte pas de
 * vraies transactions cross-écritures illimitées, donc on choisit
 * un ordre d'opérations sûr: vente + stock d'abord, puis facture).
 */
async function createInvoiceForSale({ sale, userId }) {
  const invoiceNumber = await generateInvoiceNumber();
  const invoiceRef = db.collection(COLLECTIONS.INVOICES).doc();

  const invoiceData = {
    invoiceNumber,
    saleId: sale.id,
    customerName: sale.customerName,
    items: sale.items,
    totalAmount: sale.totalAmount,
    paymentMethod: sale.paymentMethod,
    issuedBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await invoiceRef.set(invoiceData);

  return { id: invoiceRef.id, ...invoiceData };
}

async function getInvoices({ limit = 50 } = {}) {
  const snap = await db
    .collection(COLLECTIONS.INVOICES)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getInvoiceById(id) {
  const snap = await db.collection(COLLECTIONS.INVOICES).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = { createInvoiceForSale, getInvoices, getInvoiceById };
