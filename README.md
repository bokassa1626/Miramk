# Boucherie Mira-Mk — Système de gestion et de contrôle

Application de gestion complète pour la **Boucherie Mira-Mk** (Mitipisha, Gécamines, Avenue de
Kinshasa, Lubumbashi, RDC) : produits, stocks, achats, fournisseurs, ventes, factures, dépenses,
inventaire, pertes, alertes, rapports, utilisateurs et audit.

## Présentation du projet

- **Frontend** : React (Vite) + Tailwind CSS + Recharts + Lucide — aucune donnée sensible ni secret
  Firebase côté client.
- **Backend** : Node.js + Express, organisé en modules (contrôleurs / services / validateurs /
  middlewares), toute la logique métier et les calculs financiers y sont centralisés.
- **Base de données** : Cloud Firestore, accédée uniquement via le Firebase Admin SDK côté serveur.
- **Authentification** : Firebase Authentication (e-mail / mot de passe), rôles RBAC.

Voir `docs/architecture.md`, `docs/firestore.md` et `docs/api.md` pour le détail technique.

## Structure du dépôt

```
boucherie-mira-mk/
├── backend/     API Node.js + Express + Firebase Admin SDK
├── frontend/    Application React (Vite)
├── firebase/    Règles Firestore, index, configuration des émulateurs
└── docs/        Architecture, structure Firestore, référence API
```

## Prérequis

- Node.js ≥ 18
- Un projet Firebase avec **Firestore** et **Authentication (e-mail/mot de passe)** activés
- (Optionnel, recommandé pour le développement) Firebase CLI + émulateurs :
  `npm install -g firebase-tools`

## 1. Configuration Firebase

1. Créez un projet sur [console.firebase.google.com](https://console.firebase.google.com).
2. Activez **Firestore Database** (mode production) et **Authentication → E-mail/Mot de passe**.
3. **Paramètres du projet → Comptes de service** → *Générer une nouvelle clé privée* (JSON).
4. **Paramètres du projet → Général** → copiez la *Clé API Web* (nécessaire pour la connexion).
5. Mettez à jour `firebase/.firebaserc` avec l'identifiant de votre projet.

## 2. Configuration des variables d'environnement (backend)

```bash
cd backend
cp .env.example .env
```

Renseignez dans `.env` : `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
(depuis le JSON du compte de service) et `FIREBASE_WEB_API_KEY` (clé Web). Ne commitez jamais ce
fichier ni le JSON du compte de service.

## 3. Installation et lancement du backend

```bash
cd backend
npm install
npm run seed   # crée les paramètres, rôles, catégories, produits et comptes de test
npm run dev    # démarre l'API sur http://localhost:4000/api
```

Le script `seed` affiche les comptes de test créés et le mot de passe initial
(`SEED_DEFAULT_PASSWORD`, à changer en production).

## 4. Installation et lancement du frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=/api convient en développement (proxy Vite → :4000)
npm install
npm run dev             # http://localhost:5173
```

## 5. Comptes de test (après `npm run seed`)

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Administrateur | admin@mira-mk.cd | valeur de `SEED_DEFAULT_PASSWORD` |
| Gestionnaire | gestionnaire@mira-mk.cd | idem |
| Vendeur / Caissier | vendeur@mira-mk.cd | idem |
| Contrôleur | controleur@mira-mk.cd | idem |

## 6. Tests

```bash
cd backend
npm run test:unit        # tests unitaires purs (calculs, dates, permissions) — aucune dépendance externe
npm run test:emulator    # suite d'intégration complète via les émulateurs Firebase
```

La suite d'intégration (`tests/integration/flow.test.js`) couvre le cycle complet : création de
produit, achat (stock +), vente (stock −), refus si stock insuffisant, alertes, pertes (avec/sans
validation), inventaire, annulation (vente visible + stock rétabli), calcul du chiffre d'affaires /
marge / bénéfice, permissions par rôle, et journal d'audit en lecture seule.

## 7. Déploiement

- **Backend** : conteneurisez (Dockerfile simple `node:18-alpine`, `npm ci --omit=dev`,
  `CMD ["node","src/server.js"]`) et déployez sur Cloud Run, Render, ou tout hébergeur Node.
  Configurez les mêmes variables d'environnement que `.env.example`.
- **Frontend** : `npm run build` (dossier `dist/`), à héberger sur Firebase Hosting, Netlify ou
  Vercel. Définissez `VITE_API_URL` vers l'URL publique du backend.
- **Firestore** : `firebase deploy --only firestore:rules,firestore:indexes --project <projet>`.
- Générez un rapport journalier automatique soit via le job intégré (`ENABLE_CRON=true`, nécessite
  un process Node qui tourne en continu), soit via une Cloud Function planifiée équivalente pour un
  déploiement serverless (voir `docs/architecture.md`).

## 8. Règles métier clés (résumé)

- Une vente ne peut jamais dépasser le stock disponible (transaction annulée sinon).
- Achats, ventes et pertes créent systématiquement un mouvement de stock traçable
  (`stock_movements`, jamais modifié après coup).
- Aucune suppression physique des documents financiers : annulation (`CANCELLED`) ou
  archivage (`ARCHIVED`), toujours visible dans l'historique.
- Le bénéfice distingue chiffre d'affaires, coût des marchandises vendues, marge brute et dépenses —
  un achat de stock non vendu n'affecte jamais le bénéfice de la période.
- Toute opération critique (vente, achat, dépense, ajustement, validation, annulation, connexion)
  est journalisée dans `audit_logs`, en lecture seule pour tous les rôles.

## 9. Prochaines étapes possibles

- Génération de la facture en PDF téléchargeable (actuellement : aperçu + impression navigateur).
- Notifications en temps réel (Firestore `onSnapshot` côté backend + WebSocket ou SSE vers le frontend).
- Export Excel natif (`.xlsx`) en plus du CSV déjà disponible.
