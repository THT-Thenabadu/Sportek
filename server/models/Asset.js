const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['Equipment', 'Facility Add-on', 'Safety/Misc'],
    required: true
  },
  assetType: { type: String, required: true }, // e.g. 'Tennis Racquet', 'Football'
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  quantity: { type: Number, default: 1 },
  availableQuantity: { type: Number, default: 1 },
  healthStatus: {
    type: String,
    enum: ['good', 'fair', 'damaged', 'retired'],
    default: 'good'
  },
  isReturned: { type: Boolean, default: true },
  lastUsedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
