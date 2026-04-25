const Property = require('../models/Property');
const Booking = require('../models/Booking');
const { getLockedSlotsForProperty, isSlotLocked, lockedSlots } = require('../services/lockService');
const { parse, addMinutes, isAfter, format, isSameDay } = require('date-fns');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper to generate slots
const generateSlots = (startStr, endStr, durationMins) => {
  const slots = [];
  const fakeDate = new Date(); // Only used for time calculation
  let current = parse(startStr, 'HH:mm', fakeDate);
  const end = parse(endStr, 'HH:mm', fakeDate);

  while (!isAfter(current, end)) {
    const next = addMinutes(current, durationMins);
    if (isAfter(next, end)) break;

    slots.push({
      start: format(current, 'HH:mm'),
      end: format(next, 'HH:mm')
    });
    current = next;
  }
  return slots;
};

// @desc    Get available time slots for a property on a given date (default today)
// @route   GET /api/bookings/slots/:propertyId
// @access  Public
const getAvailableSlots = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;

    // Requirements: "customers can only book for the current day"
    // Though for general fetching we can accept a date, we'll enforce today logic.
    let targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (!isSameDay(targetDate, todayDate)) {
      return res.status(400).json({ message: 'Bookings are only allowed for the current day' });
    }

    const dateString = targetDate.toISOString().split('T')[0];

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Generate all theoretical slots
    const allSlots = generateSlots(
      property.availableHours.start,
      property.availableHours.end,
      property.slotDurationMinutes
    );

    // Fetch existing DB bookings for the date
    const existingBookings = await Booking.find({
      propertyId,
      date: targetDate,
      status: { $in: ['booked', 'completed'] }
    });
    const bookedStarts = existingBookings.map(b => b.timeSlot.start);

    // Fetch locked slots from in-memory map
    const lockedSlots = getLockedSlotsForProperty(propertyId, dateString);
    // mapped to objects for easy lookup
    const lockedStarts = {};
    lockedSlots.forEach(lock => {
      // split key: propertyId_date_timeSlotStart
      const parts = lock.slotKey.split('_');
      const start = parts[2];
      lockedStarts[start] = lock;
    });

    const payload = allSlots.map(slot => {
      let state = 'Available';
      let lockData = null;

      if (bookedStarts.includes(slot.start)) {
        state = 'Booked';
      } else if (lockedStarts[slot.start]) {
        state = 'Pending';
        lockData = lockedStarts[slot.start];
      }

      return {
        ...slot,
        state,
        lockedBy: lockData ? lockData.userId : null,
        lockExpiresAt: lockData ? lockData.expiresAt : null
      };
    });

    res.json({ date: targetDate, propertyId, slots: payload });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Stripe PaymentIntent for a pending booking
