const { db, COLLECTIONS } = require('../config/firebase');
const ApiError = require('../utils/ApiError');

// GET /api/auth/me — retourne le profil de l'utilisateur authentifié
async function me(req, res, next) {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login — le login réel (email/mdp) se fait côté React avec
// Firebase Authentication (SDK client). Cette route sert uniquement à
// valider le token une première fois et à retourner le profil applicatif.
async function login(req, res, next) {
  try {
    // authMiddleware a déjà vérifié le token et peuplé req.user
    res.json({ success: true, message: 'Connexion réussie.', data: req.user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout — révoque les tokens de rafraîchissement Firebase
async function logout(req, res, next) {
  try {
    const { auth } = require('../config/firebase');
    await auth.revokeRefreshTokens(req.user.uid);
    res.json({ success: true, message: 'Déconnexion réussie.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { me, login, logout };
