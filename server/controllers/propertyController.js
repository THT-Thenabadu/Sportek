const Property = require('../models/Property');

// @desc    Create a new property
// @route   POST /api/properties
// @access  Private/Owner or Admin
const createProperty = async (req, res) => {
  try {
    const { name, sportType, description, images, pricePerHour, location, availableHours, slotDurationMinutes, institution } = req.body;
    
    // Check if user is trying to set ownerId (only admin can assign to others, owner creates for self)
    const ownerId = req.user.role === 'admin' && req.body.ownerId ? req.body.ownerId : req.user._id;

    const User = require('../models/User');
    const owner = await User.findById(ownerId);

    const property = await Property.create({
      ownerId,
      institution: institution || owner?.institution || '',
      name,
      sportType,
      description,
      images,
      pricePerHour,
      location,
      availableHours,
      slotDurationMinutes
    });

    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get my properties
// @route   GET /api/properties/my-properties
// @access  Private/Owner or Admin
const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user._id })
      .populate('ownerId', 'name email')
      .populate('bundledAssets');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all active properties
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res) => {
  try {
    const properties = await Property.find({ isActive: true })
      .populate('ownerId', 'name email')
      .populate('bundledAssets');
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
    const property = await Property.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('bundledAssets');
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
// @access  Private/Owner or Admin
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
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

// @desc    Get properties with availability status
// @route   GET /api/properties/owner/:ownerId/availability
// @access  Private
const getPropertyAvailability = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const properties = await Property.find({ ownerId });

    const Booking = require('../models/Booking');

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

    const propertyIds = properties.map(p => p._id);
    const startOfToday = new Date(todayStr);
    const endOfToday = new Date(todayStr);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const bookings = await Booking.find({
      propertyId: { $in: propertyIds },
      status: 'booked',
      date: { $gte: startOfToday, $lt: endOfToday }
    });

    const propertiesWithAvailability = properties.map(p => {
      const propertyBookings = bookings.filter(b => b.propertyId.toString() === p._id.toString());
      
      const isOccupied = propertyBookings.some(b => {
        return b.timeSlot.start <= currentTimeStr && b.timeSlot.end > currentTimeStr;
      });

      return {
        ...p.toObject(),
        isAvailable: !isOccupied
      };
    });

    res.json(propertiesWithAvailability);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const blockSlot = async (req, res) => {
  try {
    const { date, timeSlotStart } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);

    const alreadyBlocked = property.blockedSlots && property.blockedSlots.some(b => {
      const bDate = new Date(b.date);
      bDate.setHours(0,0,0,0);
      return bDate.getTime() === targetDate.getTime() &&
             b.timeSlot.start === timeSlotStart;
    });

    if (!alreadyBlocked) {
      property.blockedSlots = property.blockedSlots || [];
      property.blockedSlots.push({ date: targetDate, timeSlot: { start: timeSlotStart } });
      await property.save();
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unblockSlot = async (req, res) => {
  try {
    const { date, timeSlotStart } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);

    if (property.blockedSlots) {
      property.blockedSlots = property.blockedSlots.filter(b => {
        const bDate = new Date(b.date);
        bDate.setHours(0,0,0,0);
        const match = bDate.getTime() === targetDate.getTime() &&
                      b.timeSlot.start === timeSlotStart;
        return !match;
      });
      await property.save();
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProperty,
  getProperties,
  getMyProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  deactivateProperty,
  getPropertyAvailability,
  blockSlot,
  unblockSlot
};
