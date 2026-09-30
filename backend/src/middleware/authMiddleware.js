const { auth, db, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');

/**
 * Vérifie le token Firebase envoyé par le frontend React
 * dans le header "Authorization: Bearer <idToken>".
 * Récupère ensuite le profil utilisateur (rôle inclus) depuis Firestore.
 */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Non authentifié: token manquant.');
    }

    const decoded = await auth.verifyIdToken(token);

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get();

    if (!userSnap.exists) {
      throw new ApiError(403, "Utilisateur authentifié mais introuvable dans le système.");
    }

    const userData = userSnap.data();

    if (userData.active === false) {
      throw new ApiError(403, 'Compte désactivé. Contactez un administrateur.');
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role,
      fullName: userData.fullName || decoded.email,
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Token invalide ou expiré.'));
  }
}

module.exports = authMiddleware;
