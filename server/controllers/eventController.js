const Event = require('../models/Event');
const Venue = require('../models/Venue');

// For indoor events, compute totalQuantity from assigned rows
const computeIndoorQuantities = async (eventData) => {
  if (eventData.venueType !== 'indoor' || !eventData.venueId || !eventData.ticketCategories?.length) {
    return eventData;
  }
  try {
    const venue = await Venue.findById(eventData.venueId);
    if (!venue || !venue.seatRows?.length) return eventData;

    const rowMap = {};
    venue.seatRows.forEach(r => { rowMap[r.rowLabel] = r.seatCount; });

    eventData.ticketCategories = eventData.ticketCategories.map(cat => {
      if (cat.rows?.length) {
        const qty = cat.rows.reduce((s, r) => s + (rowMap[r] || 0), 0);
        return { ...cat, totalQuantity: qty };
      }
      return cat;
    });
  } catch (e) {
    console.error('computeIndoorQuantities error:', e.message);
  }
  return eventData;
};

// Auto-expire events whose booking deadline has passed
const applyExpiry = (events) => {
  const now = new Date();
  return events.map(e => {
    const obj = e.toObject ? e.toObject() : e;
    if (obj.status === 'live' && obj.bookingDeadline && new Date(obj.bookingDeadline) < now) {
      obj.status = 'expired';
    }
    return obj;
  });
};

// @route GET /api/events
const getEvents = async (req, res) => {
  try {
    const events = await Event.find().populate('venueId', 'name city address seatRows locationType').sort('-createdAt');
    // Persist expiry in DB for any newly expired events
    const now = new Date();
    const toExpire = events.filter(e => e.status === 'live' && e.bookingDeadline && new Date(e.bookingDeadline) < now);
    if (toExpire.length) {
      await Event.updateMany(
        { _id: { $in: toExpire.map(e => e._id) } },
        { $set: { status: 'expired' } }
      );
      toExpire.forEach(e => { e.status = 'expired'; });
    }
    res.json(applyExpiry(events));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/events
const createEvent = async (req, res) => {
  try {
    const data = await computeIndoorQuantities({ ...req.body });
    const event = await Event.create({ ...data, createdBy: req.user._id });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @route PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    const data = await computeIndoorQuantities({ ...req.body });
    const event = await Event.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @route DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createEvent, getEvents, updateEvent, deleteEvent };
