const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * Create a user in the DB and return { user, token }
 */
async function createUser(overrides = {}) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await User.create({
    name: overrides.name || 'Test User',
    email: overrides.email || `user_${Date.now()}@test.com`,
    passwordHash,
    role: overrides.role || 'customer',
    associatedOwner: overrides.associatedOwner || undefined,
    ...overrides,
  });
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
  return { user, token };
}

/**
 * Create a property owned by the given ownerId
 */
async function createProperty(ownerId, overrides = {}) {
  return Property.create({
    name: overrides.name || 'Test Facility',
    description: 'A test sports facility',
    ownerId,
    sportType: overrides.sportType || 'Football',
    pricePerHour: 100,
    slotDurationMinutes: 60,
    availableHours: { start: '08:00', end: '20:00' },
    location: { address: '123 Test Street' },
    ...overrides,
  });
}

/**
 * Create a booking with status 'booked' and a QR code.
 * Default slot: starts 3 hours from now (UTC), ends 4 hours from now.
 * This ensures the slot is always in the future regardless of timezone.
 */
async function createBooking(customerId, propertyId, overrides = {}) {
  // Work in UTC to match how the server computes expiry
  const now = new Date();
  // Default slot: started 10 min ago, ends 50 min from now — always in the valid check-in window
  const slotStart = new Date(now.getTime() - 10 * 60 * 1000);
  const slotEnd   = new Date(now.getTime() + 50 * 60 * 1000);

  const pad = n => String(n).padStart(2, '0');
  const defaultStart = `${pad(slotStart.getUTCHours())}:${pad(slotStart.getUTCMinutes())}`;
  const defaultEnd   = `${pad(slotEnd.getUTCHours())}:${pad(slotEnd.getUTCMinutes())}`;

  // Use today in UTC as the booking date
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const booking = await Booking.create({
    customerId,
    propertyId,
    date: today,
    timeSlot: {
      start: overrides.timeSlot?.start || defaultStart,
      end:   overrides.timeSlot?.end   || defaultEnd,
    },
    status: overrides.status || 'booked',
    paymentMethod: 'online',
    totalAmount: 100,
    attendanceStatus: 'pending',
    qrUsed: false,
    ...overrides,
    // timeSlot already handled above — don't let spread override it again
  });

  // Set qrCodeData after creation (needs _id)
  if (!overrides.qrCodeData) {
    booking.qrCodeData = JSON.stringify({
      bookingId: booking._id.toString(),
      propertyId: propertyId.toString(),
      customerId: customerId.toString(),
      date: today,
      timeSlot: booking.timeSlot,
      passkey: booking.passkey || 'ABC123',
      paymentMethod: 'online',
    });
    await booking.save();
  }

  return booking;
}

module.exports = { createUser, createProperty, createBooking };
