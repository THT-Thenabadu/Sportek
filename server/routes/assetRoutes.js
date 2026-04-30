const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Asset = require('../models/Asset');
const Property = require('../models/Property');

// POST /api/assets — propertyOwner only — create asset linked to owner's property
router.post('/', protect, authorize('propertyOwner'), async (req, res) => {
  try {
    const { name, category, assetType, property, quantity, availableQuantity, healthStatus, notes, image, description } = req.body;

    // Verify the property exists and check ownership
    const prop = await Property.findById(property);

    if (!prop || prop.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Property not found or not owned by you' });
    }

    const asset = await Asset.create({
      name,
      category,
      assetType,
      property: prop._id,
      quantity: quantity ?? 1,
      availableQuantity: availableQuantity ?? quantity ?? 1,
      healthStatus: healthStatus || 'good',
      notes: notes || '',
      image: image || '',
      description: description || ''
    });

    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/assets/admin/all — admin only — all assets across all properties
router.get('/admin/all', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const assets = await Asset.find({})
      .populate('property', 'name sportType location')
      .sort('-createdAt');
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/assets/property/:propertyId — propertyOwner or admin — all assets for a property
router.get('/property/:propertyId', protect, authorize('propertyOwner', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const assets = await Asset.find({ property: req.params.propertyId })
      .populate('property', 'name ownerId')
      .sort('name');
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/assets/bundled/:propertyId — public — available assets for booking selection
router.get('/bundled/:propertyId', async (req, res) => {
  try {
    const prop = await Property.findById(req.params.propertyId);
    if (!prop) return res.status(404).json({ message: 'Property not found' });

    const assets = await Asset.find({
      property: prop._id,
      healthStatus: { $in: ['good', 'fair'] },
      availableQuantity: { $gt: 0 }
    });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/assets/:id/health — propertyOwner only — update healthStatus and notes
router.patch('/:id/health', protect, authorize('propertyOwner'), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('property', 'ownerId');
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    if (asset.property?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { healthStatus, notes } = req.body;
    const update = {};
    if (healthStatus !== undefined) update.healthStatus = healthStatus;
    if (notes !== undefined) update.notes = notes;

    const updated = await Asset.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/assets/:id — propertyOwner only — update full asset details (name, image, desc, etc.)
router.put('/:id', protect, authorize('propertyOwner'), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('property', 'ownerId');
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    if (asset.property?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, category, assetType, quantity, availableQuantity, healthStatus, notes, image, description } = req.body;
    
    // Calculate new available quantity if total quantity changed
    let newAvailableQuantity = asset.availableQuantity;
    if (quantity !== undefined && quantity !== asset.quantity) {
      const diff = quantity - asset.quantity;
      newAvailableQuantity = Math.max(0, asset.availableQuantity + diff);
    }

    const update = {};
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (assetType !== undefined) update.assetType = assetType;
    if (quantity !== undefined) update.quantity = quantity;
    if (quantity !== undefined) update.availableQuantity = newAvailableQuantity;
    if (healthStatus !== undefined) update.healthStatus = healthStatus;
    if (notes !== undefined) update.notes = notes;
    if (image !== undefined) update.image = image;
    if (description !== undefined) update.description = description;

    const updated = await Asset.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/assets/:id/return — securityOfficer only — mark asset returned, restore quantity
router.patch('/:id/return', protect, authorize('securityOfficer'), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const updated = await Asset.findByIdAndUpdate(
      req.params.id,
      {
        isReturned: true,
        $inc: { availableQuantity: 1 },
        lastUsedBooking: asset.lastUsedBooking // preserve reference
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/assets/:id — propertyOwner only — only if returned and not in active booking
router.delete('/:id', protect, authorize('propertyOwner'), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('property', 'ownerId');
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    if (asset.property?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!asset.isReturned) {
      return res.status(400).json({ message: 'Asset cannot be deleted while it is checked out' });
    }

    if (asset.lastUsedBooking) {
      const Booking = require('../models/Booking');
      const activeBooking = await Booking.findOne({
        _id: asset.lastUsedBooking,
        status: { $in: ['pending', 'booked'] }
      });
      if (activeBooking) {
        return res.status(400).json({ message: 'Asset is linked to an active booking and cannot be deleted' });
      }
    }

    await asset.deleteOne();
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

