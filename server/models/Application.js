const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName:  { type: String, required: true },
  address:       { type: String, required: true },
  nicOrPassport: { type: String, required: true },
  bankDetails:   { type: String, required: true },
  propertyDescription: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  declineReason: { type: String },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:    { type: Date },

  // Security officer credentials — stored temporarily so the owner can see them on first login.
  // securityTempPassword is cleared (set to null) once the owner dismisses the card.
  securityEmail:        { type: String, default: null },
  securityTempPassword: { type: String, default: null },   // plain-text, one-time visible
  credentialsDismissed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
