const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createProductSchema, updateProductSchema } = require('../validators/productValidator');

router.use(authMiddleware);

router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.post('/', roleMiddleware('ADMIN', 'MANAGER'), validate(createProductSchema), productController.createProduct);
router.put('/:id', roleMiddleware('ADMIN', 'MANAGER'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', roleMiddleware('ADMIN', 'MANAGER'), productController.deleteProduct);

module.exports = router;
