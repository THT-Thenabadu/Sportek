const express = require('express');
const router = express.Router();
const { purchaseTicketIntent, ticketWebhook, getMyTickets } = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');
const expressBodyParser = require('express');

router.route('/purchase')
  .post(protect, purchaseTicketIntent);

router.route('/my-tickets')
  .get(protect, getMyTickets);

router.post('/webhook', expressBodyParser.raw({type: 'application/json'}), ticketWebhook);

module.exports = router;
