# Event Process Test Suite

This test suite provides comprehensive testing for the event management system.

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Event Tests Only
```bash
npm run test:events
```

### Run Security Tests Only
```bash
npm run test:security
```

## Test Coverage

### Event Process Tests (`event.test.js`)

The event test suite covers the complete event lifecycle:

#### 1. Event Creation
- ✅ Create outdoor events with ticket categories
- ✅ Create indoor events with venue integration
- ✅ Automatic seat quantity calculation from venue rows
- ✅ Validation of required fields
- ✅ Authentication requirements

#### 2. Event Listing and Retrieval
- ✅ List all events
- ✅ Get single event by ID
- ✅ Handle non-existent events (404)
- ✅ Populate venue information for indoor events

#### 3. Event Updates
- ✅ Update event details (name, description, location, status)
- ✅ Update ticket categories
- ✅ Handle non-existent event updates

#### 4. Event Deletion
- ✅ Delete events
- ✅ Handle non-existent event deletion

#### 5. Auto-Expiry Logic
- ✅ Automatically expire events past booking deadline
- ✅ Keep future events as 'live'
- ✅ Persist expiry status in database

#### 6. Ticket Category Management
- ✅ Track sold quantity
- ✅ Calculate remaining tickets
- ✅ Handle sold-out categories
- ✅ Support multiple ticket tiers (VIP, General, Student, etc.)

#### 7. Event Type Filtering
- ✅ Filter by event type (music, drama, sport, other)
- ✅ Retrieve events by specific criteria

## Test Data Structure

### Sample Outdoor Event
```javascript
{
  name: 'Summer Music Festival',
  eventType: 'music',
  venueType: 'outdoor',
  location: 'Central Park, Colombo',
  date: '2024-06-15',
  time: '18:00',
  bookingDeadline: '2024-06-10',
  ticketCategories: [
    { name: 'VIP', price: 5000, totalQuantity: 100 },
    { name: 'General', price: 2000, totalQuantity: 500 }
  ]
}
```

### Sample Indoor Event
```javascript
{
  name: 'Classical Music Concert',
  eventType: 'music',
  venueType: 'indoor',
  venueId: '<venue_id>',
  date: '2024-06-20',
  time: '19:30',
  bookingDeadline: '2024-06-15',
  ticketCategories: [
    { name: 'Premium', price: 3000, rows: ['A', 'B'] },
    { name: 'Standard', price: 1500, rows: ['C', 'D'] }
  ]
}
```

## Test Users

The test suite creates three types of users:

1. **Admin** - Full system access
   - Email: admin@test.com
   - Role: admin

2. **Event Manager** - Can create and manage events
   - Email: manager@test.com
   - Role: event_manager

3. **Customer** - Can view and book events
   - Email: customer@test.com
   - Role: customer

## Database

Tests use **MongoDB Memory Server** for isolated testing:
- Each test suite gets a fresh in-memory database
- No impact on production or development databases
- Automatic cleanup after tests complete

## Test Assertions

The tests verify:
- ✅ Correct HTTP status codes (200, 201, 400, 404, 401)
- ✅ Response data structure and content
- ✅ Database state changes
- ✅ Business logic (expiry, sold quantity, etc.)
- ✅ Authorization and authentication
- ✅ Error handling

## Debugging Tests

To see detailed test output:
```bash
npm run test:events -- --verbose
```

To run a specific test:
```bash
npm run test:events -- -t "should create an outdoor event"
```

To see console logs during tests:
```bash
npm run test:events -- --silent=false
```

## Common Issues

### Port Already in Use
If you see "EADDRINUSE" errors, make sure no other instance of the server is running.

### Timeout Errors
Tests have a 30-second timeout. If tests timeout:
- Check your MongoDB connection
- Ensure no infinite loops in code
- Verify async operations are properly awaited

### Authentication Errors
If you see 401 errors:
- Verify JWT_SECRET is set in test environment
- Check token generation in helpers.js
- Ensure auth middleware is properly configured

## Next Steps

To extend the test suite:

1. **Add Ticket Purchase Tests**
   - Test ticket booking flow
   - Verify seat locking mechanism
   - Test payment integration

2. **Add Seat Selection Tests**
   - Test indoor venue seat selection
   - Verify seat availability
   - Test concurrent booking scenarios

3. **Add Integration Tests**
   - Test complete user journey
   - Test event-to-ticket flow
   - Test QR code generation

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use descriptive test names
3. Clean up test data in `afterEach` hooks
4. Add comments for complex test scenarios
5. Update this README with new test coverage