// @route   POST /api/bookings/create-payment-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
  try {
    const { propertyId, date, timeSlotStart, timeSlotEnd, selectedAssets } = req.body;

    // Validate slot is locked by THIS user
    const slotKey = `${propertyId}_${date}_${timeSlotStart}`;
    const lockedData = lockedSlots.get(slotKey);

    if (!lockedData || lockedData.userId !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Slot not properly locked by you.' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Calculate total amount (simplistic based on duration vs hour price)
    const durationHours = property.slotDurationMinutes / 60;
    const basePrice = property.pricePerHour * durationHours;
    // We would calculate selectedAssets prices here too if they had price
    const totalAmount = basePrice;

    // Create DB Booking as Pending
    const booking = await Booking.create({
      customerId: req.user._id,
      propertyId,
      date: new Date(date),
      timeSlot: { start: timeSlotStart, end: timeSlotEnd },
      status: 'pending',
      selectedAssets: selectedAssets || [],
      totalAmount,
      lockExpiresAt: lockedData.expiresAt
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // convert to cents
      currency: 'usd',
      metadata: {
        bookingId: booking._id.toString(),
        slotKey,
        propertyId
      }
    });

    booking.stripePaymentIntentId = paymentIntent.id;
    await booking.save();

    // --- Auto-bundle available Equipment assets for this property ---
    try {
      const Asset = require('../models/Asset');
      const equipmentAssets = await Asset.find({
        property: propertyId,
        category: 'Equipment',
        healthStatus: { $ne: 'retired' },
        availableQuantity: { $gt: 0 }
      });

      const bundledIds = [];
      for (const asset of equipmentAssets) {
        asset.availableQuantity = Math.max(0, asset.availableQuantity - 1);
        asset.isReturned = false;
        asset.lastUsedBooking = booking._id;
        await asset.save();
        bundledIds.push(asset._id);
      }
      
      if (bundledIds.length > 0) {
        booking.bundledAssets = bundledIds;
        await booking.save();
      }
    } catch (assetErr) {
      console.error('Asset bundling failed during creation (non-fatal):', assetErr.message);
    }

    res.json({ clientSecret: paymentIntent.client_secret, bookingId: booking._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Stripe Webhook handler
// @route   POST /api/payments/webhook  (raw body applied in index.js)
// @access  Public (Stripe signs the payload — no JWT needed)
const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // --- Ticket Purchase Logic ---
      if (paymentIntent.metadata && paymentIntent.metadata.type === 'ticket_purchase') {
        const { eventId, tier, customerId } = paymentIntent.metadata;
        const TicketModel = require('../models/Ticket');
        const EventModel = require('../models/Event');

        const eventDoc = await EventModel.findById(eventId);
        if (eventDoc) {
          const selectedTier = eventDoc.ticketTiers.find(t => t.tier === tier);
          
          if (selectedTier) {
            const ticket = await TicketModel.create({
              eventId,
              customerId,
              tier,
              price: selectedTier.price,
              stripePaymentIntentId: paymentIntent.id,
              status: 'active'
            });

            ticket.qrCodeData = JSON.stringify({
              ticketId: ticket._id,
              eventId: eventDoc._id,
              customerId,
              tier
            });
            await ticket.save();

            await EventModel.updateOne(
              { _id: eventId, 'ticketTiers.tier': tier },
              { $inc: { 'ticketTiers.$.soldQuantity': 1 } }
            );
            console.log(`[Webhook] Ticket created successfully for event ${eventId}`);
          }
        }
        return res.json({ received: true });
      }

      // --- Booking Logic ---
      const bookingId = paymentIntent.metadata.bookingId;
      const slotKey = paymentIntent.metadata.slotKey;

      const booking = await Booking.findById(bookingId).populate('customerId').populate('propertyId');
      if (booking) {
        booking.status = 'booked';
        // Generate QR data JSON payload that security staff will scan
        const qrData = JSON.stringify({
          bookingId: booking._id.toString(),
          customerId: booking.customerId._id.toString(),
          propertyName: booking.propertyId.name,
          date: booking.date.toISOString().split('T')[0],
          timeSlot: `${booking.timeSlot.start}-${booking.timeSlot.end}`
        });
        booking.qrCodeData = qrData;

        // Assets are already bundled during createPaymentIntent.
        // We just ensure the booking is saved with the correct status and QR data.
        await booking.save();
        console.log(`[Webhook] Booking ${bookingId} confirmed. QR data saved.`);

        // Clear the in-memory lock
        const { getIo } = require('../sockets/bookingSocket');
        lockedSlots.delete(slotKey);

        // Broadcast slot_confirmed to all users viewing this property
        const io = getIo();
        if (io) {
          io.to(`property_${booking.propertyId._id}`).emit('slot_confirmed', {
            propertyId: booking.propertyId._id,
            date: booking.date.toISOString().split('T')[0],
            timeSlotStart: booking.timeSlot.start
          });
        }
      } else {
        console.warn(`[Webhook] payment_intent.succeeded: booking ${bookingId} not found in DB`);
      }

    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;
      const slotKey = paymentIntent.metadata.slotKey;
      const propertyId = paymentIntent.metadata.propertyId;

      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.status = 'cancelled';
        
        // Release bundled assets
        if (booking.bundledAssets && booking.bundledAssets.length > 0) {
          try {
            const Asset = require('../models/Asset');
            for (const assetId of booking.bundledAssets) {
              await Asset.findByIdAndUpdate(assetId, {
                $inc: { availableQuantity: 1 },
                isReturned: true
              });
            }
            console.log(`[Webhook] Released ${booking.bundledAssets.length} asset(s) from cancelled booking ${bookingId}`);
          } catch (assetErr) {
            console.error('[Webhook] Asset release failed (non-fatal):', assetErr.message);
          }
        }

        await booking.save();
        console.log(`[Webhook] Booking ${bookingId} cancelled.`);

        // Clear the in-memory lock and release slot
        const { getIo } = require('../sockets/bookingSocket');
        lockedSlots.delete(slotKey);

        const io = getIo();
        if (io) {
          io.to(`property_${propertyId}`).emit('slot_released', {
            propertyId: propertyId,
            date: slotKey.split('_')[1],
            timeSlotStart: slotKey.split('_')[2]
          });
        }
      }
    } else {
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (processingError) {
    // Log the error but still return 200 — returning non-200 causes Stripe to retry indefinitely
    console.error('[Webhook] Processing error (booking update failed):', processingError);
  }

  // Always acknowledge receipt so Stripe doesn't retry
  res.json({ received: true });
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user._id }).populate('propertyId');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPropertyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ propertyId: req.params.propertyId }).populate('customerId', 'name email');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAttendance = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Found nil booking' });
    booking.attendanceStatus = req.body.status;
    // When security confirms arrival, mark booking as completed so customer can leave a review
    if (req.body.status === 'confirmed') {
      booking.status = 'completed';

      // Return all assets that were bundled with this booking
      try {
        const Asset = require('../models/Asset');
        const assets = await Asset.find({ lastUsedBooking: booking._id });
        for (const asset of assets) {
          asset.isReturned = true;
          asset.availableQuantity = asset.availableQuantity + 1;
          await asset.save();
        }
        console.log(`[Attendance] Returned ${assets.length} asset(s) for booking ${booking._id}`);
      } catch (assetErr) {
        console.error('[Attendance] Asset return failed (non-fatal):', assetErr.message);
      }
    }
    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('propertyId', 'name');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAvailableSlots,
  createPaymentIntent,
  stripeWebhook,
  getMyBookings,
  getPropertyBookings,
  markAttendance,
  getBookingById
};
