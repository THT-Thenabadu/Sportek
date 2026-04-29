const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');

router.route('/owner/:ownerId/availability')
  .get(protect, getPropertyAvailability);

// Security officer gets availability for their own associated owner's properties
router.get('/my-availability', protect, authorize('securityOfficer'), async (req, res) => {
  try {
    const ownerId = req.user.associatedOwner;
    if (!ownerId) return res.status(400).json({ message: 'No associated property owner found for this account.' });

    const Property = require('../models/Property');
    const Booking = require('../models/Booking');

    const properties = await Property.find({ ownerId });
    if (!properties.length) return res.json([]);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTimeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const propertyIds = properties.map(p => p._id);
    const startOfToday = new Date(todayStr);
    const endOfToday = new Date(todayStr);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const bookings = await Booking.find({
      propertyId: { $in: propertyIds },
      status: { $in: ['booked', 'active'] },
      date: { $gte: startOfToday, $lt: endOfToday }
    });

    const result = properties.map(p => {
      const pBookings = bookings.filter(b => b.propertyId.toString() === p._id.toString());
      const isOccupied = pBookings.some(b =>
        b.timeSlot.start <= currentTimeStr && b.timeSlot.end > currentTimeStr
      );
      return { ...p.toObject(), isAvailable: !isOccupied };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.route('/')
  .get(getProperties)
  .post(protect, authorize('admin', 'propertyOwner'), createProperty);

router.route('/my-properties')
  .get(protect, authorize('propertyOwner', 'admin'), getMyProperties);

router.route('/:id')
  .get(getPropertyById)
  .put(protect, authorize('admin', 'propertyOwner'), updateProperty)
  .delete(protect, authorize('admin', 'propertyOwner'), deleteProperty);

router.route('/:id/deactivate')
  .patch(protect, authorize('admin', 'propertyOwner'), deactivateProperty);

router.route('/:id/block-slot')
  .patch(protect, authorize('admin', 'propertyOwner'), blockSlot);

router.route('/:id/unblock-slot')
  .patch(protect, authorize('admin', 'propertyOwner'), unblockSlot);

module.exports = router;
