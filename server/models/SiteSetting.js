/**
 * models/SiteSetting.js
 * Generic key-value store for site-level configuration.
 */
const mongoose = require('mongoose');

const SiteSettingSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true, trim: true },
  value: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('SiteSetting', SiteSettingSchema);
