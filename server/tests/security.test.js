/**
 * Security Feature Tests
 *
 * Covers:
 *  1. QR generation after successful property booking (webhook / onsite)
 *  2. QR download metadata (bookingToken present on booking)
 *  3. Security dashboard endpoints (upcoming, current, all bookings)
 *  4. QR scan → access granted / edge cases
 *  5. Manual token check-in
 *  6. End session
 *  7. Report generation (booking & facility types)
 *  8. Send report to owner
 */

require('./setup');

const request  = require('supertest');
const app      = require('./app');
const Booking  = require('../models/Booking');
const { createUser, createProperty, createBooking } = require('./helpers');

// ─── Shared state ────────────────────────────────────────────────────────────
let owner, ownerToken;
let secOfficer, secToken;
let customer, customerToken;
let property;

beforeEach(async () => {
  // Property owner
  ({ user: owner, token: ownerToken } = await createUser({ role: 'propertyOwner', name: 'Owner' }));

  // Security officer linked to owner
  ({ user: secOfficer, token: secToken } = await createUser({
    role: 'securityOfficer',
    name: 'Security Officer',
    associatedOwner: owner._id,
  }));

  // Customer
  ({ user: customer, token: customerToken } = await createUser({ role: 'customer', name: 'Customer' }));

  // Property owned by owner
  property = await createProperty(owner._id);
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. QR GENERATION AFTER BOOKING
// ═══════════════════════════════════════════════════════════════════════════
describe('QR Generation after booking', () => {
  test('booking has qrCodeData after creation', async () => {
    const booking = await createBooking(customer._id, property._id);
    expect(booking.qrCodeData).toBeTruthy();
    const payload = JSON.parse(booking.qrCodeData);
    expect(payload.bookingId).toBe(booking._id.toString());
    expect(payload.propertyId).toBe(property._id.toString());
  });

  test('booking has a unique 6-char bookingToken', async () => {
    const booking = await createBooking(customer._id, property._id);
    expect(booking.bookingToken).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('two bookings get different tokens', async () => {
    const b1 = await createBooking(customer._id, property._id, { timeSlot: { start: '09:00', end: '10:00' } });
    const b2 = await createBooking(customer._id, property._id, { timeSlot: { start: '11:00', end: '12:00' } });
    expect(b1.bookingToken).not.toBe(b2.bookingToken);
  });

  test('onsite booking endpoint generates qrCodeData', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/bookings/create-onsite')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        propertyId: property._id.toString(),
        date: dateStr,
        timeSlotStart: '10:00',
        timeSlotEnd: '11:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.qrCodeData).toBeTruthy();
    const payload = JSON.parse(res.body.qrCodeData);
    expect(payload.paymentMethod).toBe('onsite');
    expect(payload.bookingId).toBe(res.body._id);
  });

  test('onsite booking has status pending_onsite', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/bookings/create-onsite')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        propertyId: property._id.toString(),
        date: dateStr,
        timeSlotStart: '14:00',
        timeSlotEnd: '15:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending_onsite');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. QR DOWNLOAD METADATA
// ═══════════════════════════════════════════════════════════════════════════
describe('QR download metadata', () => {
  test('booking returned by my-bookings includes bookingToken and qrCodeData', async () => {
    await createBooking(customer._id, property._id);

    const res = await request(app)
      .get('/api/bookings/my-bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const b = res.body[0];
    expect(b.bookingToken).toMatch(/^[A-Z0-9]{6}$/);
    expect(b.qrCodeData).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. SECURITY DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════
describe('Security dashboard — booking lists', () => {
  test('GET /upcoming-security returns pending bookings for officer\'s properties', async () => {
    await createBooking(customer._id, property._id, { status: 'booked', attendanceStatus: 'pending' });

    const res = await request(app)
      .get('/api/bookings/upcoming-security')
      .set('Authorization', `Bearer ${secToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].attendanceStatus).toBe('pending');
  });

  test('GET /upcoming-security returns 401 without token', async () => {
    const res = await request(app).get('/api/bookings/upcoming-security');
    expect(res.status).toBe(401);
  });

  test('GET /upcoming-security returns 403 for customer role', async () => {
    const res = await request(app)
      .get('/api/bookings/upcoming-security')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /current-security returns active bookings', async () => {
    await createBooking(customer._id, property._id, { status: 'active', attendanceStatus: 'confirmed', qrUsed: true });

    const res = await request(app)
      .get('/api/bookings/current-security')
      .set('Authorization', `Bearer ${secToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe('active');
  });

  test('GET /all-security returns all bookings for officer\'s properties', async () => {
    await createBooking(customer._id, property._id, { status: 'booked' });
    await createBooking(customer._id, property._id, { status: 'ended', timeSlot: { start: '11:00', end: '12:00' } });

    const res = await request(app)
      .get('/api/bookings/all-security')
      .set('Authorization', `Bearer ${secToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('GET /all-security does not return bookings from other owners', async () => {
    // Create a second owner + property + booking
    const { user: owner2 } = await createUser({ role: 'propertyOwner', name: 'Owner2' });
    const property2 = await createProperty(owner2._id);
    await createBooking(customer._id, property2._id);

    // Our officer should only see their owner's bookings
    await createBooking(customer._id, property._id);

    const res = await request(app)
      .get('/api/bookings/all-security')
      .set('Authorization', `Bearer ${secToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. QR SCAN → ACCESS GRANTED
// ═══════════════════════════════════════════════════════════════════════════
describe('QR scan check-in', () => {
  test('valid QR scan grants access and marks booking active', async () => {
    const booking = await createBooking(customer._id, property._id);

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.status).toBe('active');
    expect(res.body.booking.attendanceStatus).toBe('confirmed');
    expect(res.body.booking.qrUsed).toBe(true);
  });

  test('QR scan with JSON payload (bookingId field) also works', async () => {
    const booking = await createBooking(customer._id, property._id);
    const qrData = JSON.stringify({ bookingId: booking._id.toString() });

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('scanning same QR twice returns 400 (already used)', async () => {
    const booking = await createBooking(customer._id, property._id);

    await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already been used/i);
  });

  test('scanning QR from a different owner\'s property returns 403', async () => {
    const { user: owner2 } = await createUser({ role: 'propertyOwner' });
    const property2 = await createProperty(owner2._id);
    const booking = await createBooking(customer._id, property2._id);

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/different property/i);
  });

  test('scanning non-existent booking ID returns 404', async () => {
    const fakeId = '000000000000000000000001';
    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: fakeId });

    expect(res.status).toBe(404);
  });

  test('scanning a cancelled booking returns 400', async () => {
    const booking = await createBooking(customer._id, property._id, { status: 'cancelled' });

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot be checked in/i);
  });

  test('scanning an expired booking returns 400', async () => {
    // Create booking with a past time slot
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const booking = await createBooking(customer._id, property._id, {
      date: yesterday,
      timeSlot: { start: '08:00', end: '09:00' },
      status: 'booked',
    });

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('scanning too early (>30 min before start) returns 400 with validFrom', async () => {
    // Booking starts 2 hours from now (UTC) — outside the 30-min window
    const now = new Date();
    const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const futureEnd   = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const pad = n => String(n).padStart(2, '0');
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);

    const booking = await createBooking(customer._id, property._id, {
      date: today,
      timeSlot: {
        start: `${pad(futureStart.getUTCHours())}:${pad(futureStart.getUTCMinutes())}`,
        end:   `${pad(futureEnd.getUTCHours())}:${pad(futureEnd.getUTCMinutes())}`,
      },
      status: 'booked',
    });

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not valid yet/i);
    expect(res.body.validFrom).toBeTruthy();
    expect(res.body.bookingStart).toBeTruthy();
  });

  test('scanning within 30-min window succeeds', async () => {
    // Booking starts 20 minutes from now (UTC) — inside the 30-min window
    const now = new Date();
    const soonStart = new Date(now.getTime() + 20 * 60 * 1000);
    const soonEnd   = new Date(now.getTime() + 80 * 60 * 1000);
    const pad = n => String(n).padStart(2, '0');
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);

    const booking = await createBooking(customer._id, property._id, {
      date: today,
      timeSlot: {
        start: `${pad(soonStart.getUTCHours())}:${pad(soonStart.getUTCMinutes())}`,
        end:   `${pad(soonEnd.getUTCHours())}:${pad(soonEnd.getUTCMinutes())}`,
      },
      status: 'booked',
    });

    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ qrData: booking._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('scan-qr requires auth', async () => {
    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .send({ qrData: 'anything' });
    expect(res.status).toBe(401);
  });

  test('scan-qr returns 400 when qrData is missing', async () => {
    const res = await request(app)
      .post('/api/bookings/scan-qr')
      .set('Authorization', `Bearer ${secToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. MANUAL TOKEN CHECK-IN
// ═══════════════════════════════════════════════════════════════════════════
describe('Manual token check-in', () => {
  test('valid token grants access', async () => {
    const booking = await createBooking(customer._id, property._id);

    const res = await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ token: booking.bookingToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.status).toBe('active');
    expect(res.body.booking.qrUsed).toBe(true);
  });

  test('token is case-insensitive', async () => {
    const booking = await createBooking(customer._id, property._id);

    const res = await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ token: booking.bookingToken.toLowerCase() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('reusing a token returns 400', async () => {
    const booking = await createBooking(customer._id, property._id);

    await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ token: booking.bookingToken });

    const res = await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ token: booking.bookingToken });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already been used/i);
  });

  test('invalid token returns 404', async () => {
    const res = await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ token: 'XXXXXX' });
    expect(res.status).toBe(404);
  });

  test('missing token body returns 400', async () => {
    const res = await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('token used too early returns 400 with validFrom', async () => {
    const now = new Date();
    const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const futureEnd   = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const pad = n => String(n).padStart(2, '0');
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);

    const booking = await createBooking(customer._id, property._id, {
      date: today,
      timeSlot: {
        start: `${pad(futureStart.getUTCHours())}:${pad(futureStart.getUTCMinutes())}`,
        end:   `${pad(futureEnd.getUTCHours())}:${pad(futureEnd.getUTCMinutes())}`,
      },
      status: 'booked',
    });

    const res = await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ token: booking.bookingToken });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not valid yet/i);
    expect(res.body.validFrom).toBeTruthy();
  });

  test('token from different owner\'s property returns 403', async () => {
    const { user: owner2 } = await createUser({ role: 'propertyOwner' });
    const property2 = await createProperty(owner2._id);
    const booking = await createBooking(customer._id, property2._id);

    const res = await request(app)
      .post('/api/bookings/checkin-token')
      .set('Authorization', `Bearer ${secToken}`)
      .send({ token: booking.bookingToken });

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. END SESSION
// ═══════════════════════════════════════════════════════════════════════════
describe('End session', () => {
  test('security officer can end an active session', async () => {
    const booking = await createBooking(customer._id, property._id, {
      status: 'active',
      attendanceStatus: 'confirmed',
      qrUsed: true,
    });

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/end-session`)
      .set('Authorization', `Bearer ${secToken}`);

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('ended');
  });

  test('ending a non-active booking returns 400', async () => {
    const booking = await createBooking(customer._id, property._id, { status: 'booked' });

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/end-session`)
      .set('Authorization', `Bearer ${secToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not currently active/i);
  });

  test('end-session requires auth', async () => {
    const booking = await createBooking(customer._id, property._id, { status: 'active' });
    const res = await request(app).patch(`/api/bookings/${booking._id}/end-session`);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════
describe('Report generation', () => {
  const from = '2025-01-01';
  const to   = '2025-12-31';

  beforeEach(async () => {
    // Seed a booking in the report date range
    const reportDate = new Date('2025-06-15');
    await Booking.create({
      customerId: customer._id,
      propertyId: property._id,
      date: reportDate,
      timeSlot: { start: '10:00', end: '11:00' },
      status: 'booked',
      paymentMethod: 'online',
      totalAmount: 100,
      attendanceStatus: 'confirmed',
    });
  });

  test('booking report returns correct structure', async () => {
    const res = await request(app)
      .get('/api/bookings/reports')
      .set('Authorization', `Bearer ${secToken}`)
      .query({ type: 'booking', from, to });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('booking');
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('confirmed');
    expect(res.body).toHaveProperty('noShow');
    expect(res.body).toHaveProperty('pending');
    expect(res.body).toHaveProperty('revenue');
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  test('booking report counts confirmed attendance correctly', async () => {
    const res = await request(app)
      .get('/api/bookings/reports')
      .set('Authorization', `Bearer ${secToken}`)
      .query({ type: 'booking', from, to });

    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(1);
    expect(res.body.noShow).toBe(0);
  });

  test('facility report returns per-facility breakdown', async () => {
    const res = await request(app)
      .get('/api/bookings/reports')
      .set('Authorization', `Bearer ${secToken}`)
      .query({ type: 'facility', from, to });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('facility');
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body.rows[0]).toHaveProperty('name');
    expect(res.body.rows[0]).toHaveProperty('bookings');
    expect(res.body.rows[0]).toHaveProperty('revenue');
  });

  test('report requires type, from, and to params', async () => {
    const res = await request(app)
      .get('/api/bookings/reports')
      .set('Authorization', `Bearer ${secToken}`)
      .query({ type: 'booking' }); // missing from/to

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('invalid report type returns 400', async () => {
    const res = await request(app)
      .get('/api/bookings/reports')
      .set('Authorization', `Bearer ${secToken}`)
      .query({ type: 'unknown', from, to });

    expect(res.status).toBe(400);
  });

  test('report requires auth', async () => {
    const res = await request(app)
      .get('/api/bookings/reports')
      .query({ type: 'booking', from, to });
    expect(res.status).toBe(401);
  });

  test('report returns 403 for non-security-officer', async () => {
    const res = await request(app)
      .get('/api/bookings/reports')
      .set('Authorization', `Bearer ${customerToken}`)
      .query({ type: 'booking', from, to });
    expect(res.status).toBe(403);
  });

  test('report only includes bookings from officer\'s owner properties', async () => {
    // Booking for a different owner — should NOT appear in report
    const { user: owner2 } = await createUser({ role: 'propertyOwner' });
    const property2 = await createProperty(owner2._id);
    await Booking.create({
      customerId: customer._id,
      propertyId: property2._id,
      date: new Date('2025-06-15'),
      timeSlot: { start: '12:00', end: '13:00' },
      status: 'booked',
      paymentMethod: 'online',
      totalAmount: 200,
      attendanceStatus: 'confirmed',
    });

    const res = await request(app)
      .get('/api/bookings/reports')
      .set('Authorization', `Bearer ${secToken}`)
      .query({ type: 'booking', from, to });

    expect(res.status).toBe(200);
    // Only 1 booking (from our property), not 2
    expect(res.body.total).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. SEND REPORT TO OWNER
// ═══════════════════════════════════════════════════════════════════════════
describe('Send report to owner', () => {
  test('security officer can send a report summary to owner', async () => {
    const res = await request(app)
      .post('/api/bookings/reports/send')
      .set('Authorization', `Bearer ${secToken}`)
      .send({
        type: 'booking',
        from: '2025-01-01',
        to: '2025-12-31',
        summary: '10 total, 8 confirmed, 2 no-shows',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('send report requires auth', async () => {
    const res = await request(app)
      .post('/api/bookings/reports/send')
      .send({ type: 'booking', from: '2025-01-01', to: '2025-12-31', summary: 'test' });
    expect(res.status).toBe(401);
  });

  test('send report returns 403 for customer', async () => {
    const res = await request(app)
      .post('/api/bookings/reports/send')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'booking', from: '2025-01-01', to: '2025-12-31', summary: 'test' });
    expect(res.status).toBe(403);
  });
});
