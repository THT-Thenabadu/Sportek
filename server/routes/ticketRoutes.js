const express = require('express');
const router  = express.Router();
const { purchaseTicketIntent, confirmPayment, ticketWebhook, getMyTickets } = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');
const expressBodyParser = require('express');

router.post('/purchase',      protect, purchaseTicketIntent);
router.patch('/:id/confirm-payment', protect, confirmPayment);
router.get('/my-tickets',     protect, getMyTickets);

// Admin: all tickets with full details
router.get('/admin/all', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const Ticket = require('../models/Ticket');
    const tickets = await Ticket.find({})
      .populate('customerId', 'name email')
      .populate('eventId',    'name date time location status')
      .sort('-createdAt');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get live inventory (computed from paid tickets, not cached soldQuantity)
router.get('/admin/inventory/:eventId', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const Ticket = require('../models/Ticket');
    const Event  = require('../models/Event');
    const { syncSoldQuantity } = require('../controllers/ticketController');

    await syncSoldQuantity(req.params.eventId);
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event.ticketCategories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/webhook', expressBodyParser.raw({ type: 'application/json' }), ticketWebhook);

module.exports = router;
