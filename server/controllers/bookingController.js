const Property = require('../models/Property');
const Booking = require('../models/Booking');
const { getLockedSlotsForProperty, isSlotLocked, lockedSlots, releaseExpiredHolds } = require('../services/lockService');
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
    const userId = req.query.userId; // Optional, to calculate window

    // Release any expired holds before returning slots
    await releaseExpiredHolds();

    let dateString = req.query.date;
    let targetDate;
    if (dateString) {
      const [year, month, day] = dateString.split('-');
      targetDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      targetDate = new Date();
      targetDate.setUTCHours(0, 0, 0, 0);
      dateString = targetDate.toISOString().split('T')[0];
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Determine booking window
    let maxDaysAhead = 4;
    if (userId) {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (user && user.institute && property.institute && user.institute.toLowerCase() === property.institute.toLowerCase()) {
        maxDaysAhead = 7;
      }
    }

    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);
    const maxDate = new Date(todayDate);
    maxDate.setDate(maxDate.getDate() + maxDaysAhead - 1); // If 4 days: today(0) + 3 = 4 days total

    if (targetDate < todayDate) {
      return res.status(400).json({ message: 'Cannot book in the past' });
    }
    if (targetDate > maxDate) {
      return res.status(400).json({ message: `Bookings are only allowed up to ${maxDaysAhead} days in advance for you.` });
    }

    // Generate all theoretical slots
    const allSlots = generateSlots(
      property.availableHours.start,
      property.availableHours.end,
      property.slotDurationMinutes
    );

    // Fetch existing DB bookings for the date (including HELD and BLOCKED)
    const existingBookings = await Booking.find({
      propertyId,
      date: targetDate,
      status: { $in: ['held', 'blocked', 'booked', 'completed', 'pending_onsite'] }
    });

    // Build lookup maps
    const bookedStarts = {};
    const heldStarts = {};
    existingBookings.forEach(b => {
      if (['blocked', 'booked', 'completed'].includes(b.status)) {
        bookedStarts[b.timeSlot.start] = b;
      } else if (b.status === 'held') {
        heldStarts[b.timeSlot.start] = b;
      } else if (b.status === 'pending_onsite') {
        bookedStarts[b.timeSlot.start] = b;
      }
    });

    // Also check in-memory locks for any that haven't been persisted yet
    const lockedSlotsData = getLockedSlotsForProperty(propertyId, dateString);
    lockedSlotsData.forEach(lock => {
      const parts = lock.slotKey.split('_');
      const start = parts[parts.length - 1];
      if (!heldStarts[start] && !bookedStarts[start]) {
        heldStarts[start] = {
          customerId: lock.userId,
          holdExpiresAt: lock.expiresAt,
          status: 'held'
        };
      }
    });

    const payload = allSlots.map(slot => {
      let state = 'Available';
      let lockData = null;

      if (bookedStarts[slot.start]) {
        state = 'Booked';
      } else if (heldStarts[slot.start]) {
        state = 'Pending';
        lockData = heldStarts[slot.start];
      }

      return {
        ...slot,
        state,
        lockedBy: lockData ? (lockData.customerId?.toString?.() || lockData.customerId) : null,
        lockExpiresAt: lockData ? (lockData.holdExpiresAt || lockData.lockExpiresAt) : null
      };
    });

    res.json({ date: targetDate, propertyId, slots: payload });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Stripe PaymentIntent for a HELD booking
