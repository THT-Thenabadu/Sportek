const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const EntryLog = require('../models/EntryLog');
const Property = require('../models/Property');

// GET /api/entry-logs/properties — get properties for security officer's associated owner
router.get('/properties', protect, authorize('securityOfficer'), async (req, res) => {
  try {
    if (!req.user.associatedOwner) {
      return res.status(400).json({ message: 'No associated property owner.' });
    }
    const properties = await Property.find({ ownerId: req.user.associatedOwner });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/entry-logs — get all entry logs for security officer's properties
router.get('/', protect, authorize('securityOfficer'), async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user.associatedOwner });
    const propertyIds = properties.map(p => p._id);

    const { search, type, date } = req.query;
    const filter = { propertyId: { $in: propertyIds } };

    if (type) filter.type = type;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      filter.entryDate = { $gte: start, $lte: end };
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { idNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await EntryLog.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/entry-logs — create a new entry log
router.post('/', protect, authorize('securityOfficer'), async (req, res) => {
  try {
    const { name, idNumber, entryTime, entryDate, type, venue, propertyId } = req.body;
    if (!name || !idNumber || !type || !venue || !propertyId) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const log = await EntryLog.create({
      name, idNumber, entryTime, entryDate, type, venue,
      propertyId, loggedBy: req.user._id,
    });
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/entry-logs/:id/exit — mark exit time
router.patch('/:id/exit', protect, authorize('securityOfficer'), async (req, res) => {
  try {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const exitTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const log = await EntryLog.findByIdAndUpdate(
      req.params.id,
      { exitTime },
      { new: true }
    );
    if (!log) return res.status(404).json({ message: 'Entry not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/entry-logs/:id
router.delete('/:id', protect, authorize('securityOfficer'), async (req, res) => {
  try {
    await EntryLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
