const Asset = require('../models/Asset');
const Property = require('../models/Property');

// @desc    Create a new asset
// @route   POST /api/assets
// @access  Private/Owner or Admin
const createAsset = async (req, res) => {
  try {
    const { name, category, assetType, property, quantity, availableQuantity, healthStatus, notes } = req.body;

    const asset = await Asset.create({
      name,
      category,
      assetType,
      property,
      quantity,
      availableQuantity: availableQuantity ?? quantity ?? 1,
      healthStatus,
      notes
    });

    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get bundled assets for a property
// @route   GET /api/assets/bundled/:propertyId
// @access  Public
const getBundledAssets = async (req, res) => {
  try {
    const prop = await Property.findById(req.params.propertyId);
    if (!prop) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Return all non-retired assets that belong to this property and have stock available
    const bundledAssets = await Asset.find({
      property: prop._id,
      healthStatus: { $in: ['good', 'fair'] },
      availableQuantity: { $gt: 0 }
    });

    res.json(bundledAssets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an asset
// @route   PUT /api/assets/:id
// @access  Private/Owner or Admin
const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('property', 'ownerId');
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // Authorization: must be the property owner or an admin
    if (asset.property?.ownerId?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this asset' });
    }

    const updatedAsset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedAsset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an asset
// @route   DELETE /api/assets/:id
// @access  Private/Owner or Admin
const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('property', 'ownerId');
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // Authorization: must be the property owner or an admin
    if (asset.property?.ownerId?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this asset' });
    }

    await asset.deleteOne();
    res.json({ message: 'Asset removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAsset,
  getBundledAssets,
  updateAsset,
  deleteAsset
};

