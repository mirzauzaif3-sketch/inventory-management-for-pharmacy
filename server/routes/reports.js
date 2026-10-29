const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/daily-sales', authenticate, ctrl.dailySales);
router.get('/sales-period', authenticate, ctrl.salesByPeriod);
router.get('/stock', authenticate, ctrl.stockReport);
router.get('/low-stock', authenticate, ctrl.lowStockReport);
router.get('/expiry', authenticate, ctrl.expiryReport);
router.get('/valuation', authenticate, ctrl.inventoryValuation);
router.get('/top-selling', authenticate, ctrl.topSellingMedicines);

module.exports = router;
