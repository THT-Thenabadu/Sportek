/**
 * routes/settingsRoutes.js
 * Simple key-value site settings stored in MongoDB.
 * Endpoints:
 *   GET  /api/settings/:key          — public, fetch a setting value
 *   PUT  /api/settings/:key          — admin only, update a setting value
 */
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const SiteSetting = require('../models/SiteSetting');

// GET /api/settings/:key — public
router.get('/:key', async (req, res) => {
  try {
    const setting = await SiteSetting.findOne({ key: req.params.key });
    res.json({ key: req.params.key, value: setting ? setting.value : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/settings/:key — admin only
router.put('/:key', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const { value } = req.body;
    const setting = await SiteSetting.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value },
      { upsert: true, new: true }
    );
    res.json(setting);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
