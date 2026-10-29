const router = require('express').Router();
const ctrl = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/add', authenticate, authorize('admin', 'pharmacist'), ctrl.addStock);
router.put('/update', authenticate, authorize('admin', 'pharmacist'), ctrl.updateStock);
router.get('/movements', authenticate, ctrl.getMovements);
router.get('/batches', authenticate, ctrl.getBatches);
router.get('/expiring', authenticate, ctrl.getExpiring);
router.get('/expired', authenticate, ctrl.getExpired);

module.exports = router;
