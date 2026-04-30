const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, institution } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      institution: institution || '',
      role: 'customer' // defaults to customer on signup
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      if (user.isBanned) {
        return res.status(403).json({ message: 'Your account has been banned' });
      }

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ban or unban user
// @route   PATCH /api/users/:id/ban
// @access  Private/Admin
const banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.isBanned = req.body.isBanned;
    await user.save();
    res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get security officer for property owner
// @route   GET /api/users/my-security-officer
// @access  Private/PropertyOwner
const getMySecurityOfficer = async (req, res) => {
  try {
    if (req.user.role !== 'propertyOwner') {
      return res.status(403).json({ message: 'Access denied. Property owners only.' });
    }

    // Find security officer associated with this property owner
    const securityOfficer = await User.findOne({
      role: 'securityOfficer',
      associatedOwner: req.user._id
    }).select('-passwordHash');

    if (!securityOfficer) {
      return res.status(404).json({ message: 'No security officer found for your account' });
    }

    res.json(securityOfficer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update security officer credentials
// @route   PUT /api/users/update-security-officer
// @access  Private/PropertyOwner
const updateSecurityOfficer = async (req, res) => {
  try {
    if (req.user.role !== 'propertyOwner') {
      return res.status(403).json({ message: 'Access denied. Property owners only.' });
    }

    const { email, password } = req.body;

    // Find security officer associated with this property owner
    const securityOfficer = await User.findOne({
      role: 'securityOfficer',
      associatedOwner: req.user._id
    });

    if (!securityOfficer) {
      return res.status(404).json({ message: 'No security officer found for your account' });
    }

    // Check if email is already taken by another user
    if (email && email !== securityOfficer.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: securityOfficer._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
      securityOfficer.email = email;
    }

    // Update password if provided
    if (password) {
      // Get the full property owner user with passwordHash to compare
      const propertyOwner = await User.findById(req.user._id);
      
      if (!propertyOwner || !propertyOwner.passwordHash) {
        return res.status(500).json({ message: 'Unable to verify password' });
      }

      // Check if new password is same as property owner's password
      const isSameAsOwnerPassword = await bcrypt.compare(password, propertyOwner.passwordHash);
      if (isSameAsOwnerPassword) {
        return res.status(400).json({ 
          message: 'Security officer password must be different from your property owner password' 
        });
      }

      const salt = await bcrypt.genSalt(10);
      securityOfficer.passwordHash = await bcrypt.hash(password, salt);
    }

    await securityOfficer.save();

    res.json({
      message: 'Security officer credentials updated successfully',
      securityOfficer: {
        _id: securityOfficer._id,
        name: securityOfficer.name,
        email: securityOfficer.email,
        role: securityOfficer.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  banUser,
  getMySecurityOfficer,
  updateSecurityOfficer
};
