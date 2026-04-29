const mongoose = require('mongoose');

const seatRowSchema = new mongoose.Schema({
  rowLabel: { type: String, required: true },
  seatCount: { type: Number, required: true, min: 1 },
}, { _id: false });

const venueSchema = new mongoose.Schema({
  // Basic info
  name:          { type: String, required: true },
  venueType:     { type: String, required: true }, // e.g. Stadium, Arena, Hall
  totalCapacity: { type: Number, required: true },
  description:   { type: String, default: '' },

  // Location
  address:       { type: String, required: true },
  city:          { type: String, required: true },
  locationType:  { type: String, enum: ['indoor', 'outdoor'], required: true },

  // Seat details (indoor only)
  seatLayoutImage: { type: String, default: '' },
  seatRows:        { type: [seatRowSchema], default: [] },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Venue', venueSchema);
