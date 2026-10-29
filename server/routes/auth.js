const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, ctrl.updateProfile);
router.get('/users', authenticate, authorize('admin'), ctrl.getUsers);
router.post('/users', authenticate, authorize('admin'), ctrl.createUser);
router.put('/users/:id', authenticate, authorize('admin'), ctrl.updateUser);

module.exports = router;
