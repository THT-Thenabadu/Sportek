const express = require('express');
const router = express.Router();
const { 
  createProperty, 
  getProperties, 
  getPropertyById, 
  updateProperty, 
  deleteProperty, 
  deactivateProperty,
  getPropertyAvailability
} = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');

router.route('/owner/:ownerId/availability')
  .get(protect, getPropertyAvailability);

router.route('/')
  .get(getProperties)
  .post(protect, authorize('admin', 'propertyOwner'), createProperty);

router.route('/:id')
  .get(getPropertyById)
  .put(protect, authorize('admin', 'propertyOwner'), updateProperty)
  .delete(protect, authorize('admin'), deleteProperty);

router.route('/:id/deactivate')
  .patch(protect, authorize('admin', 'propertyOwner'), deactivateProperty);

module.exports = router;
