const mongoose = require('mongoose');

const ticketTierSchema = new mongoose.Schema({
  tier: { type: String, enum: ['Gold', 'Silver', 'Bronze'], required: true },
  price: { type: Number, required: true },
  totalQuantity: { type: Number, required: true },
  soldQuantity: { type: Number, default: 0 }
});

const eventSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  bannerImage: { type: String },
  ticketTiers: [ticketTierSchema],
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
