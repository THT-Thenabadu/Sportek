const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  date: { type: Date, required: true },
  timeSlot: { 
    start: { type: String, required: true }, 
    end: { type: String, required: true } 
  },
  // Lifecycle: held → blocked (confirmed) | cancelled
  // Legacy statuses kept for compatibility: pending, pending_onsite, booked, completed
  status: { 
    type: String, 
    enum: ['held', 'blocked', 'pending', 'pending_onsite', 'booked', 'completed', 'cancelled', 'owner_blocked'],
    default: 'held'
  },
  paymentMethod: { type: String, enum: ['online', 'onsite'], default: 'online' },
  // Timestamp when the temporary hold expires (5-minute window)
  holdExpiresAt: { type: Date },
  // Legacy field kept for backward compatibility
  lockExpiresAt: { type: Date },
  selectedAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  totalAmount: { type: Number, required: true },
  stripePaymentIntentId: { type: String },
  attendanceStatus: { type: String, enum: ['pending', 'confirmed', 'noShow'], default: 'pending' },
  qrCodeData: { type: String },
  bundledAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  // Booking modification request via Customer Dashboard
  modificationRequest: {
    requestedDate: { type: Date },
    requestedTimeSlot: {
      start: { type: String },
      end: { type: String }
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason: { type: String }
  }
}, { timestamps: true });

// Index to efficiently query and release expired holds
bookingSchema.index({ status: 1, holdExpiresAt: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
