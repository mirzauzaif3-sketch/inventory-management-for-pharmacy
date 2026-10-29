const router = require('express').Router();
const ctrl = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, authorize('admin', 'pharmacist'), ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'pharmacist'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.delete);

module.exports = router;
