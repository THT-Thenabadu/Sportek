const RescheduleRequest = require('../models/RescheduleRequest');
const Booking = require('../models/Booking');
const Property = require('../models/Property');

// @desc    Submit a reschedule request
// @route   POST /api/reschedule
// @access  Private/Customer
const createRescheduleRequest = async (req, res) => {
  try {
    const { bookingId, requestedDate, requestedTimeSlot, customerMessage } = req.body;
    const booking = await Booking.findById(bookingId).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reschedule this booking' });
    }

    const customerInstitution = req.user.institution || '';
    const propertyInstitution = booking.propertyId.institution || '';
    const sameInstitution = customerInstitution.trim().toLowerCase() === propertyInstitution.trim().toLowerCase() && customerInstitution.trim() !== '';

    const request = await RescheduleRequest.create({
      bookingId,
      customerId: req.user._id,
      propertyId: booking.propertyId._id,
      currentDate: booking.date,
      currentTimeSlot: booking.timeSlot,
      requestedDate,
      requestedTimeSlot,
      customerMessage: customerMessage || '',
      status: 'pending',
      sameInstitution
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get reschedule requests for a customer
// @route   GET /api/reschedule/customer
// @access  Private/Customer
const getCustomerRescheduleRequests = async (req, res) => {
  try {
    const requests = await RescheduleRequest.find({ customerId: req.user._id });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending reschedule requests for an owner
// @route   GET /api/reschedule/owner
// @access  Private/Owner
const getOwnerRescheduleRequests = async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user._id });
    const propertyIds = properties.map(p => p._id);

    const requests = await RescheduleRequest.find({
      propertyId: { $in: propertyIds },
      status: 'pending'
    }).populate('customerId', 'name email institution')
      .populate('propertyId', 'name institution');

    const requestsWithAvailability = await Promise.all(requests.map(async (r) => {
      const existingBooking = await Booking.findOne({
        propertyId: r.propertyId._id,
        date: r.requestedDate,
        'timeSlot.start': r.requestedTimeSlot.start,
        status: { $in: ['booked', 'completed'] }
      });

      return {
        ...r.toObject(),
        isSlotAvailable: !existingBooking
      };
    }));

    res.json(requestsWithAvailability);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a reschedule request
// @route   PATCH /api/reschedule/:id/approve
// @access  Private/Owner
const approveRescheduleRequest = async (req, res) => {
  try {
    const { newDate, newTimeSlot } = req.body;
    const request = await RescheduleRequest.findById(req.params.id).populate('propertyId');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.propertyId.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const finalDate = newDate || request.requestedDate;
    const finalTimeSlot = newTimeSlot || request.requestedTimeSlot;

    // Check slot availability
    const existingBooking = await Booking.findOne({
      _id: { $ne: request.bookingId },
      propertyId: request.propertyId._id,
      date: finalDate,
      'timeSlot.start': finalTimeSlot.start,
      status: { $in: ['booked', 'completed'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'The selected slot is already booked by another customer.' });
    }

    // Update booking
    const booking = await Booking.findById(request.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.date = finalDate;
    booking.timeSlot = finalTimeSlot;
    await booking.save();

    // Update request
    request.status = 'approved';
    request.rescheduledTo = { date: finalDate, timeSlot: finalTimeSlot };
    await request.save();

    res.json({ message: 'Reschedule request approved', request });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Decline a reschedule request
// @route   PATCH /api/reschedule/:id/decline
// @access  Private/Owner
const declineRescheduleRequest = async (req, res) => {
  try {
    const { ownerMessage } = req.body;
    const request = await RescheduleRequest.findById(req.params.id).populate('propertyId');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.propertyId.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'declined';
    request.ownerMessage = ownerMessage || 'Reschedule request was declined.';
    await request.save();

    res.json({ message: 'Reschedule request declined', request });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createRescheduleRequest,
  getCustomerRescheduleRequests,
  getOwnerRescheduleRequests,
  approveRescheduleRequest,
  declineRescheduleRequest
};
