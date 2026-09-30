const { db, COLLECTIONS } = require('../config/firebase');

/**
 * Génère un numéro de facture séquentiel et unique du type: FA-2026-000123
 * en utilisant un compteur atomique Firestore (transaction).
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc(`invoices_${year}`);

  const nextValue = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? snap.data().value : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next, year }, { merge: true });
    return next;
  });

  const padded = String(nextValue).padStart(6, '0');
  return `FA-${year}-${padded}`;
}

module.exports = { generateInvoiceNumber };
