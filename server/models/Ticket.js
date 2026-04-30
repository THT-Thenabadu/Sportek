const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  eventId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },

  // category supports both old enum tiers and new free-text category names
  tier:     { type: String, default: '' },   // legacy field
  category: { type: String, default: '' },   // new free-text category name

  quantity: { type: Number, default: 1 },    // how many tickets in this booking
  price:    { type: Number, required: true }, // price per ticket
  seats:    [{ row: String, seat: Number, seatId: String }], // selected seats

  stripePaymentIntentId: { type: String },
  qrCodeData: { type: String },

  // payment status
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'paid'
  },

  status: {
    type: String,
    enum: ['active', 'used', 'cancelled', 'refunded'],
    default: 'active'
  },
}, { timestamps: true });

// Virtual: display category (new or legacy)
ticketSchema.virtual('categoryName').get(function () {
  return this.category || this.tier || 'General';
});

module.exports = mongoose.model('Ticket', ticketSchema);
