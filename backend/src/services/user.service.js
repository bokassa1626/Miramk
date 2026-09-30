'use strict';
const { db, col, ts, auth } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { addAudit } = require('./audit.service');
const { fromSnap } = require('../utils/serialize');

const displayName = (u) => `${u.firstName} ${u.lastName}`.trim();

const createUser = async (input, ctx) => {
  let record;
  try {
    record = await auth.createUser({
      email: input.email,
      password: input.password, // géré par Firebase Auth — jamais stocké dans Firestore
      displayName: displayName(input),
      disabled: false,
    });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') throw new ApiError(409, 'Cet e-mail est déjà utilisé');
    if (e.code === 'auth/invalid-password') throw new ApiError(400, 'Mot de passe invalide (6 caractères minimum)');
    throw e;
  }
  await auth.setCustomUserClaims(record.uid, { role: input.role });
  const ref = col('users').doc(record.uid);
  const batch = db.batch();
  batch.set(ref, {
    firstName: input.firstName, lastName: input.lastName, email: input.email,
    phone: input.phone || '', role: input.role, status: 'ACTIVE', photoURL: '',
    createdAt: ts(), updatedAt: ts(), lastLogin: null,
  });
  addAudit(batch, ctx, {
    action: 'CREATE', module: 'users', documentId: record.uid,
    description: `Création du compte ${input.email} (${input.role})`,
    newData: { email: input.email, role: input.role },
  });
  await batch.commit();
  return fromSnap(await ref.get());
};

const updateUser = async (id, input, ctx) => {
  const ref = col('users').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'Utilisateur introuvable');
  const old = snap.data();
  if (id === ctx.userId && ((input.role && input.role !== old.role) || (input.status && input.status !== 'ACTIVE'))) {
    throw new ApiError(409, 'Vous ne pouvez pas modifier votre propre rôle ou désactiver votre propre compte');
  }
  const merged = { ...old, ...input };
  await auth.updateUser(id, {
    displayName: displayName(merged),
    disabled: merged.status !== 'ACTIVE',
  });
  if (input.role && input.role !== old.role) {
    await auth.setCustomUserClaims(id, { role: input.role });
  }
  if ((input.role && input.role !== old.role) || (input.status && input.status !== old.status)) {
    await auth.revokeRefreshTokens(id); // force une reconnexion avec les nouveaux droits
  }
  const batch = db.batch();
  batch.update(ref, { ...input, updatedAt: ts() });
  addAudit(batch, ctx, {
    action: 'UPDATE', module: 'users', documentId: id,
    description: `Modification du compte ${old.email}`,
    oldData: { role: old.role, status: old.status, phone: old.phone },
    newData: input,
  });
  await batch.commit();
  return fromSnap(await ref.get());
};

const resetPassword = async (id, password, ctx) => {
  const snap = await col('users').doc(id).get();
  if (!snap.exists) throw new ApiError(404, 'Utilisateur introuvable');
  await auth.updateUser(id, { password });
  await auth.revokeRefreshTokens(id);
  const batch = db.batch();
  addAudit(batch, ctx, {
    action: 'UPDATE', module: 'users', documentId: id,
    description: `Réinitialisation du mot de passe de ${snap.data().email}`,
  });
  await batch.commit();
};

module.exports = { createUser, updateUser, resetPassword };
