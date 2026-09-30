const { z } = require('zod');

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('La quantité doit être supérieure à 0.'),
  unitCost: z.number().nonnegative('Le coût unitaire doit être positif.'),
});

const createPurchaseSchema = z.object({
  supplierName: z.string().min(2, 'Le nom du fournisseur est requis.'),
  items: z.array(purchaseItemSchema).min(1, 'Un achat doit contenir au moins un article.'),
  notes: z.string().optional(),
});

const updatePurchaseSchema = z.object({
  status: z.enum(['pending', 'received', 'cancelled']).optional(),
  notes: z.string().optional(),
});

module.exports = { createPurchaseSchema, updatePurchaseSchema };
