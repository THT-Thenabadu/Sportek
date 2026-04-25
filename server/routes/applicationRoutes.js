const express = require('express');
const router = express.Router();
const { createApplication, getApplications, updateApplicationStatus } = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, createApplication)
  .get(protect, authorize('admin', 'superAdmin'), getApplications);

const { getMyApplication, dismissCredentials, resetSecurityCredentials } = require('../controllers/applicationController');

router.route('/my-application')
  .get(protect, authorize('propertyOwner'), getMyApplication);

router.route('/my-application/dismiss-credentials')
  .patch(protect, authorize('propertyOwner'), dismissCredentials);

router.route('/:id/security-credentials')
  .get(protect, authorize('admin', 'superAdmin'), resetSecurityCredentials);

router.route('/:id/approve')
  .patch(
    protect,
    authorize('admin', 'superAdmin'),
    (req, res, next) => { req.body = req.body || {}; req.body.status = 'approved'; next(); },
    updateApplicationStatus
  );

router.route('/:id/decline')
  .patch(
    protect,
    authorize('admin', 'superAdmin'),
    (req, res, next) => { req.body = req.body || {}; req.body.status = 'declined'; next(); },
    updateApplicationStatus
  );

module.exports = router;
