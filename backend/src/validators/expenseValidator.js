const { z } = require('zod');

const createExpenseSchema = z.object({
  category: z.string().min(2, 'La catégorie de dépense est requise.'),
  description: z.string().min(2, 'La description est requise.'),
  amount: z.number().positive('Le montant doit être supérieur à 0.'),
  date: z.string().optional(), // ISO date; défaut = maintenant côté service
  receiptUrl: z.string().url().optional().nullable(),
});

const updateExpenseSchema = createExpenseSchema.partial();

module.exports = { createExpenseSchema, updateExpenseSchema };
