const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { lockSeat, unlockSeat, unlockAllForUser, getLockedSeats } = require('../services/seatLockService');
const Ticket = require('../models/Ticket');

// GET /api/seats/:eventId/status
router.get('/:eventId/status', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Clean up abandoned pending tickets older than 15 minutes
    const tenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    await Ticket.deleteMany({
      eventId,
      paymentStatus: 'pending',
      createdAt: { $lt: tenMinAgo },
    });

    // Booked seats — only from PAID tickets
    const tickets = await Ticket.find({
      eventId,
      status: { $in: ['active', 'used'] },
      paymentStatus: 'paid',
    }).select('seats category');

    const bookedSeats = [];
    tickets.forEach(t => {
      (t.seats || []).forEach(s => {
        bookedSeats.push({ seatId: s.seatId, row: s.row, seat: s.seat, category: t.category });
      });
    });

    // Locked seats from memory (5-min TTL, auto-cleaned in getLockedSeats)
    const lockedSeats = getLockedSeats(eventId);

    res.json({ bookedSeats, lockedSeats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/seats/:eventId/lock
// Lock a seat for the current user
router.post('/:eventId/lock', protect, (req, res) => {
  const { eventId } = req.params;
  const { seatId } = req.body;
  if (!seatId) return res.status(400).json({ message: 'seatId required' });

  const result = lockSeat(eventId, seatId, req.user._id.toString());
  if (!result.success) {
    return res.status(409).json({ message: 'Seat is already locked by another user' });
  }
  res.json({ success: true, expiresAt: result.expiresAt });
});

// POST /api/seats/:eventId/unlock
// Unlock a seat
router.post('/:eventId/unlock', protect, (req, res) => {
  const { eventId } = req.params;
  const { seatId } = req.body;
  if (seatId) {
    unlockSeat(eventId, seatId, req.user._id.toString());
  } else {
    unlockAllForUser(eventId, req.user._id.toString());
  }
  res.json({ success: true });
});

module.exports = router;
