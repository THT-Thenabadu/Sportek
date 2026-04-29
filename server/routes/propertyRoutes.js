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
