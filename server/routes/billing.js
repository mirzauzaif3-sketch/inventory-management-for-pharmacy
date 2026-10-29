const router = require('express').Router();
const ctrl = require('../controllers/billingController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/sale', authenticate, authorize('admin', 'pharmacist', 'cashier'), ctrl.createSale);
router.get('/sales', authenticate, ctrl.getSales);
router.get('/sales/:id', authenticate, ctrl.getSaleById);

module.exports = router;
