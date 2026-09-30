# Référence API — Boucherie Mira-Mk

Base URL : `/api`. Toutes les réponses suivent le format :

```json
{ "success": true, "message": "…", "data": { } }
{ "success": false, "message": "…", "error": "…" }
```

Authentification : en-tête `Authorization: Bearer <idToken>` sur toutes les routes sauf
`POST /auth/login` et `POST /auth/refresh`.

## Auth
| Méthode | Route | Permission | Description |
|---|---|---|---|
| POST | `/auth/login` | publique | `{ email, password }` → jetons + profil |
| POST | `/auth/refresh` | publique | `{ refreshToken }` → nouveau jeton |
| GET | `/auth/me` | authentifié | Profil courant + permissions |
| POST | `/auth/logout` | authentifié | Révoque les jetons, journalise LOGOUT |

## Utilisateurs (`users:manage`)
`GET /users`, `GET /users/roles`, `POST /users`, `GET /users/:id`, `PUT /users/:id`,
`POST /users/:id/reset-password`

## Catalogue
`GET/POST /categories`, `GET/PUT /categories/:id`, `DELETE /categories/:id` (archive)
`GET/POST /suppliers`, `GET/PUT /suppliers/:id`, `DELETE /suppliers/:id` (archive)
`GET/POST /products`, `GET/PUT /products/:id`, `DELETE /products/:id` (archive)

## Stock
`GET /stock` — état + valeur (valeur masquée sans `costs:read`)
`GET /stock/movements?productId=&type=&from=&to=&cursor=&limit=`
`POST /stock/adjust` — `{ productId, delta, reason }`

## Achats
`GET /purchases`, `POST /purchases`, `GET /purchases/:id`
`POST /purchases/:id/payments` — `{ payment: { method, currency, amount } }`
`POST /purchases/:id/cancel` — `{ reason }`

## Ventes & factures
`GET /sales`, `POST /sales`, `GET /sales/:id`
`POST /sales/:id/payments`, `POST /sales/:id/cancel`
`GET /invoices`, `GET /invoices/:id` → `{ invoice, company }`

## Dépenses
`GET /expenses`, `POST /expenses`, `GET /expenses/:id`, `POST /expenses/:id/cancel`

## Inventaire & pertes
`GET/POST /inventory`, `GET /inventory/:id`, `POST /inventory/:id/validate`, `POST /inventory/:id/reject`
`GET/POST /losses`, `GET /losses/:id`, `POST /losses/:id/validate`, `POST /losses/:id/reject`

## Rapports, alertes, audit
`GET /reports/dashboard`
`GET /reports/daily?date=AAAA-MM-JJ`
`GET /reports/summary?period=day|week|month|year|custom&from=&to=`
`GET /reports/export?...` → fichier CSV (Excel)
`POST /reports/daily/generate` — archive le rapport du jour
`GET /reports/history`
`GET /alerts?status=ACTIVE|RESOLVED`, `POST /alerts/:id/acknowledge`
`GET /audit?userId=&module=&action=&from=&to=` (lecture seule)

## Paramètres
`GET /settings` (tous rôles authentifiés), `PUT /settings` (`settings:write`)

Toutes les listes paginées acceptent `?limit=` (défaut 20, max 100) et `?cursor=` (id du dernier
document reçu, renvoyé sous `nextCursor`).
