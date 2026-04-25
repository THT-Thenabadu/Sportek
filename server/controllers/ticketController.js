const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Initialize Ticket Purchase (Stripe PaymentIntent)
// @route   POST /api/tickets/purchase
// @access  Private
const purchaseTicketIntent = async (req, res) => {
  try {
    const { eventId, tier } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const selectedTier = event.ticketTiers.find(t => t.tier === tier);
    if (!selectedTier) return res.status(400).json({ message: 'Invalid ticket tier' });

    if (selectedTier.soldQuantity >= selectedTier.totalQuantity) {
      return res.status(400).json({ message: 'Tickets sold out for this tier' });
    }

    // Instead of locking, we'll just create the Intent and rely on webhook success
    // to actually create the Ticket & decrement quantity. Alternatively, we create pending ticket.
    // For simplicity, we just create the intent with metadata.

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(selectedTier.price * 100),
      currency: 'usd',
      metadata: {
        type: 'ticket_purchase',
        eventId: event._id.toString(),
        tier,
        customerId: req.user._id.toString()
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Stripe Webhook handler for Tickets (can be combined with bookings webhook in a real scenario, but keeping modular here)
// @route   POST /api/tickets/webhook
// @access  Public
const ticketWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_TICKET_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const paymentIntent = stripeEvent.data.object;
    
    // Check if metadata type is ticket
    if (paymentIntent.metadata.type === 'ticket_purchase') {
      const { eventId, tier, customerId } = paymentIntent.metadata;

      const event = await Event.findById(eventId);
      const selectedTier = event.ticketTiers.find(t => t.tier === tier);

      // Create ticket
      const ticket = await Ticket.create({
        eventId,
        customerId,
        tier,
        price: selectedTier.price,
        stripePaymentIntentId: paymentIntent.id,
        status: 'active'
      });

      // Generate QR Code data
      ticket.qrCodeData = JSON.stringify({
        ticketId: ticket._id,
        eventId: event._id,
        customerId: customerId,
        tier: tier
      });
      await ticket.save();

      // Decrement quantity
      await Event.updateOne(
        { _id: eventId, 'ticketTiers.tier': tier },
        { $inc: { 'ticketTiers.$.soldQuantity': 1 } }
      );
    }
  }

  res.json({ received: true });
};

// @desc    Get user's purchased tickets
// @route   GET /api/tickets/my-tickets
// @access  Private
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ customerId: req.user._id })
      .populate('eventId', 'name date time location bannerImage ticketTiers')
      .sort('-createdAt');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { purchaseTicketIntent, ticketWebhook, getMyTickets };
