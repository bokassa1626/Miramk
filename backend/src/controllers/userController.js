const { db, auth, admin, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const { logAction } = require('../utils/auditLogger');

// GET /api/users — liste des utilisateurs (ADMIN uniquement, voir routes)
async function listUsers(req, res, next) {
  try {
    const snap = await db.collection(COLLECTIONS.USERS).orderBy('createdAt', 'desc').get();
    res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
}

// POST /api/users — crée un compte Firebase Auth + profil Firestore (rôle)
async function createUser(req, res, next) {
  try {
    const { email, password, fullName, role } = req.body;

    if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(role)) {
      throw new ApiError(400, 'Rôle invalide. Utiliser ADMIN, MANAGER ou CASHIER.');
    }

    const userRecord = await auth.createUser({ email, password, displayName: fullName });

    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
      email,
      fullName,
      role,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'USER_CREATED',
      entity: 'user',
      entityId: userRecord.uid,
      details: { email, role },
    });

    res.status(201).json({ success: true, data: { uid: userRecord.uid, email, fullName, role } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/:id — modifier rôle / statut actif
async function updateUser(req, res, next) {
  try {
    const ref = db.collection(COLLECTIONS.USERS).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, 'Utilisateur introuvable.');

    const { role, active, fullName } = req.body;
    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (role) updates.role = role;
    if (typeof active === 'boolean') updates.active = active;
    if (fullName) updates.fullName = fullName;

    await ref.set(updates, { merge: true });

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'USER_UPDATED',
      entity: 'user',
      entityId: req.params.id,
      details: updates,
    });

    const updated = await ref.get();
    res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser };
