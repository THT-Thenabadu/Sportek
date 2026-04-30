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

    // Parse date safely in local timezone (new Date('YYYY-MM-DD') parses as UTC midnight,
    // which shifts the day in +05:30 timezones — we want local midnight instead)
    let targetDate;
    if (req.query.date) {
      const [y, m, d] = req.query.date.split('-').map(Number);
      targetDate = new Date(y, m - 1, d, 0, 0, 0, 0); // local midnight
    } else {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // Use local date string for lock-key lookup (format: YYYY-MM-DD)
    const pad = n => String(n).padStart(2, '0');
    const dateString = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

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

    // Fetch existing DB bookings for the date — use a range to avoid UTC/local issues
    const dayStart = new Date(targetDate); // already local midnight
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    const existingBookings = await Booking.find({
      propertyId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['booked', 'completed', 'active', 'pending_onsite'] }
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

      const isBlocked = property.blockedSlots && property.blockedSlots.some(b => {
        const bDate = new Date(b.date);
        bDate.setHours(0, 0, 0, 0);
        return bDate.getTime() === targetDate.getTime() && b.timeSlot.start === slot.start;
      });

      if (isBlocked) {
        state = 'Blocked';
      } else if (bookedStarts.includes(slot.start)) {
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

    console.log(`[createPaymentIntent] slotKey="${slotKey}" userId="${req.user._id}" lockedData=`, lockedData ? `userId=${lockedData.userId}` : 'NOT FOUND');
    console.log(`[createPaymentIntent] All current locks:`, [...lockedSlots.keys()]);

    if (!lockedData) {
      // Lock missing — server may have restarted or the socket lock was lost.
      // Check the slot is still free in DB (ignore pending bookings by this same user — retries).
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const conflict = await Booking.findOne({
        propertyId,
        date: targetDate,
        'timeSlot.start': timeSlotStart,
        status: { $in: ['booked', 'active', 'pending_onsite'] },
        // A pending booking by THIS user is just a retry — don't block it
        customerId: { $ne: req.user._id },
      });
      if (conflict) {
        return res.status(400).json({ message: 'This slot is no longer available.' });
      }
      // Also clean up any stale pending booking this user left from a previous attempt
      await Booking.deleteMany({
        propertyId,
        date: targetDate,
        'timeSlot.start': timeSlotStart,
        customerId: req.user._id,
        status: 'pending',
      });
      // Re-acquire the lock
      const expiresAt = new Date(Date.now() + 120000);
      const timeoutId = setTimeout(() => { lockedSlots.delete(slotKey); }, 120000);
      lockedSlots.set(slotKey, { userId: req.user._id.toString(), timeoutId, expiresAt });
    } else if (lockedData.userId !== req.user._id.toString()) {
      return res.status(400).json({ message: 'This slot is currently held by another user.' });
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
      lockExpiresAt: lockedSlots.get(slotKey)?.expiresAt
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
        const passkey = Math.random().toString(36).substring(2, 8).toUpperCase();
        booking.passkey = passkey;
        booking.status = 'booked';
        booking.qrCodeData = JSON.stringify({
          bookingId: booking._id.toString(),
          propertyId: booking.propertyId._id ? booking.propertyId._id.toString() : booking.propertyId.toString(),
          customerId: booking.customerId._id ? booking.customerId._id.toString() : booking.customerId.toString(),
          date: booking.date,
          timeSlot: booking.timeSlot,
          passkey,
          paymentMethod: 'online'
        });

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

const getUpcomingSecurityBookings = async (req, res) => {
  try {
    if (req.user.role !== 'securityOfficer') {
      return res.status(403).json({ message: 'Access denied. Security officers only.' });
    }
    if (!req.user.associatedOwner) {
      return res.status(400).json({ message: 'No associated property owner linked to your account.' });
    }
    const Property = require('../models/Property');
    const properties = await Property.find({ ownerId: req.user.associatedOwner });
    const propertyIds = properties.map(p => p._id);

    // Only show bookings not yet scanned in
    const bookings = await Booking.find({
      propertyId: { $in: propertyIds },
      status: { $in: ['booked', 'pending_onsite'] },
      attendanceStatus: 'pending'
    }).populate('customerId', 'name email').populate('propertyId', 'name');

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCurrentSecurityBookings = async (req, res) => {
  try {
    if (req.user.role !== 'securityOfficer') {
      return res.status(403).json({ message: 'Access denied. Security officers only.' });
    }
    if (!req.user.associatedOwner) {
      return res.status(400).json({ message: 'No associated property owner linked to your account.' });
    }
    const Property = require('../models/Property');
    const properties = await Property.find({ ownerId: req.user.associatedOwner });
    const propertyIds = properties.map(p => p._id);

    // Show only active (checked in, not yet ended) bookings
    const bookings = await Booking.find({
      propertyId: { $in: propertyIds },
      status: 'active'
    }).populate('customerId', 'name email').populate('propertyId', 'name');

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Scan QR code — validate and check-in a booking
// @route   POST /api/bookings/scan-qr
// @access  Private/SecurityOfficer
const scanQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ message: 'QR data is required' });

    let bookingId;
    try {
      const payload = JSON.parse(qrData);
      // bookingId may be a full object (populated) or a string — handle both
      const raw = payload.bookingId;
      if (raw && typeof raw === 'object' && raw._id) {
        bookingId = raw._id.toString();
      } else if (raw) {
        bookingId = raw.toString();
      }
    } catch {
      // Not JSON — treat as raw bookingId or bookingToken
      bookingId = qrData.trim();
    }

    if (!bookingId) {
      return res.status(400).json({ message: 'Could not extract booking ID from QR data' });
    }

    // Try finding by _id first, then by bookingToken as fallback
    let booking = null;
    try {
      booking = await Booking.findById(bookingId)
        .populate('customerId', 'name email')
        .populate('propertyId', 'name ownerId');
    } catch (e) {
      // Invalid ObjectId — try bookingToken
    }

    if (!booking) {
      booking = await Booking.findOne({ bookingToken: bookingId.toUpperCase() })
        .populate('customerId', 'name email')
        .populate('propertyId', 'name ownerId');
    }

    if (!booking) return res.status(404).json({ message: 'Invalid QR — booking not found' });

    // One-time use check
    if (booking.qrUsed) {
      return res.status(400).json({ message: 'This QR code has already been used and is expired' });
    }

    // Belongs to this officer's property
    const ownerId = req.user.associatedOwner?.toString();
    const bookingOwnerId = booking.propertyId?.ownerId?.toString();
    if (!ownerId || ownerId !== bookingOwnerId) {
      return res.status(403).json({ message: 'This QR belongs to a different property' });
    }

    // Valid state
    if (!['booked', 'pending_onsite'].includes(booking.status)) {
      return res.status(400).json({ message: `Booking cannot be checked in (status: ${booking.status})` });
    }

    // Time window validation — assume time slots are in +05:30 (Sri Lanka/India) timezone
    const datePart = booking.date.toISOString().split('T')[0];
    const startDateTime = new Date(`${datePart}T${booking.timeSlot.start}:00+05:30`);
    const endDateTime = new Date(`${datePart}T${booking.timeSlot.end}:00+05:30`);
    const now = new Date();

    // Valid from 30 minutes before the booking start
    const validFrom = new Date(startDateTime.getTime() - 30 * 60 * 1000);

    if (now < validFrom) {
      const diffMins = Math.ceil((validFrom - now) / 60000);
      return res.status(400).json({
        message: `QR not valid yet — entry opens 30 minutes before your booking. Please come back in ${diffMins} minute${diffMins !== 1 ? 's' : ''}.`,
        validFrom: validFrom.toISOString(),
        bookingStart: startDateTime.toISOString(),
      });
    }

    if (endDateTime < now) {
      return res.status(400).json({ message: 'This booking has expired — the time slot has already passed' });
    }

    // Check in
    booking.status = 'active';
    booking.attendanceStatus = 'confirmed';
    booking.qrUsed = true;
    await booking.save();

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check in by booking token (manual fallback when QR can't be scanned)
// @route   POST /api/bookings/checkin-token
// @access  Private/SecurityOfficer
const checkinByToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const booking = await Booking.findOne({ bookingToken: token.trim().toUpperCase() })
      .populate('customerId', 'name email')
      .populate('propertyId', 'name ownerId');

    if (!booking) return res.status(404).json({ message: 'No booking found with this token' });

    if (booking.qrUsed) {
      return res.status(400).json({ message: 'This token has already been used — entry expired' });
    }

    const ownerId = req.user.associatedOwner?.toString();
    const bookingOwnerId = booking.propertyId?.ownerId?.toString();
    if (!ownerId || ownerId !== bookingOwnerId) {
      return res.status(403).json({ message: 'This booking belongs to a different property' });
    }

    if (!['booked', 'pending_onsite'].includes(booking.status)) {
      return res.status(400).json({ message: `Booking cannot be checked in (status: ${booking.status})` });
    }

    // Time window validation — assume time slots are in +05:30 (Sri Lanka/India) timezone
    const datePart = booking.date.toISOString().split('T')[0];
    const startDateTime = new Date(`${datePart}T${booking.timeSlot.start}:00+05:30`);
    const endDateTime = new Date(`${datePart}T${booking.timeSlot.end}:00+05:30`);
    const now = new Date();

    // Valid from 30 minutes before the booking start
    const validFrom = new Date(startDateTime.getTime() - 30 * 60 * 1000);

    if (now < validFrom) {
      const diffMins = Math.ceil((validFrom - now) / 60000);
      return res.status(400).json({
        message: `Token not valid yet — entry opens 30 minutes before your booking. Please come back in ${diffMins} minute${diffMins !== 1 ? 's' : ''}.`,
        validFrom: validFrom.toISOString(),
        bookingStart: startDateTime.toISOString(),
      });
    }

    if (endDateTime < now) {
      return res.status(400).json({ message: 'This booking has expired — the time slot has already passed' });
    }

    booking.status = 'active';
    booking.attendanceStatus = 'confirmed';
    booking.qrUsed = true;
    await booking.save();

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    End a booking session
// @route   PATCH /api/bookings/:id/end-session
// @access  Private/SecurityOfficer
const endSession = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate('propertyId', 'name');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'active') {
      return res.status(400).json({ message: 'Booking is not currently active' });
    }

    booking.status = 'ended';
    await booking.save();

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSecurityBookings = async (req, res) => {
  try {
    if (req.user.role !== 'securityOfficer') {
      return res.status(403).json({ message: 'Access denied. Security officers only.' });
    }
    if (!req.user.associatedOwner) {
      return res.status(400).json({ message: 'No associated property owner linked to your account.' });
    }
    const Property = require('../models/Property');
    const properties = await Property.find({ ownerId: req.user.associatedOwner });
    const propertyIds = properties.map(p => p._id);

    // Get all bookings for the properties
    const bookings = await Booking.find({
      propertyId: { $in: propertyIds }
    })
      .populate('customerId', 'name email')
      .populate('propertyId', 'name')
      .sort({ date: -1 }); // Sort by date, newest first

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
  getBookingById,
  getUpcomingSecurityBookings,
  getCurrentSecurityBookings,
  getAllSecurityBookings,
  scanQR,
  endSession,
  checkinByToken
};
