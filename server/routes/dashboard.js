const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, ctrl.getStats);
router.get('/recent-sales', authenticate, ctrl.getRecentSales);
router.get('/low-stock', authenticate, ctrl.getLowStockMedicines);
router.get('/recent-medicines', authenticate, ctrl.getRecentMedicines);
router.get('/stock-overview', authenticate, ctrl.getStockOverview);

module.exports = router;
