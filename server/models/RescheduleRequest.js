const mongoose = require('mongoose');

const rescheduleRequestSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  currentDate: { type: Date, required: true },
  currentTimeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  requestedDate: { type: Date, required: true },
  requestedTimeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  customerMessage: { type: String, default: '' },
  ownerMessage: { type: String, default: '' },
  rescheduledTo: {
    date: { type: Date },
    timeSlot: {
      start: { type: String },
      end: { type: String }
    }
  },
  sameInstitution: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('RescheduleRequest', rescheduleRequestSchema);
