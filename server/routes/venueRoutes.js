const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');
const { protect, authorize } = require('../middleware/auth');

// GET all venues
router.get('/', async (req, res) => {
  try {
    const venues = await Venue.find().sort('-createdAt');
    res.json(venues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single venue
router.get('/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create venue (admin only)
router.post('/', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const venue = await Venue.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(venue);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update venue (admin only)
router.put('/:id', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json(venue);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE venue (admin only)
router.delete('/:id', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const venue = await Venue.findByIdAndDelete(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
