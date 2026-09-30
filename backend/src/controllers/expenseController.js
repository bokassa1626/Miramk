const { db, admin, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const { logAction } = require('../utils/auditLogger');

async function listExpenses(req, res, next) {
  try {
    const snap = await db.collection(COLLECTIONS.EXPENSES).orderBy('date', 'desc').limit(100).get();
    res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    const ref = db.collection(COLLECTIONS.EXPENSES).doc();
    const date = req.body.date
      ? admin.firestore.Timestamp.fromDate(new Date(req.body.date))
      : admin.firestore.Timestamp.now();

    const data = {
      ...req.body,
      date,
      recordedBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(data);

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'EXPENSE_CREATED',
      entity: 'expense',
      entityId: ref.id,
      details: { amount: data.amount, category: data.category },
    });

    res.status(201).json({ success: true, data: { id: ref.id, ...data } });
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const ref = db.collection(COLLECTIONS.EXPENSES).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, 'Dépense introuvable.');

    const updates = { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (req.body.date) {
      updates.date = admin.firestore.Timestamp.fromDate(new Date(req.body.date));
    }

    await ref.set(updates, { merge: true });

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'EXPENSE_UPDATED',
      entity: 'expense',
      entityId: req.params.id,
    });

    const updated = await ref.get();
    res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const ref = db.collection(COLLECTIONS.EXPENSES).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, 'Dépense introuvable.');
    await ref.delete();

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'EXPENSE_DELETED',
      entity: 'expense',
      entityId: req.params.id,
    });

    res.json({ success: true, message: 'Dépense supprimée.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense };
