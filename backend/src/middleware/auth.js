'use strict';
const { auth, db } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const { PERMISSIONS } = require('../config/permissions');

/**
 * Vérifie le jeton Firebase (ID token) envoyé en "Authorization: Bearer <token>".
 * checkRevoked = true : un compte désactivé/révoqué est refusé immédiatement.
 * Le rôle est lu dans les custom claims (aucune lecture Firestore par requête) ;
 * repli sur users/{uid} si le claim est absent.
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentification requise');

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token, true);
    } catch (e) {
      throw new ApiError(401, 'Session invalide ou expirée');
    }

    let role = decoded.role;
    let name = decoded.name || decoded.email;
    if (!role || !PERMISSIONS[role]) {
      const snap = await db.collection('users').doc(decoded.uid).get();
      if (!snap.exists) throw new ApiError(403, "Aucun profil n'est associé à ce compte");
      const u = snap.data();
      if (u.status !== 'ACTIVE') throw new ApiError(403, 'Compte désactivé');
      role = u.role;
      name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || decoded.email;
    }
    req.user = { id: decoded.uid, email: decoded.email, name, role };
    next();
  } catch (e) {
    next(e);
  }
};

module.exports = { authenticate };
