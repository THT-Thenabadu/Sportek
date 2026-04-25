const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, getAllUsers, banUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/', protect, authorize('admin'), getAllUsers);
router.patch('/:id/ban', protect, authorize('admin'), banUser);

module.exports = router;
