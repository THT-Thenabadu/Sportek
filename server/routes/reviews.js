const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Review = require('../models/Review');
const Booking = require('../models/Booking');

// POST /api/reviews — authenticated customer only, checks booking exists and belongs to customer, checks booking status is 'completed', checks no duplicate review exists for that bookingId
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { propertyId, bookingId, rating, comment } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'completed') return res.status(400).json({ message: 'Booking must be completed to leave a review' });

    const existing = await Review.findOne({ propertyId, customerId: req.user._id, bookingId });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this booking' });

    const review = await Review.create({
      propertyId,
      customerId: req.user._id,
      bookingId,
      rating,
      comment
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/property/:propertyId — public, returns all reviews for a property populated with customer name, sorted newest first
router.get('/property/:propertyId', async (req, res) => {
  try {
    const reviews = await Review.find({ propertyId: req.params.propertyId })
      .populate('customerId', 'name')
      .sort('-createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/admin — admin only, returns all reviews across all properties with property name and customer name
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('propertyId', 'name')
      .populate('customerId', 'name')
      .sort('-createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
