const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tier: { type: String, enum: ['Gold', 'Silver', 'Bronze'], required: true },
  price: { type: Number, required: true },
  stripePaymentIntentId: { type: String },
  qrCodeData: { type: String },
  status: { type: String, enum: ['active', 'used', 'refunded'], default: 'active' },
  purchasedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