// @route   POST /api/bookings/create-payment-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
  try {
    const { propertyId, date, timeSlotStart, timeSlotEnd, selectedAssets } = req.body;

    const slotKey = `${propertyId}_${date}_${timeSlotStart}`;
    const lockedData = lockedSlots.get(slotKey);

    // Validate the slot is held by THIS user (check in-memory lock first)
    if (!lockedData || lockedData.userId !== req.user._id.toString()) {
      // Fallback: check DB for a held booking by this user
      const heldBooking = await Booking.findOne({
        propertyId,
        customerId: req.user._id,
        date: new Date(date),
        'timeSlot.start': timeSlotStart,
        status: 'held',
        holdExpiresAt: { $gt: new Date() }
      });

      if (!heldBooking) {
        return res.status(400).json({ message: 'Slot not properly held by you.' });
      }

      // Use the existing held booking for payment
      return await processPaymentIntent(req, res, heldBooking, slotKey, propertyId, selectedAssets);
    }

    // Find the HELD booking that was created during lock_slot
    let booking;
    if (lockedData.bookingId) {
      booking = await Booking.findById(lockedData.bookingId);
    }

    if (!booking || booking.status !== 'held') {
      // Fallback: find by query
      booking = await Booking.findOne({
        propertyId,
        customerId: req.user._id,
        date: new Date(date),
        'timeSlot.start': timeSlotStart,
        status: 'held',
        holdExpiresAt: { $gt: new Date() }
      });
    }

    if (!booking) {
      return res.status(400).json({ message: 'No held booking found. Please select a slot again.' });
    }

    await processPaymentIntent(req, res, booking, slotKey, propertyId, selectedAssets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to process the payment intent for an existing held booking
async function processPaymentIntent(req, res, booking, slotKey, propertyId, selectedAssets) {
  const property = await Property.findById(propertyId);
  if (!property) return res.status(404).json({ message: 'Property not found' });

  // Update booking with selected assets if provided
  if (selectedAssets && selectedAssets.length > 0) {
    booking.selectedAssets = selectedAssets;
    await booking.save();
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.totalAmount * 100), // convert to cents
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
}

// @desc    Cancel a HELD booking (explicit user cancellation)
// @route   POST /api/bookings/cancel-hold
// @access  Private
const cancelHold = async (req, res) => {
  try {
    const { propertyId, date, timeSlotStart } = req.body;

    const slotKey = `${propertyId}_${date}_${timeSlotStart}`;

    // Find the held booking
    const booking = await Booking.findOne({
      propertyId,
      customerId: req.user._id,
      date: new Date(date),
      'timeSlot.start': timeSlotStart,
      status: 'held'
    });

    if (booking) {
      booking.status = 'cancelled';
      booking.holdExpiresAt = undefined;
      await booking.save();
      console.log(`[Cancel] User cancelled held booking ${booking._id}`);
    }

    // Clear in-memory lock
    const lockData = lockedSlots.get(slotKey);
    if (lockData) {
      clearTimeout(lockData.timeoutId);
      lockedSlots.delete(slotKey);
    }

    // Broadcast slot release via socket
    try {
      const { getIo } = require('../sockets/bookingSocket');
      const io = getIo();
      if (io) {
        io.to(`property_${propertyId}`).emit('slot_released', {
          propertyId,
          date,
          timeSlotStart
        });
      }
    } catch (socketErr) {
      console.error('[Cancel] Socket broadcast failed (non-fatal):', socketErr.message);
    }

    res.json({ success: true, message: 'Hold cancelled. Slot is now available.' });
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

      // --- Booking Logic: HELD → BLOCKED (Confirmed) ---
      const bookingId = paymentIntent.metadata.bookingId;
      const slotKey = paymentIntent.metadata.slotKey;

      const booking = await Booking.findById(bookingId).populate('customerId').populate('propertyId');
      if (booking) {
        // Transition from HELD to BLOCKED (confirmed)
        booking.status = 'blocked';
        // Remove the hold expiry — permanently assigned
        booking.holdExpiresAt = undefined;
        booking.lockExpiresAt = undefined;
        // Generate QR data JSON payload that security staff will scan
        booking.qrCodeData = JSON.stringify({
          bookingId: booking._id,
          propertyId: booking.propertyId,
          customerId: booking.customerId,
          date: booking.date,
          timeSlot: booking.timeSlot,
          paymentMethod: 'online'
        });

        // Assets are already bundled during createPaymentIntent.
        // We just ensure the booking is saved with the correct status and QR data.
        await booking.save();
        console.log(`[Webhook] Booking ${bookingId} confirmed (HELD → BLOCKED). QR data saved.`);

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
        booking.holdExpiresAt = undefined;
        
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
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Ensure authorized: Owner of this property, or Admin, or Security Officer (security officer logic could be further refined if they are assigned to specific properties)
    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'securityOfficer') {
      return res.status(403).json({ message: 'Not authorized to view bookings for this property' });
    }

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

// @desc    Request a booking modification (Customer)
// @route   POST /api/bookings/:id/request-modification
// @access  Private
const requestModification = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'owner_blocked') {
      return res.status(400).json({ message: `Cannot modify a ${booking.status} booking` });
    }

    const { requestedDate, requestedTimeStart, requestedTimeEnd, reason } = req.body;

    booking.modificationRequest = {
      requestedDate: new Date(requestedDate),
      requestedTimeSlot: {
        start: requestedTimeStart,
        end: requestedTimeEnd || ''
      },
      status: 'pending',
      reason: reason || ''
    };

    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Handle a booking modification (Owner)
// @route   POST /api/bookings/:id/handle-modification
// @access  Private/Owner
const handleModification = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('propertyId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Check owner
    if (booking.propertyId.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { action } = req.body; // 'approve' or 'reject'

    if (!booking.modificationRequest || booking.modificationRequest.status !== 'pending') {
      return res.status(400).json({ message: 'No pending modification request' });
    }

    if (action === 'approve') {
      booking.date = booking.modificationRequest.requestedDate;
      booking.timeSlot.start = booking.modificationRequest.requestedTimeSlot.start;
      if (booking.modificationRequest.requestedTimeSlot.end) {
        booking.timeSlot.end = booking.modificationRequest.requestedTimeSlot.end;
      }
      booking.modificationRequest.status = 'approved';

      // Regenerate QR data with new details
      const qrData = JSON.parse(booking.qrCodeData || '{}');
      qrData.date = booking.date;
      qrData.timeSlot = booking.timeSlot;
      booking.qrCodeData = JSON.stringify(qrData);
    } else if (action === 'reject') {
      booking.modificationRequest.status = 'rejected';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Owner block slot (turns to owner_blocked)
// @route   POST /api/bookings/:id/owner-block
// @access  Private/Owner
const ownerBlockBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('propertyId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = 'owner_blocked';
    // Could also clear lockExpiresAt / release assets if needed.
    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Owner manually blocks a new specific slot
// @route   POST /api/bookings/owner-block-slot
// @access  Private/Owner
const ownerBlockNewSlot = async (req, res) => {
  try {
    const { propertyId, date, timeSlotStart, timeSlotEnd } = req.body;

    const Property = require('../models/Property');
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const booking = await Booking.create({
      customerId: req.user._id, // Assign to self to represent block
      propertyId,
      date: new Date(date),
      timeSlot: { start: timeSlotStart, end: timeSlotEnd || timeSlotStart },
      status: 'owner_blocked',
      totalAmount: 0
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAvailableSlots,
  createPaymentIntent,
  cancelHold,
  stripeWebhook,
  getMyBookings,
  getPropertyBookings,
  markAttendance,
  getBookingById,
  requestModification,
  handleModification,
  ownerBlockBooking,
  ownerBlockNewSlot
};
