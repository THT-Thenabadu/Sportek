const mongoose = require('mongoose');

const assetLogSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  checkedOutAt: { type: Date },
  returnedAt: { type: Date },
  returnedStatus: { type: String, enum: ['returned', 'damaged', 'lost'] },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AssetLog', assetLogSchema);
