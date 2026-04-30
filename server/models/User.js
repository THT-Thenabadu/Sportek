const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  phone: { type: String },
  profilePicture: { type: String },
  role: { type: String, enum: ['superAdmin', 'admin', 'propertyOwner', 'customer', 'securityOfficer'], default: 'customer' },
  isBanned: { type: Boolean, default: false },
  institute: { type: String }, // Optional institute for extended booking advantages
  associatedProperty: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  associatedOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
