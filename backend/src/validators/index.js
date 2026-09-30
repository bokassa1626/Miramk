'use strict';
const { z } = require('zod');
const { ROLES, EXPENSE_CATEGORIES, LOSS_TYPES, PAYMENT_METHODS, UNITS } = require('../config/defaults');

const id = z.string().trim().min(1).max(128);
const text = (max = 200) => z.string().trim().max(max);
const reason = z.string().trim().min(3, 'Un motif (3 caractères minimum) est obligatoire').max(500);

/** Quantité : > 0, 3 décimales maximum (ex. 1,250 kg) */
const quantity = z.number({ invalid_type_error: 'Quantité invalide' }).positive('La quantité doit être positive').max(1e6)
  .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6, '3 décimales maximum');
/** Montant : >= 0, 2 décimales maximum */
const money = z.number({ invalid_type_error: 'Montant invalide' }).min(0, 'Le montant ne peut pas être négatif').max(1e12)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, '2 décimales maximum');
const positiveMoney = money.refine((v) => v > 0, 'Le montant doit être supérieur à zéro');

const payment = z.object({
  method: z.enum(PAYMENT_METHODS).default('CASH'),
  currency: z.enum(['CDF', 'USD']).default('CDF'),
  amount: positiveMoney,
});

/* ---------------- Auth ---------------- */
const login = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
const refresh = z.object({ refreshToken: z.string().min(10) });

/* ---------------- Utilisateurs ---------------- */
const roleEnum = z.enum(Object.values(ROLES));
const userCreate = z.object({
  firstName: text(80).min(1), lastName: text(80).min(1),
  email: z.string().trim().toLowerCase().email(),
  phone: text(30).optional().default(''),
  role: roleEnum,
  password: z.string().min(8, '8 caractères minimum').max(128),
});
const userUpdate = z.object({
  firstName: text(80).min(1).optional(), lastName: text(80).min(1).optional(),
  phone: text(30).optional(), role: roleEnum.optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).refine((o) => Object.keys(o).length > 0, 'Aucune donnée à modifier');
const passwordReset = z.object({ password: z.string().min(8).max(128) });

/* ---------------- Catalogue ---------------- */
const categoryCreate = z.object({ name: text(80).min(2), description: text(300).optional().default('') });
const categoryUpdate = categoryCreate.partial();

const supplierCreate = z.object({
  name: text(120).min(2),
  phone: text(30).optional().default(''),
  email: z.union([z.string().trim().email(), z.literal('')]).optional().default(''),
  address: text(250).optional().default(''),
  contactPerson: text(120).optional().default(''),
});
const supplierUpdate = supplierCreate.partial();

const productBase = {
  code: text(30).optional(),
  name: text(120).min(2),
  categoryId: id,
  unit: z.enum(UNITS),
  purchasePrice: money,
  sellingPrice: money,
  minimumStock: z.number().min(0).max(1e6).optional(),
  supplierId: id.nullable().optional(),
};
const productCreate = z.object({ ...productBase, initialStock: z.number().min(0).max(1e6).optional().default(0) });
const productUpdate = z.object(productBase).partial().refine((o) => Object.keys(o).length > 0, 'Aucune donnée à modifier');

/* ---------------- Opérations ---------------- */
const purchaseCreate = z.object({
  supplierId: id,
  items: z.array(z.object({ productId: id, quantity, unitPrice: money })).min(1, 'Ajoutez au moins un produit').max(100),
  discount: money.optional().default(0),
  payment: payment.optional(),
  note: text(500).optional(),
});
const saleCreate = z.object({
  customerName: text(120).optional(),
  items: z.array(z.object({ productId: id, quantity, unitPrice: money.optional() })).min(1, 'Ajoutez au moins un produit').max(100),
  discount: money.optional().default(0),
  payment: payment.optional(),
  note: text(500).optional(),
});
const cancel = z.object({ reason });
const paymentBody = z.object({ payment });
const stockAdjust = z.object({
  productId: id,
  delta: z.number().refine((v) => v !== 0, 'La variation ne peut pas être nulle').refine((v) => Math.abs(v) <= 1e6),
  reason,
});
const expenseCreate = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: text(300).min(2),
  amount: positiveMoney,
  currency: z.enum(['CDF', 'USD']).default('CDF'),
  paymentMethod: z.enum(PAYMENT_METHODS).default('CASH'),
  reference: text(80).optional(),
  receipt: text(500).optional(),
});
const lossCreate = z.object({ productId: id, quantity, lossType: z.enum(LOSS_TYPES), reason });
const inventoryCreate = z.object({
  note: text(500).optional(),
  items: z.array(z.object({ productId: id, physicalStock: z.number().min(0).max(1e6), reason: text(300).optional() })).min(1).max(500),
});

const settingsUpdate = z.object({
  companyName: text(120).min(2), address: text(250), phone: text(100), email: z.union([z.string().trim().email(), z.literal('')]),
  logo: text(500), currency: z.enum(['CDF', 'USD']), invoicePrefix: text(10).min(1),
  salePrefix: text(10).min(1), purchasePrefix: text(10).min(1),
  defaultStockThreshold: z.number().min(0).max(1e6),
  exchangeRateUSD: z.number().positive().max(1e6),
  lossApprovalThreshold: money,
}).partial().refine((o) => Object.keys(o).length > 0, 'Aucune donnée à modifier');

module.exports = {
  login, refresh, userCreate, userUpdate, passwordReset,
  categoryCreate, categoryUpdate, supplierCreate, supplierUpdate, productCreate, productUpdate,
  purchaseCreate, saleCreate, cancel, paymentBody, stockAdjust, expenseCreate, lossCreate, inventoryCreate, settingsUpdate,
};
