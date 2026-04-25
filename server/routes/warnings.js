const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Warning = require('../models/Warning');

// GET /api/warnings/my-warnings — propertyOwner only, returns their warnings sorted newest first
router.get('/my-warnings', protect, authorize('propertyOwner'), async (req, res) => {
  try {
    const warnings = await Warning.find({ ownerId: req.user._id })
      .populate('complaintId', '_id status description')
      .sort('-createdAt');
    res.json(warnings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/warnings/:id/read — propertyOwner only, marks warning as read
router.patch('/:id/read', protect, authorize('propertyOwner'), async (req, res) => {
  try {
    const warning = await Warning.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!warning) return res.status(404).json({ message: 'Warning not found' });
    res.json(warning);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
