// L'inventaire complet (POST /api/stock/inventory) est géré par stockController.
// Ce controller reste disponible pour d'éventuelles routes dédiées
// (ex: consultation de l'historique des inventaires) sans casser la structure prévue.
const { db, COLLECTIONS } = require('../config/firebase');

async function listInventories(req, res, next) {
  try {
    const snap = await db.collection(COLLECTIONS.INVENTORIES).orderBy('createdAt', 'desc').limit(20).get();
    res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listInventories };
