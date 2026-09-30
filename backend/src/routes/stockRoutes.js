const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { stockAdjustmentSchema, inventorySchema } = require('../validators/stockValidator');

router.use(authMiddleware);

router.get('/', stockController.listStock);
router.get('/movements', stockController.listMovements);
router.get('/:productId', stockController.getStockForProduct);
router.post(
  '/adjustment',
  roleMiddleware('ADMIN', 'MANAGER'),
  validate(stockAdjustmentSchema),
  stockController.createAdjustment
);
router.post(
  '/inventory',
  roleMiddleware('ADMIN', 'MANAGER'),
  validate(inventorySchema),
  stockController.createInventory
);

module.exports = router;
