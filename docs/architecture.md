# Architecture — Boucherie Mira-Mk

## Vue d'ensemble

```
React (Vite)  --HTTP/REST-->  Node.js + Express  --Firebase Admin SDK-->  Cloud Firestore
                                      |
                                      +--> Firebase Authentication (jetons vérifiés côté serveur)
```

Le frontend ne détient **aucun secret Firebase** et ne lit/écrit jamais Firestore directement.
Toutes les règles métier (stock, ventes, permissions, calculs financiers) vivent dans le backend.
`firebase/firestore.rules` bloque explicitement tout accès direct (`allow read, write: if false`) :
seul le compte de service (Admin SDK) traverse ces règles.

## Pourquoi ce choix

- **Cohérence transactionnelle** : une vente touche 3 à 5 documents (vente, produits, mouvements,
  paiement, audit). Firestore garantit l'atomicité via `runTransaction`, orchestrée côté serveur.
- **Sécurité** : le RBAC, la validation des montants/quantités et les calculs financiers exacts
  (entiers, pas de flottants) sont appliqués une seule fois, côté serveur, impossibles à contourner
  depuis le navigateur.
- **Auditabilité** : chaque écriture critique ajoute une entrée `audit_logs` dans la même transaction
  que l'opération métier — impossible d'avoir l'un sans l'autre.

## Authentification

1. Le frontend envoie e-mail/mot de passe à `POST /api/auth/login`.
2. Le backend appelle l'API REST Identity Toolkit de Firebase avec la clé Web (gardée côté serveur)
   et récupère un `idToken` + `refreshToken`.
3. Le frontend stocke ces jetons (localStorage) et les envoie en `Authorization: Bearer <idToken>`.
4. Chaque requête est vérifiée par `middleware/auth.js` via `admin.auth().verifyIdToken(token, true)`
   (`checkRevoked = true` : un compte désactivé est immédiatement bloqué).
5. Le rôle est lu depuis les *custom claims* Firebase (pas de lecture Firestore par requête) ; à
   défaut, on retombe sur `users/{uid}`.
6. À l'expiration, `POST /api/auth/refresh` échange le `refreshToken` contre un nouveau `idToken`
   (géré automatiquement par l'intercepteur Axios du frontend).

## RBAC

`config/permissions.js` associe à chaque rôle une liste de permissions `"module:action"`.
`middleware/rbac.js` (`authorize(...perms)`) vérifie qu'au moins une des permissions requises est
accordée. Le contrôleur produit filtre en plus certains champs sensibles (prix d'achat, coût) pour
les rôles sans la permission `costs:read` (le vendeur, par exemple).

## Transactions Firestore — le patron « lectures puis écritures »

Firestore impose que toutes les lectures d'une transaction précèdent la première écriture.
`services/stock.service.js` (`loadProducts` / `applyMovements`) centralise ce patron pour toutes
les opérations qui touchent au stock (achats, ventes, pertes, ajustements, inventaire) :

1. `loadProducts` lit en une fois tous les produits + leurs alertes concernées.
2. Les calculs (nouveaux stocks, coût moyen pondéré, valorisation) sont faits en mémoire.
3. `applyMovements` écrit les documents `stock_movements` (append-only) et met à jour
   `products.currentStock` + l'alerte associée, en refusant tout stock négatif.

Toute erreur (stock insuffisant, produit introuvable) lève une `ApiError` qui fait échouer la
transaction entière : aucune écriture partielle n'est possible.

## Calculs financiers exacts

`utils/money.js` bannit les additions de flottants directes. Les montants sont convertis en
centimes entiers (`x100`) et les quantités en milli-unités entières (`x1000`) avant toute opération,
puis reconvertis. Voir `tests/unit/money.test.js` pour la preuve que `0,1 + 0,2 === 0,3` avec cette
approche (contrairement à l'arithmétique flottante native de JavaScript).

## Bénéfice — pourquoi pas juste « argent entrant − argent sortant »

Un achat de stock non encore vendu ne doit pas réduire le bénéfice de la période : c'est un actif
(stock), pas une charge. Le backend distingue donc :

```
Chiffre d'affaires        = somme des ventes validées
Coût des marchandises vendues (CMV) = somme des purchasePrice figés au moment de chaque vente
Marge brute                = Chiffre d'affaires − CMV
Bénéfice estimé            = Marge brute − Dépenses de la période
```

Le prix d'achat est figé sur chaque ligne de vente (`sale.items[].purchasePrice`) au moment de la
transaction, avec un coût moyen pondéré mis à jour à chaque achat (`weightedAverageCost`). Ainsi le
bénéfice reste correct même si le prix d'achat change ensuite.

## Génération du rapport journalier

Un job planifié (`node-cron`, fuseau `Africa/Lubumbashi`, 23h55 chaque soir — voir `jobs/dailyReport.js`)
appelle `services/report.service.js#generateDailyReport` et archive le résultat dans
`daily_reports/{date}`. Alternative serverless recommandée en production : une Cloud Function
planifiée (Cloud Scheduler + Pub/Sub) appelant la même fonction, pour ne pas dépendre de la
disponibilité continue du process Node (utile en environnement conteneurisé avec redémarrages).
Un administrateur ou gestionnaire peut aussi déclencher `POST /api/reports/daily/generate` à la main.

## Dénormalisations documentées (cahier des charges §25)

- `suppliers.stats` (compteur d'achats, total acheté, payé, dette) est mis à jour en même temps que
  chaque achat, en centimes entiers, pour éviter de recalculer la somme de tous les achats à chaque
  affichage de la liste des fournisseurs.
- `products.purchasePrice` est le coût moyen pondéré courant (recalculé à chaque achat), utilisé pour
  valoriser le stock sans requête supplémentaire.
- `stock_movements` et `payments` dupliquent `productName` / `referenceNumber` pour un affichage
  direct sans jointure.

## Sécurité

- Helmet (en-têtes HTTP), CORS restreint à une liste blanche d'origines, rate limiting (connexion :
  15 tentatives / 15 min ; API générale : 1000 requêtes / 15 min par IP).
- Validation stricte de toutes les entrées avec Zod (`validators/index.js`), avant tout accès aux
  données.
- Aucun secret (clé de compte de service, clé API) n'est jamais envoyé au frontend.
- `firestore.rules` refuse tout accès direct depuis un client (le frontend ne s'authentifie même pas
  contre Firestore : uniquement contre l'API Identity Toolkit pour obtenir un jeton, relayé par le
  backend).
