const { z } = require('zod');

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  newQuantity: z.number().nonnegative('La quantité ne peut pas être négative.'),
  reason: z.string().min(2, 'La raison de l\'ajustement est requise.'),
});

const inventoryItemSchema = z.object({
  productId: z.string().min(1),
  physicalQuantity: z.number().nonnegative(),
});

const inventorySchema = z.object({
  items: z.array(inventoryItemSchema).min(1, 'L\'inventaire doit contenir au moins un produit.'),
  notes: z.string().optional(),
});

module.exports = { stockAdjustmentSchema, inventorySchema };
