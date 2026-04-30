const { Server } = require('socket.io');
const { lockedSlots, HOLD_DURATION_MS } = require('../services/lockService');
const Booking = require('../models/Booking');
const Property = require('../models/Property');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        process.env.CLIENT_URL
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a property room to listen only to relevant updates
    socket.on('join_property_room', (propertyId) => {
      socket.join(`property_${propertyId}`);
    });

    socket.on('leave_property_room', (propertyId) => {
      socket.leave(`property_${propertyId}`);
    });

    // lock_slot event — creates a HELD booking in the database
    socket.on('lock_slot', async ({ propertyId, date, timeSlotStart, userId }) => {
      const slotKey = `${propertyId}_${date}_${timeSlotStart}`;

      // Prevent simultaneous locks on the same slot (check in-memory first)
      if (lockedSlots.has(slotKey)) {
        socket.emit('lock_error', { message: 'Slot is already held by another user' });
        return;
      }

      // Also check DB for existing held/blocked booking on this slot
      try {
        const existingBooking = await Booking.findOne({
          propertyId,
          date: new Date(date),
          'timeSlot.start': timeSlotStart,
          status: { $in: ['held', 'blocked', 'booked', 'pending_onsite'] }
        });

        if (existingBooking) {
          // If it's a held booking that has expired, release it
          if (existingBooking.status === 'held' && existingBooking.holdExpiresAt && new Date(existingBooking.holdExpiresAt) < new Date()) {
            existingBooking.status = 'cancelled';
            existingBooking.holdExpiresAt = undefined;
            await existingBooking.save();
            // Continue — slot is now available
          } else {
            socket.emit('lock_error', { message: 'Slot is already taken' });
            return;
          }
        }
      } catch (err) {
        console.error('[Socket] DB check error:', err.message);
        socket.emit('lock_error', { message: 'Server error. Please try again.' });
        return;
      }

      // Enforce maximum of 2 pending slot holds per customer
      const userLockCount = [...lockedSlots.values()].filter(v => v.userId === userId).length;
      if (userLockCount >= 2) {
        socket.emit('lock_error', {
          message: 'You can only hold up to 2 pending slots at a time. Please complete or cancel an existing booking first.',
          code: 'LOCK_LIMIT_EXCEEDED'
        });
        return;
      }

      const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);

      // Create HELD booking in the database
      let booking;
      try {
        const property = await Property.findById(propertyId);
        if (!property) {
          socket.emit('lock_error', { message: 'Property not found' });
          return;
        }

        // Generate the end time for the slot
        const allSlots = generateSlots(
          property.availableHours.start,
          property.availableHours.end,
          property.slotDurationMinutes
        );
        const matchedSlot = allSlots.find(s => s.start === timeSlotStart);
        const timeSlotEnd = matchedSlot ? matchedSlot.end : timeSlotStart;

        const durationHours = property.slotDurationMinutes / 60;
        const totalAmount = property.pricePerHour * durationHours;

        booking = await Booking.create({
          customerId: userId,
          propertyId,
          date: new Date(date),
          timeSlot: { start: timeSlotStart, end: timeSlotEnd },
          status: 'held',
          holdExpiresAt: expiresAt,
          lockExpiresAt: expiresAt,
          totalAmount
        });
      } catch (err) {
        console.error('[Socket] Error creating held booking:', err.message);
        socket.emit('lock_error', { message: 'Could not hold slot. Please try again.' });
        return;
      }

      // Start timer to auto-release after hold duration
      const timeoutId = setTimeout(async () => {
        lockedSlots.delete(slotKey);

        // Release the booking in the database
        try {
          const heldBooking = await Booking.findById(booking._id);
          if (heldBooking && heldBooking.status === 'held') {
            heldBooking.status = 'cancelled';
            heldBooking.holdExpiresAt = undefined;
            await heldBooking.save();
            console.log(`[Socket] Auto-released expired hold for booking ${booking._id}`);
          }
        } catch (err) {
          console.error('[Socket] Error auto-releasing hold:', err.message);
        }

        io.to(`property_${propertyId}`).emit('slot_released', { propertyId, date, timeSlotStart });
      }, HOLD_DURATION_MS);

      lockedSlots.set(slotKey, { userId, timeoutId, expiresAt, bookingId: booking._id.toString() });

      // Build payload and broadcast
      const payload = { propertyId, date, timeSlotStart, userId, expiresAt, bookingId: booking._id };
      io.to(`property_${propertyId}`).emit('slot_locked', payload);
      socket.emit('lock_success', payload);
    });

    // release_slot event — cancels the HELD booking
    socket.on('release_slot', async ({ propertyId, date, timeSlotStart, userId }) => {
      const slotKey = `${propertyId}_${date}_${timeSlotStart}`;
      const lockedData = lockedSlots.get(slotKey);

      if (lockedData && lockedData.userId === userId) {
        clearTimeout(lockedData.timeoutId);
        lockedSlots.delete(slotKey);

        // Release the booking in the database
        try {
          if (lockedData.bookingId) {
            const booking = await Booking.findById(lockedData.bookingId);
            if (booking && booking.status === 'held') {
              booking.status = 'cancelled';
              booking.holdExpiresAt = undefined;
              await booking.save();
              console.log(`[Socket] User cancelled held booking ${lockedData.bookingId}`);
            }
          }
        } catch (err) {
          console.error('[Socket] Error releasing held booking:', err.message);
        }

        io.to(`property_${propertyId}`).emit('slot_released', { propertyId, date, timeSlotStart });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Timer will handle abandonments — held bookings auto-expire
    });
  });
};

// Helper to generate slots (same logic as bookingController)
const generateSlots = (startStr, endStr, durationMins) => {
  const { parse, addMinutes, isAfter, format } = require('date-fns');
  const slots = [];
  const fakeDate = new Date();
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

const getIo = () => io;

module.exports = { initSocket, getIo };
