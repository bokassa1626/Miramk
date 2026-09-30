const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createPurchaseSchema, updatePurchaseSchema } = require('../validators/purchaseValidator');

router.use(authMiddleware, roleMiddleware('ADMIN', 'MANAGER'));

router.get('/', purchaseController.listPurchases);
router.get('/:id', purchaseController.getPurchase);
router.post('/', validate(createPurchaseSchema), purchaseController.createPurchase);
router.put('/:id', validate(updatePurchaseSchema), purchaseController.updatePurchase);

module.exports = router;
