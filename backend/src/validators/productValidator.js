const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(2, 'Le nom du produit est requis.'),
  category: z.string().min(2, 'La catégorie est requise.'),
  unit: z.enum(['kg', 'g', 'piece', 'carton']).default('kg'),
  purchasePrice: z.number().nonnegative('Le prix d\'achat doit être positif.'),
  salePrice: z.number().nonnegative('Le prix de vente doit être positif.'),
  minStockThreshold: z.number().nonnegative().default(5),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().default(true),
});

const updateProductSchema = createProductSchema.partial();

module.exports = { createProductSchema, updateProductSchema };
