const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  date: { type: Date, required: true },
  timeSlot: { 
    start: { type: String, required: true }, 
    end: { type: String, required: true } 
  },
  status: { type: String, enum: ['pending', 'pending_onsite', 'booked', 'active', 'ended', 'completed', 'cancelled'], default: 'pending' },
  paymentMethod: { type: String, enum: ['online', 'onsite'], default: 'online' },
  lockExpiresAt: { type: Date },
  selectedAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  totalAmount: { type: Number, required: true },
  stripePaymentIntentId: { type: String },
  attendanceStatus: { type: String, enum: ['pending', 'confirmed', 'noShow'], default: 'pending' },
  qrCodeData: { type: String },
  qrUsed: { type: Boolean, default: false },
  passkey: { type: String, default: '' },
  bookingToken: { type: String, unique: true, sparse: true },
  bundledAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }]
}, { timestamps: true });

// Generate unique booking token before saving
bookingSchema.pre('save', async function() {
  if (!this.bookingToken && this.isNew) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.bookingToken = token;
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
