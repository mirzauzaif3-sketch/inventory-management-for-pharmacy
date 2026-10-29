const router = require('express').Router();
const ctrl = require('../controllers/medicineController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/search', authenticate, ctrl.search);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, authorize('admin', 'pharmacist'), ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'pharmacist'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin', 'pharmacist'), ctrl.delete);

module.exports = router;
