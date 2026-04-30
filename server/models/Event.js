const mongoose = require('mongoose');

const ticketCategorySchema = new mongoose.Schema({
  name:          { type: String, required: true },   // e.g. "VIP", "General"
  price:         { type: Number, required: true },
  totalQuantity: { type: Number, required: true },
  soldQuantity:  { type: Number, default: 0 },
  // indoor: which seat rows belong to this category
  rows:          [{ type: String }],
}, { _id: false });

const eventSchema = new mongoose.Schema({
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Section 1 — Basic info
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  eventType:    { type: String, enum: ['music', 'drama', 'sport', 'other'], default: 'other' },
  bannerImage:  { type: String, default: '' },

  // Section 2 — Date & time
  date:         { type: Date, required: true },
  time:         { type: String, required: true },

  // Section 3 — Venue
  venueType:    { type: String, enum: ['indoor', 'outdoor'], required: true },
  venueId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
  location:     { type: String, default: '' },   // used for outdoor / display

  // Section 4 — Operations
  organizerName:    { type: String, default: '' },
  bookingDeadline:  { type: Date, required: true },

  // Section 5 — Ticket categories
  ticketCategories: [ticketCategorySchema],

  // Status — auto-set to 'expired' when bookingDeadline passes
  status: {
    type: String,
    enum: ['draft', 'live', 'expired', 'cancelled'],
    default: 'draft'
  },

  // Legacy field kept for backward compat
  ticketTiers: { type: Array, default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
