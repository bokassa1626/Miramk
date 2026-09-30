const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware, roleMiddleware('ADMIN', 'MANAGER'));

router.get('/daily', reportController.daily);
router.get('/sales', reportController.sales);
router.get('/purchases', reportController.purchases);
router.get('/expenses', reportController.expenses);
router.get('/profit', reportController.profit);
router.get('/stock', reportController.stock);

module.exports = router;
