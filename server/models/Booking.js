const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  date: { type: Date, required: true },
  timeSlot: { 
    start: { type: String, required: true }, 
    end: { type: String, required: true } 
  },
  status: { type: String, enum: ['pending', 'pending_onsite', 'booked', 'completed', 'cancelled'], default: 'pending' },
  paymentMethod: { type: String, enum: ['online', 'onsite'], default: 'online' },
  lockExpiresAt: { type: Date },
  selectedAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  totalAmount: { type: Number, required: true },
  stripePaymentIntentId: { type: String },
  attendanceStatus: { type: String, enum: ['pending', 'confirmed', 'noShow'], default: 'pending' },
  qrCodeData: { type: String },
  passkey: { type: String, default: '' },
  bundledAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }]
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
