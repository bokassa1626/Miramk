const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createExpenseSchema, updateExpenseSchema } = require('../validators/expenseValidator');

router.use(authMiddleware, roleMiddleware('ADMIN', 'MANAGER'));

router.get('/', expenseController.listExpenses);
router.post('/', validate(createExpenseSchema), expenseController.createExpense);
router.put('/:id', validate(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
