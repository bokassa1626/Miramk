const { z } = require('zod');

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('La quantité doit être supérieure à 0.'),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Une vente doit contenir au moins un article.'),
  customerName: z.string().optional().default('Client comptant'),
  paymentMethod: z.enum(['cash', 'mobile_money', 'card', 'credit']).default('cash'),
  notes: z.string().optional(),
});

module.exports = { createSaleSchema };
