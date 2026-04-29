const express = require('express');
const router = express.Router();
const { createEvent, getEvents, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getEvents)
  .post(protect, authorize('admin', 'superAdmin'), createEvent);

router.route('/:id')
  .get(async (req, res) => {
    try {
      const Event = require('../models/Event');
      const event = await Event.findById(req.params.id).populate('venueId', 'name city address seatRows');
      if (!event) return res.status(404).json({ message: 'Event not found' });
      res.json(event);
    } catch (err) { res.status(500).json({ message: err.message }); }
  })
  .put(protect, authorize('admin', 'superAdmin'), updateEvent)
  .delete(protect, authorize('admin', 'superAdmin'), deleteEvent);

module.exports = router;
