const Property = require('../models/Property');

// @desc    Create a new property
// @route   POST /api/properties
// @access  Private/Owner or Admin
const createProperty = async (req, res) => {
  try {
    const { name, sportType, description, images, pricePerHour, location, availableHours, slotDurationMinutes, institute } = req.body;

    // Check if user is trying to set ownerId (only admin can assign to others, owner creates for self)
    const ownerId = req.user.role === 'admin' && req.body.ownerId ? req.body.ownerId : req.user._id;

    const property = await Property.create({
      ownerId,
      name,
      sportType,
      description,
      images,
      pricePerHour,
      location,
      availableHours,
      slotDurationMinutes,
      institute: institute || ''
    });

    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all active properties
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.ownerId) {
      query.ownerId = req.query.ownerId;
    }
    const properties = await Property.find(query).populate('ownerId', 'name email');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get property by ID
// @route   GET /api/properties/:id
// @access  Public
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('ownerId', 'name email');
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private/Owner or Admin
const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Ensure owner or admin
    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedProperty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private/Admin
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    await property.deleteOne();
    res.json({ message: 'Property removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deactivate a property
// @route   PATCH /api/properties/:id/deactivate
// @access  Private/Owner or Admin
const deactivateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    property.isActive = false;
    await property.save();
    
    res.json({ message: 'Property deactivated', property });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  deactivateProperty
};
