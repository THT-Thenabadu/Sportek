/**
 * Event Process Test Suite
 * Tests the complete event lifecycle including:
 * - Event creation (indoor/outdoor)
 * - Event listing and filtering
 * - Event updates
 * - Event deletion
 * - Ticket category management
 * - Auto-expiry logic
 * - Venue integration for indoor events
 */

require('./setup');
const request = require('supertest');
const app = require('./app');
const { createUser } = require('./helpers');
const Event = require('../models/Event');
const Venue = require('../models/Venue');

describe('Event Process Tests', () => {
  let adminToken, adminUser;
  let managerToken, managerUser;
  let customerToken, customerUser;

  beforeEach(async () => {
    // Create test users
    const admin = await createUser({ role: 'admin', email: 'admin@test.com' });
    adminToken = admin.token;
    adminUser = admin.user;

    const manager = await createUser({ role: 'admin', email: 'manager@test.com' });
    managerToken = manager.token;
    managerUser = manager.user;

    const customer = await createUser({ role: 'customer', email: 'customer@test.com' });
    customerToken = customer.token;
    customerUser = customer.user;
  });

  describe('Event Creation', () => {
    test('should create an outdoor event successfully', async () => {
      const eventData = {
        name: 'Summer Music Festival',
        description: 'An amazing outdoor music festival',
        eventType: 'music',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        time: '18:00',
        venueType: 'outdoor',
        location: 'Central Park, Colombo',
        organizerName: 'Music Events Ltd',
        bookingDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        ticketCategories: [
          { name: 'VIP', price: 5000, totalQuantity: 100 },
          { name: 'General', price: 2000, totalQuantity: 500 }
        ],
        status: 'live'
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(eventData)
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe(eventData.name);
      expect(res.body.venueType).toBe('outdoor');
      expect(res.body.ticketCategories).toHaveLength(2);
      expect(res.body.ticketCategories[0].soldQuantity).toBe(0);
      expect(res.body.createdBy.toString()).toBe(managerUser._id.toString());
    });

    test('should create an indoor event with venue integration', async () => {
      // First create a venue
      const venue = await Venue.create({
        name: 'Grand Theater',
        venueType: 'Theater',
        totalCapacity: 90,
        city: 'Colombo',
        address: '123 Theater Street',
        locationType: 'indoor',
        seatRows: [
          { rowLabel: 'A', seatCount: 20 },
          { rowLabel: 'B', seatCount: 20 },
          { rowLabel: 'C', seatCount: 25 },
          { rowLabel: 'D', seatCount: 25 }
        ]
      });

      const eventData = {
        name: 'Classical Music Concert',
        description: 'An evening of classical music',
        eventType: 'music',
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        time: '19:30',
        venueType: 'indoor',
        venueId: venue._id,
        organizerName: 'Symphony Orchestra',
        bookingDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        ticketCategories: [
          { name: 'Premium', price: 3000, rows: ['A', 'B'] },
          { name: 'Standard', price: 1500, rows: ['C', 'D'] }
        ],
        status: 'live'
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(eventData)
        .expect(201);

      expect(res.body.venueType).toBe('indoor');
      expect(res.body.venueId).toBe(venue._id.toString());
      // Check that totalQuantity was computed from rows
      expect(res.body.ticketCategories[0].totalQuantity).toBe(40); // A+B = 20+20
      expect(res.body.ticketCategories[1].totalQuantity).toBe(50); // C+D = 25+25
    });

    test('should fail to create event without required fields', async () => {
      const invalidData = {
        name: 'Incomplete Event',
        // Missing date, time, venueType, bookingDeadline
      };

      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should fail to create event without authentication', async () => {
      const eventData = {
        name: 'Unauthorized Event',
        date: new Date(),
        time: '18:00',
        venueType: 'outdoor',
        bookingDeadline: new Date()
      };

      await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(401);
    });
  });

  describe('Event Listing and Retrieval', () => {
    let event1, event2, event3;

    beforeEach(async () => {
      // Create multiple events
      event1 = await Event.create({
        createdBy: managerUser._id,
        name: 'Music Concert',
        eventType: 'music',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        time: '19:00',
        venueType: 'outdoor',
        location: 'Park A',
        organizerName: 'Organizer 1',
        bookingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        ticketCategories: [{ name: 'General', price: 1000, totalQuantity: 100 }],
        status: 'live'
      });

      event2 = await Event.create({
        createdBy: managerUser._id,
        name: 'Drama Show',
        eventType: 'drama',
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        time: '20:00',
        venueType: 'indoor',
        location: 'Theater B',
        organizerName: 'Organizer 2',
        bookingDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        ticketCategories: [{ name: 'VIP', price: 2000, totalQuantity: 50 }],
        status: 'live'
      });

      event3 = await Event.create({
        createdBy: managerUser._id,
        name: 'Sports Tournament',
        eventType: 'sport',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        time: '15:00',
        venueType: 'outdoor',
        location: 'Stadium C',
        organizerName: 'Organizer 3',
        bookingDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        ticketCategories: [{ name: 'Standard', price: 500, totalQuantity: 1000 }],
        status: 'draft'
      });
    });

    test('should list all events', async () => {
      const res = await request(app)
        .get('/api/events')
        .expect(200);

      expect(res.body).toHaveLength(3);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('ticketCategories');
    });

    test('should get a single event by ID', async () => {
      const res = await request(app)
        .get(`/api/events/${event1._id}`)
        .expect(200);

      expect(res.body._id).toBe(event1._id.toString());
      expect(res.body.name).toBe('Music Concert');
      expect(res.body.eventType).toBe('music');
    });

    test('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/events/${fakeId}`)
        .expect(404);
    });
  });

  describe('Event Updates', () => {
    let event;

    beforeEach(async () => {
      event = await Event.create({
        createdBy: managerUser._id,
        name: 'Original Event',
        eventType: 'music',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        time: '18:00',
        venueType: 'outdoor',
        location: 'Original Location',
        organizerName: 'Original Organizer',
        bookingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        ticketCategories: [{ name: 'General', price: 1000, totalQuantity: 100 }],
        status: 'draft'
      });
    });

    test('should update event details', async () => {
      const updates = {
        name: 'Updated Event Name',
        description: 'Updated description',
        location: 'New Location',
        status: 'live'
      };

      const res = await request(app)
        .put(`/api/events/${event._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.name).toBe('Updated Event Name');
      expect(res.body.description).toBe('Updated description');
      expect(res.body.location).toBe('New Location');
      expect(res.body.status).toBe('live');
    });

    test('should update ticket categories', async () => {
      const updates = {
        ticketCategories: [
          { name: 'VIP', price: 3000, totalQuantity: 50 },
          { name: 'General', price: 1500, totalQuantity: 200 },
          { name: 'Student', price: 800, totalQuantity: 100 }
        ]
      };

      const res = await request(app)
        .put(`/api/events/${event._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.ticketCategories).toHaveLength(3);
      expect(res.body.ticketCategories[0].name).toBe('VIP');
      expect(res.body.ticketCategories[2].name).toBe('Student');
    });

    test('should fail to update non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .put(`/api/events/${fakeId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('Event Deletion', () => {
    let event;

    beforeEach(async () => {
      event = await Event.create({
        createdBy: managerUser._id,
        name: 'Event to Delete',
        eventType: 'other',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        time: '18:00',
        venueType: 'outdoor',
        location: 'Test Location',
        organizerName: 'Test Organizer',
        bookingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        ticketCategories: [{ name: 'General', price: 1000, totalQuantity: 100 }],
        status: 'draft'
      });
    });

    test('should delete an event', async () => {
      await request(app)
        .delete(`/api/events/${event._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const deletedEvent = await Event.findById(event._id);
      expect(deletedEvent).toBeNull();
    });

    test('should return 404 when deleting non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .delete(`/api/events/${fakeId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);
    });
  });

  describe('Event Auto-Expiry Logic', () => {
    test('should auto-expire events past booking deadline', async () => {
      // Create an event with a past booking deadline
      const pastEvent = await Event.create({
        createdBy: managerUser._id,
        name: 'Past Event',
        eventType: 'music',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        time: '18:00',
        venueType: 'outdoor',
        location: 'Test Location',
        organizerName: 'Test Organizer',
        bookingDeadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        ticketCategories: [{ name: 'General', price: 1000, totalQuantity: 100 }],
        status: 'live'
      });

      // Fetch events - should trigger auto-expiry
      const res = await request(app)
        .get('/api/events')
        .expect(200);

      const expiredEvent = res.body.find(e => e._id === pastEvent._id.toString());
      expect(expiredEvent.status).toBe('expired');
    });

    test('should not expire events with future booking deadline', async () => {
      const futureEvent = await Event.create({
        createdBy: managerUser._id,
        name: 'Future Event',
        eventType: 'music',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        time: '18:00',
        venueType: 'outdoor',
        location: 'Test Location',
        organizerName: 'Test Organizer',
        bookingDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        ticketCategories: [{ name: 'General', price: 1000, totalQuantity: 100 }],
        status: 'live'
      });

      const res = await request(app)
        .get('/api/events')
        .expect(200);

      const activeEvent = res.body.find(e => e._id === futureEvent._id.toString());
      expect(activeEvent.status).toBe('live');
    });
  });

  describe('Ticket Category Management', () => {
    test('should track sold quantity correctly', async () => {
      const event = await Event.create({
        createdBy: managerUser._id,
        name: 'Ticket Test Event',
        eventType: 'music',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        time: '18:00',
        venueType: 'outdoor',
        location: 'Test Location',
        organizerName: 'Test Organizer',
        bookingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        ticketCategories: [
          { name: 'VIP', price: 3000, totalQuantity: 50, soldQuantity: 10 },
          { name: 'General', price: 1500, totalQuantity: 200, soldQuantity: 50 }
        ],
        status: 'live'
      });

      expect(event.ticketCategories[0].soldQuantity).toBe(10);
      expect(event.ticketCategories[1].soldQuantity).toBe(50);

      // Calculate remaining tickets
      const vipRemaining = event.ticketCategories[0].totalQuantity - event.ticketCategories[0].soldQuantity;
      const generalRemaining = event.ticketCategories[1].totalQuantity - event.ticketCategories[1].soldQuantity;

      expect(vipRemaining).toBe(40);
      expect(generalRemaining).toBe(150);
    });

    test('should handle sold out categories', async () => {
      const event = await Event.create({
        createdBy: managerUser._id,
        name: 'Sold Out Test',
        eventType: 'music',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        time: '18:00',
        venueType: 'outdoor',
        location: 'Test Location',
        organizerName: 'Test Organizer',
        bookingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        ticketCategories: [
          { name: 'VIP', price: 3000, totalQuantity: 50, soldQuantity: 50 }, // Sold out
          { name: 'General', price: 1500, totalQuantity: 200, soldQuantity: 100 }
        ],
        status: 'live'
      });

      const vipSoldOut = event.ticketCategories[0].soldQuantity >= event.ticketCategories[0].totalQuantity;
      const generalSoldOut = event.ticketCategories[1].soldQuantity >= event.ticketCategories[1].totalQuantity;

      expect(vipSoldOut).toBe(true);
      expect(generalSoldOut).toBe(false);
    });
  });

  describe('Event Type Filtering', () => {
    beforeEach(async () => {
      await Event.create([
        {
          createdBy: managerUser._id,
          name: 'Music Event 1',
          eventType: 'music',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          time: '18:00',
          venueType: 'outdoor',
          location: 'Location 1',
          organizerName: 'Organizer 1',
          bookingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          ticketCategories: [{ name: 'General', price: 1000, totalQuantity: 100 }],
          status: 'live'
        },
        {
          createdBy: managerUser._id,
          name: 'Drama Event 1',
          eventType: 'drama',
          date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          time: '19:00',
          venueType: 'indoor',
          location: 'Location 2',
          organizerName: 'Organizer 2',
          bookingDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          ticketCategories: [{ name: 'General', price: 1500, totalQuantity: 80 }],
          status: 'live'
        },
        {
          createdBy: managerUser._id,
          name: 'Sport Event 1',
          eventType: 'sport',
          date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          time: '15:00',
          venueType: 'outdoor',
          location: 'Location 3',
          organizerName: 'Organizer 3',
          bookingDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          ticketCategories: [{ name: 'General', price: 500, totalQuantity: 500 }],
          status: 'live'
        }
      ]);
    });

    test('should retrieve events of specific type', async () => {
      const allEvents = await Event.find();
      const musicEvents = allEvents.filter(e => e.eventType === 'music');
      const dramaEvents = allEvents.filter(e => e.eventType === 'drama');
      const sportEvents = allEvents.filter(e => e.eventType === 'sport');

      expect(musicEvents).toHaveLength(1);
      expect(dramaEvents).toHaveLength(1);
      expect(sportEvents).toHaveLength(1);
    });
  });
});
