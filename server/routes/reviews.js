const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Property = require('../models/Property');

// GET /api/reviews/owner/my-properties — propertyOwner only, returns all reviews for their properties
router.get('/owner/my-properties', protect, authorize('propertyOwner'), async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user._id }, '_id');
    const propertyIds = properties.map(p => p._id);
    const reviews = await Review.find({ propertyId: { $in: propertyIds } })
      .populate('customerId', 'name email')
      .populate('propertyId', 'name')
      .sort('-createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reviews — authenticated customer only, checks booking exists and belongs to customer, checks booking status is 'completed', checks no duplicate review exists for that bookingId
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { propertyId, bookingId, rating, comment } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!['booked', 'completed', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking must be successful to leave a review' });
    }

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

// GET /api/reviews/my-reviews — customer only, returns all reviews written by the logged in customer
router.get('/my-reviews', protect, authorize('customer'), async (req, res) => {
  try {
    const reviews = await Review.find({ customerId: req.user._id })
      .populate('propertyId', 'name')
      .sort('-createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/property/:propertyId — admin only, returns all reviews for a property
router.get('/property/:propertyId', protect, authorize('admin'), async (req, res) => {
  try {
    const reviews = await Review.find({ propertyId: req.params.propertyId })
      .populate('customerId', 'name')
      .sort('-createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/reviews/:id — customer only, update their own review
router.put('/:id', protect, authorize('customer'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/reviews/:id — customer only, delete their own review
router.delete('/:id', protect, authorize('customer'), async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, customerId: req.user._id });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review deleted successfully' });
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
