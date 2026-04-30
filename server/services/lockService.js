// Key format: `${propertyId}_${date}_${timeSlotStart}`
// Value format: { userId, timeoutId, expiresAt, bookingId }
const lockedSlots = new Map();

const Booking = require('../models/Booking');

// Hold duration: 5 minutes (300 seconds)
const HOLD_DURATION_MS = 5 * 60 * 1000;

const getLockedSlotsForProperty = (propertyId, date) => {
  const locked = [];
  for (const [key, value] of lockedSlots.entries()) {
    if (key.startsWith(`${propertyId}_${date}`)) {
      locked.push({
        slotKey: key,
        userId: value.userId,
        expiresAt: value.expiresAt,
        bookingId: value.bookingId
      });
    }
  }
  return locked;
};

const isSlotLocked = (slotKey) => {
  return lockedSlots.has(slotKey);
};

/**
 * Release all expired HELD bookings from the database.
 * Called periodically and on-demand during slot queries.
 */
const releaseExpiredHolds = async () => {
  try {
    const now = new Date();

    // Find and release expired HELD bookings in the database
    const expiredBookings = await Booking.find({
      status: 'held',
      holdExpiresAt: { $lte: now }
    });

    for (const booking of expiredBookings) {
      booking.status = 'cancelled';
      booking.holdExpiresAt = undefined;
      await booking.save();

      // Also clean up in-memory lock if it exists
      const dateStr = booking.date.toISOString().split('T')[0];
      const slotKey = `${booking.propertyId}_${dateStr}_${booking.timeSlot.start}`;
      const lockData = lockedSlots.get(slotKey);
      if (lockData) {
        clearTimeout(lockData.timeoutId);
        lockedSlots.delete(slotKey);
      }
    }

    if (expiredBookings.length > 0) {
      console.log(`[LockService] Released ${expiredBookings.length} expired hold(s)`);
    }

    return expiredBookings;
  } catch (err) {
    console.error('[LockService] Error releasing expired holds:', err.message);
    return [];
  }
};

// Run the cleanup every 60 seconds as a CRON-like background job
setInterval(releaseExpiredHolds, 60 * 1000);

module.exports = {
  lockedSlots,
  getLockedSlotsForProperty,
  isSlotLocked,
  releaseExpiredHolds,
  HOLD_DURATION_MS
};
