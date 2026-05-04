const mongoose = require('mongoose');

const entryLogSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  idNumber:    { type: String, required: true },
  entryTime:   { type: String, required: true },
  entryDate:   { type: Date,   required: true },
  exitTime:    { type: String, default: null },   // set when person leaves
  type:        { type: String, enum: ['visitor', 'member', 'maintenance'], required: true },
  venue:       { type: String, required: true },
  propertyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  loggedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('EntryLog', entryLogSchema);
