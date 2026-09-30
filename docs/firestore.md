# Structure Firestore — Boucherie Mira-Mk

## Collections

| Collection            | Rôle                                                                 |
|------------------------|-----------------------------------------------------------------------|
| `users`                | Profil métier (rôle, statut) ; les mots de passe vivent uniquement dans Firebase Authentication |
| `roles`                | Miroir informatif de `config/permissions.js` (utile pour audit/debug) |
| `categories`           | Catégories de produits (Bœuf, Porc, Chèvre, Volaille, Abats…)        |
| `products`             | Fiche produit + `currentStock` (source de vérité du stock)           |
| `suppliers`            | Fournisseurs + `stats` dénormalisées (achats, dette)                  |
| `purchases`            | Achats validés/annulés, lignes figées                                 |
| `sales`                | Ventes validées/annulées, lignes figées (prix de vente ET d'achat)    |
| `expenses`             | Dépenses (catégorisées), toujours en CDF                              |
| `stock_movements`      | Journal **append-only** de tout mouvement de stock                    |
| `inventory_sessions`   | Comptages physiques, écarts, statut (PENDING/VALIDATED/REJECTED)      |
| `losses`               | Pertes déclarées, avec circuit de validation si montant/type sensible |
| `payments`             | Encaissements/décaissements (ventes, achats, remboursements)          |
| `alerts`               | Alertes de stock actives/résolues (une par produit : `stock_{id}`)    |
| `daily_reports`        | Rapports journaliers archivés (`{date}` en clé de document)           |
| `audit_logs`           | Journal d'audit **append-only**, jamais modifié ni supprimé           |
| `settings`             | `company` (paramètres) et `counters` (numérotation séquentielle)      |

## Relations logiques

```
categories 1───* products *───1 suppliers
products   1───* stock_movements
products   1───* sale.items[] (référence dénormalisée : productName, unit figés)
products   1───* purchase.items[]
sales      1───1 payments (par paiement)      purchases 1───1 payments (par paiement)
sales/purchases/losses/inventory  ──> audit_logs (une entrée par opération critique)
products   1───1 alerts (document alerts/stock_{productId})
```

Les lignes de vente/achat (`items[]`) sont **dénormalisées** (nom produit, unité, prix figés au
moment de la transaction) : modifier un produit plus tard ne doit jamais réécrire l'historique.

## Numérotation séquentielle

`settings/counters` contient un compteur par type de document (`product`, `sale`, `invoice`,
`purchase`, `inventory`). `services/settings.service.js#loadSequences` lit ce document **dans la
transaction** et incrémente en mémoire avant de committer, garantissant l'absence de doublons même
avec des écritures concurrentes (Firestore réessaie automatiquement la transaction en cas de conflit).

## Index composites requis

Voir `firebase/firestore.indexes.json`. Ils couvrent les requêtes combinant un filtre d'égalité
(statut, catégorie, produit…) et un tri par `createdAt` — nécessaires dès qu'une liste combine un
filtre avec la pagination par défaut. Déployer avec :

```
firebase deploy --only firestore:indexes --project <votre-projet>
```

## Règles de sécurité Firestore

`firebase/firestore.rules` refuse tout accès (`if false`). C'est volontaire : l'application n'a
**aucun** client Firebase (mobile ou web) qui se connecte directement à Firestore ou à Firebase
Authentication pour lire/écrire des données. Le frontend passe uniquement par l'API REST du backend
Node.js.
