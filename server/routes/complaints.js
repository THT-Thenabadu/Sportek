const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const Warning = require('../models/Warning');

// POST /api/complaints — authenticated customer only
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { propertyId, subject, description } = req.body;
    const complaint = await Complaint.create({
      propertyId,
      customerId: req.user._id,
      subject,
      description
    });
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-complaints', protect, authorize('customer'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ customerId: req.user._id })
      .populate('propertyId', 'name')
      .sort('-createdAt');
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/complaints — admin only, all complaints populated with customer name, property name, sorted by createdAt desc
router.get('/', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const complaints = await Complaint.find({})
      .populate('customerId', 'name')
      .populate('propertyId', 'name ownerId')
      .sort('-createdAt');
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/complaints/:id/status — admin or propertyOwner, updates status and optional adminNote
router.patch('/:id/status', protect, authorize('admin', 'superAdmin', 'propertyOwner'), async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const updateData = { status };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (status === 'resolved' || status === 'dismissed') updateData.resolvedAt = new Date();
    
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/complaints/:id/warn — admin only, creates a Warning document for the property owner, sets complaint status to 'under_review'
router.post('/:id/warn', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const { message } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('propertyId');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (!complaint.propertyId) return res.status(404).json({ message: 'Linked property not found' });

    console.log('Complaint property:', complaint.propertyId);
    console.log('Owner ID found:', complaint.propertyId?.ownerId);

    const warning = await Warning.create({
      ownerId: complaint.propertyId.ownerId,
      complaintId: complaint._id,
      message
    });

    console.log('Warning created for owner:', warning.ownerId);

    complaint.status = 'under_review';
    await complaint.save();

    res.status(201).json({ warning, complaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
