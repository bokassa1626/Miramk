const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createSaleSchema } = require('../validators/saleValidator');

router.use(authMiddleware);

// Ventes et factures accessibles à ADMIN, MANAGER et CASHIER
router.get('/', roleMiddleware('ADMIN', 'MANAGER', 'CASHIER'), saleController.listSales);
router.get('/:id', roleMiddleware('ADMIN', 'MANAGER', 'CASHIER'), saleController.getSale);
router.post(
  '/',
  roleMiddleware('ADMIN', 'MANAGER', 'CASHIER'),
  validate(createSaleSchema),
  saleController.createSale
);

module.exports = router;
