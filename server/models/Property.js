const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  sportType: { type: String, required: true },
  description: { type: String },
  images: [{ type: String }],
  pricePerHour: { type: Number, required: true },
  location: { 
    address: { type: String, required: true }, 
    lat: { type: Number }, 
    lng: { type: Number } 
  },
  availableHours: { 
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  slotDurationMinutes: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
