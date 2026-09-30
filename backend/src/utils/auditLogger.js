const { db, COLLECTIONS, admin } = require('../config/firebase');

/**
 * Enregistre une action métier importante dans audit_logs.
 * Ne doit jamais faire échouer l'opération principale si l'écriture du log échoue.
 */
async function logAction({ userId, userEmail, action, entity, entityId, details = {} }) {
  try {
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      userId,
      userEmail,
      action,       // ex: 'SALE_CREATED', 'STOCK_ADJUSTED', 'PRODUCT_DELETED'
      entity,       // ex: 'sale', 'product', 'stock'
      entityId,
      details,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[auditLogger] Échec de l\'enregistrement du log:', err.message);
  }
}

module.exports = { logAction };
