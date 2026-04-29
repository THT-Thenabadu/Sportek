const express = require('express');
const router = express.Router();
const {
  createRescheduleRequest,
  getCustomerRescheduleRequests,
  getOwnerRescheduleRequests,
  approveRescheduleRequest,
  declineRescheduleRequest
} = require('../controllers/rescheduleController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('customer'), createRescheduleRequest);

router.route('/customer')
  .get(protect, authorize('customer'), getCustomerRescheduleRequests);

router.route('/owner')
  .get(protect, authorize('propertyOwner'), getOwnerRescheduleRequests);

router.route('/:id/approve')
  .patch(protect, authorize('propertyOwner', 'admin'), approveRescheduleRequest);

router.route('/:id/decline')
  .patch(protect, authorize('propertyOwner', 'admin'), declineRescheduleRequest);

module.exports = router;
