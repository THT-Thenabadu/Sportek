const bcrypt = require('bcrypt');
const Application = require('../models/Application');
const User = require('../models/User');

// ── Helpers ───────────────────────────────────────────────────────────────────

const generatePassword = () => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Sportek@${digits}`;
};

// ── Controllers ───────────────────────────────────────────────────────────────

/** POST /api/applications — customer submits owner application */
const createApplication = async (req, res) => {
  try {
    const application = await Application.create({
      applicantId: req.user._id,
      ...req.body
    });
    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/** GET /api/applications — admin lists all applications */
const getApplications = async (req, res) => {
  try {
    const apps = await Application.find({}).populate('applicantId', 'name email phone');
    res.json(apps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** GET /api/applications/my-application — property owner fetches their own application */
const getMyApplication = async (req, res) => {
  try {
    const app = await Application.findOne({ applicantId: req.user._id });
    if (!app) return res.status(404).json({ message: 'No application found' });
    res.json(app);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** PATCH /api/applications/my-application/dismiss-credentials
 *  Property owner acknowledges they have saved the security credentials.
 *  Clears the temp password from DB and sets credentialsDismissed = true.
 */
const dismissCredentials = async (req, res) => {
  try {
    const app = await Application.findOne({ applicantId: req.user._id });
    if (!app) return res.status(404).json({ message: 'No application found' });

    app.credentialsDismissed = true;
    app.securityTempPassword = null; // scrub plain-text password from DB
    await app.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** PATCH /api/applications/:id/approve  or  /decline — admin decision */
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, declineReason } = req.body;

    const application = await Application.findById(req.params.id).populate('applicantId', 'name email');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Idempotent guard
    if (application.status === status) {
      return res.json({ application, securityOfficer: null });
    }

    application.status = status;
    application.reviewedBy = req.user._id;
    application.reviewedAt = Date.now();
    if (status === 'declined') application.declineReason = declineReason;

    let securityOfficerCredentials = null;

    if (status === 'approved') {
      const owner = application.applicantId;

      // 1. Promote applicant to propertyOwner
      await User.findByIdAndUpdate(owner._id, { role: 'propertyOwner', institution: application.businessName });

      // 2. Prevent duplicate security officers
      const existingOfficer = await User.findOne({
        role: 'securityOfficer',
        associatedOwner: owner._id
      });

      if (!existingOfficer) {
        // 3. Generate & hash credentials
        const plainPassword = generatePassword();
        const passwordHash  = await bcrypt.hash(plainPassword, 10);
        const secEmail = `security_${owner._id}@sportek.com`;
        const secName  = `${owner.name} Security`;

        // 4. Create security officer account
        const secUser = await User.create({
          name: secName,
          email: secEmail,
          passwordHash,
          role: 'securityOfficer',
          associatedOwner: owner._id
        });

        console.log(`[Applications] Security officer created: ${secEmail} for owner ${owner._id}`);

        // 5. Store credentials on the application so the property owner can see them on next login.
        //    securityTempPassword is cleared once the owner dismisses the card.
        application.securityEmail        = secEmail;
        application.securityTempPassword = plainPassword;  // plain-text, one-time
        application.credentialsDismissed = false;

        securityOfficerCredentials = { name: secUser.name, email: secEmail, password: plainPassword };
      } else {
        securityOfficerCredentials = {
          name:     existingOfficer.name,
          email:    existingOfficer.email,
          password: null  // pre-existing — password not available
        };
      }
    }

    await application.save();

    res.json({ application, securityOfficer: securityOfficerCredentials });
  } catch (error) {
    console.error('[ApplicationController] updateApplicationStatus error:', error);
    res.status(400).json({ message: error.message });
  }
};

/** GET /api/applications/:id/security-credentials
 *  Restores/Resets security officer credentials for an already approved application.
 *  Finds the security officer, generates a new password, updates the DB, and sets credentialsDismissed to false.
 */
const resetSecurityCredentials = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.status !== 'approved') return res.status(400).json({ message: 'Application must be approved first' });

    const ownerId = application.applicantId;

    const securityOfficer = await User.findOne({
      role: 'securityOfficer',
      associatedOwner: ownerId
    });

    if (!securityOfficer) return res.status(404).json({ message: 'No security officer account found for this owner. Was it created?' });

    // Generate new credentials
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Update Security Officer
    securityOfficer.passwordHash = passwordHash;
    await securityOfficer.save();

    // Update Application
    application.securityTempPassword = plainPassword;
    application.securityEmail = securityOfficer.email;
    application.credentialsDismissed = false;
    await application.save();

    res.json({
      name: securityOfficer.name,
      email: securityOfficer.email,
      password: plainPassword
    });
  } catch (error) {
    console.error('[ApplicationController] resetSecurityCredentials error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createApplication,
  getApplications,
  getMyApplication,
  dismissCredentials,
  updateApplicationStatus,
  resetSecurityCredentials
};
