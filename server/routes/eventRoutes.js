const express = require('express');
const router = express.Router();
const { createEvent, getEvents, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getEvents)
  .post(protect, authorize('admin', 'superAdmin'), createEvent);

router.route('/:id')
  .put(protect, authorize('admin', 'superAdmin'), updateEvent)
  .delete(protect, authorize('admin', 'superAdmin'), deleteEvent);

module.exports = router;
