const router = require('express').Router();
const ctrl = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, authorize('admin', 'pharmacist'), ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'pharmacist'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.delete);

module.exports = router;
