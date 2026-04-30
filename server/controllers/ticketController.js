const Event  = require('../models/Event');
const Ticket = require('../models/Ticket');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { unlockAllForUser } = require('../services/seatLockService');

// Helper: recompute soldQuantity for all categories from paid tickets
const syncSoldQuantity = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event || !event.ticketCategories?.length) return;

    // Count only paid tickets
    const tickets = await Ticket.find({
      eventId,
      paymentStatus: 'paid',
      status: { $in: ['active', 'used'] },
    });

    const countMap = {};
    tickets.forEach(t => {
      const cat = t.category || t.tier;
      countMap[cat] = (countMap[cat] || 0) + (t.quantity || 1);
    });

    const updates = {};
    event.ticketCategories.forEach((cat, i) => {
      updates[`ticketCategories.${i}.soldQuantity`] = countMap[cat.name] || 0;
    });

    await Event.updateOne({ _id: eventId }, { $set: updates });
  } catch (err) {
    console.error('[syncSoldQuantity] error:', err.message);
  }
};

// @desc    Purchase ticket
// @route   POST /api/tickets/purchase
// @access  Private
const purchaseTicketIntent = async (req, res) => {
  try {
    const { eventId, category, tier, seats } = req.body;
    const categoryName  = category || tier;
    const selectedSeats = seats || [];
    const qty           = selectedSeats.length > 0 ? selectedSeats.length : 1;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status === 'expired') return res.status(400).json({ message: 'This event has expired' });

    const cats   = event.ticketCategories || [];
    const catIdx = cats.findIndex(c => c.name === categoryName);

    let price;
    if (catIdx !== -1) {
      const cat      = cats[catIdx];
      price          = cat.price;
      const totalQty = cat.totalQuantity || 0;

      // Count only PAID tickets for availability check
      const paidCount = await Ticket.countDocuments({
        eventId,
        category: categoryName,
        paymentStatus: 'paid',
        status: { $in: ['active', 'used'] },
      });

      if (totalQty > 0 && paidCount + qty > totalQty) {
        return res.status(400).json({ message: 'Not enough tickets available' });
      }
    } else {
      const legacyTier = (event.ticketTiers || []).find(t => t.tier === categoryName);
      if (!legacyTier) return res.status(400).json({ message: 'Invalid ticket category' });
      price = legacyTier.price;
    }

    const totalAmount = price * qty;

    // Create ticket immediately with pending status
    const ticket = await Ticket.create({
      eventId:       event._id,
      customerId:    req.user._id,
      category:      categoryName,
      tier:          categoryName,
      price,
      quantity:      qty,
      seats:         selectedSeats,
      paymentStatus: 'pending',
      status:        'active',
    });

    ticket.qrCodeData = JSON.stringify({
      ticketId:   ticket._id,
      eventId:    event._id,
      category:   categoryName,
      seats:      selectedSeats.map(s => s.seatId),
      customerId: req.user._id,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'lkr',
      metadata: {
        type: 'ticket_purchase',
        ticketId: ticket._id.toString(),
        eventId: event._id.toString(),
        customerId: req.user._id.toString(),
      },
    });

    ticket.stripePaymentIntentId = paymentIntent.id;
    await ticket.save();

    // Release seat locks — seats are now recorded in DB
    unlockAllForUser(eventId, req.user._id.toString());

    res.json({ ticketId: ticket._id, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confirm payment for a ticket (called after UI payment form)
// @route   PATCH /api/tickets/:id/confirm-payment
// @access  Private
const confirmPayment = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      customerId: req.user._id,
    });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.paymentStatus === 'paid') return res.json(ticket); // already paid

    ticket.paymentStatus = 'paid';
    await ticket.save();

    // Sync soldQuantity from actual paid tickets
    await syncSoldQuantity(ticket.eventId.toString());

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Webhook — mark ticket as paid
// @route   POST /api/tickets/webhook
const ticketWebhook = async (req, res) => {
  const sig             = req.headers['stripe-signature'];
  const endpointSecret  = process.env.STRIPE_TICKET_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const pi = stripeEvent.data.object;
    if (pi.metadata?.type === 'ticket_purchase') {
      const ticket = await Ticket.findOneAndUpdate(
        { stripePaymentIntentId: pi.id },
        { paymentStatus: 'paid' },
        { new: true }
      );
      if (ticket) await syncSoldQuantity(ticket.eventId.toString());
    }
  }

  res.json({ received: true });
};

// @desc    Get user's purchased tickets
// @route   GET /api/tickets/my-tickets
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ customerId: req.user._id })
      .populate('eventId', 'name date time location bannerImage ticketCategories ticketTiers')
      .sort('-createdAt');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { purchaseTicketIntent, confirmPayment, ticketWebhook, getMyTickets, syncSoldQuantity };
