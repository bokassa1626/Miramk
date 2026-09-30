'use strict';
const env = require('../config/env');
const { auth, col, ts } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { fromSnap } = require('../utils/serialize');
const { PERMISSIONS } = require('../config/permissions');

const identityBase = () => {
  const emu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  return emu ? `http://${emu}/identitytoolkit.googleapis.com/v1` : 'https://identitytoolkit.googleapis.com/v1';
};
const tokenBase = () => {
  const emu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  return emu ? `http://${emu}/securetoken.googleapis.com/v1` : 'https://securetoken.googleapis.com/v1';
};

/**
 * Connexion e-mail / mot de passe via l'API REST Firebase Auth.
 * La clé Web Firebase reste côté serveur ; le frontend ne manipule que des jetons.
 */
const login = async (email, password) => {
  const res = await fetch(`${identityBase()}/accounts:signInWithPassword?key=${env.firebase.webApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) {
    const code = json?.error?.message || '';
    if (code.includes('USER_DISABLED')) throw new ApiError(403, 'Ce compte est désactivé');
    if (code.includes('TOO_MANY_ATTEMPTS')) throw new ApiError(429, 'Trop de tentatives, réessayez plus tard');
    throw new ApiError(401, 'E-mail ou mot de passe incorrect');
  }
  const snap = await col('users').doc(json.localId).get();
  if (!snap.exists) throw new ApiError(403, "Aucun profil n'est associé à ce compte");
  const user = snap.data();
  if (user.status !== 'ACTIVE') throw new ApiError(403, 'Ce compte est désactivé');
  await snap.ref.update({ lastLogin: ts() });
  return {
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    expiresIn: parseInt(json.expiresIn, 10),
    user: { ...fromSnap(await snap.ref.get()), permissions: PERMISSIONS[user.role] || [] },
  };
};

const refresh = async (refreshToken) => {
  const res = await fetch(`${tokenBase()}/token?key=${env.firebase.webApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new ApiError(401, 'Session expirée, veuillez vous reconnecter');
  return { idToken: json.id_token, refreshToken: json.refresh_token, expiresIn: parseInt(json.expires_in, 10) };
};

const me = async (uid) => {
  const snap = await col('users').doc(uid).get();
  if (!snap.exists) throw new ApiError(404, 'Profil introuvable');
  const user = fromSnap(snap);
  return { ...user, permissions: PERMISSIONS[user.role] || [] };
};

module.exports = { login, refresh, me };
