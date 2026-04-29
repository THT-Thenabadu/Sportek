const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  getAllUsers, 
  banUser,
  getMySecurityOfficer,
  updateSecurityOfficer
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/', protect, authorize('admin'), getAllUsers);
router.patch('/:id/ban', protect, authorize('admin'), banUser);

// Security officer management routes
router.get('/my-security-officer', protect, authorize('propertyOwner'), getMySecurityOfficer);
router.put('/update-security-officer', protect, authorize('propertyOwner'), updateSecurityOfficer);

module.exports = router;
