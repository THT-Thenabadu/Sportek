const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const User = require('../models/User');
const Booking = require('../models/Booking');
const RescheduleRequest = require('../models/RescheduleRequest');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const main = async () => {
  try {
    const BASE_URL = 'http://localhost:5000/api';
    dotenv.config();
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });

    console.log('1. Registering Customer A...');
    const customerEmail = `customer_a_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Customer A', email: customerEmail, password: 'password123', phone: '1234567890' })
    });
    const customerData = await regRes.json();
    const customerToken = customerData.token;

    console.log('2. Registering Owner A...');
    const ownerEmail = `owner_a_${Date.now()}@example.com`;
    const ownerReg = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Owner A', email: ownerEmail, password: 'password123', phone: '1234567890' })
    });
    const ownerData = await ownerReg.json();
    const ownerToken = ownerData.token;
    await User.findByIdAndUpdate(ownerData._id, { role: 'propertyOwner' });

    console.log('3. Owner adding a property...');
    const propRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        name: 'Reschedule Court',
        sportType: 'Tennis',
        description: 'Test court',
        pricePerHour: 40,
        location: { address: 'Address A' },
        availableHours: { start: '07:00', end: '21:00' },
        slotDurationMinutes: 60
      })
    });
    const propData = await propRes.json();

    console.log('4. Customer booking the property...');
    const bookingRes = await fetch(`${BASE_URL}/bookings/create-onsite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        propertyId: propData._id,
        date: '2026-05-10',
        timeSlotStart: '09:00',
        timeSlotEnd: '10:00'
      })
    });
    const bookingData = await bookingRes.json();
    console.log(`Booking created with status: ${bookingData.status}`);

    // Wait! The status is pending_onsite. It must be booked to reschedule!
    // Let's update the booking in the DB to 'booked'
    await Booking.findByIdAndUpdate(bookingData._id, { status: 'booked' });
    console.log('Booking updated to "booked" status.');

    console.log('5. Customer requesting a reschedule...');
    const reqRes = await fetch(`${BASE_URL}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        bookingId: bookingData._id,
        requestedDate: '2026-05-11',
        requestedTimeSlot: { start: '10:00', end: '11:00' },
        customerMessage: 'Please move my booking to the next day.'
      })
    });
    const reqData = await reqRes.json();
    console.log(`Reschedule request created with ID: ${reqData._id}`);
    if (reqData.customerMessage !== 'Please move my booking to the next day.') {
      throw new Error('Customer message not saved!');
    }

    console.log('6. Owner approving with a DIFFERENT slot...');
    const approveRes = await fetch(`${BASE_URL}/reschedule/${reqData._id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        newDate: '2026-05-12',
        newTimeSlot: { start: '11:00', end: '12:00' }
      })
    });
    const approveData = await approveRes.json();
    console.log(`Request approved: ${approveRes.ok}`);

    console.log('7. Verifying final booking state...');
    const updatedBooking = await Booking.findById(bookingData._id);
    const updatedRequest = await RescheduleRequest.findById(reqData._id);
    
    console.log(`Booking Date: ${updatedBooking.date.toISOString().split('T')[0]}`);
    console.log(`Booking Slot: ${updatedBooking.timeSlot.start} - ${updatedBooking.timeSlot.end}`);

    if (updatedBooking.timeSlot.start !== '11:00') {
      throw new Error('Booking was not rescheduled to the override slot!');
    }

    console.log('ALL RESCHEDULE VERIFICATION STEPS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err.message);
    process.exit(1);
  }
};

main();
