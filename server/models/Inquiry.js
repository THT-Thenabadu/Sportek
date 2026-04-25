const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, enum: ['General', 'Technical', 'Booking', 'Facility'], required: true },
  status: { type: String, enum: ['open', 'replied', 'resolved', 'archived'], default: 'open' },
  adminReply: { type: String },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  repliedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
