# Event Process Test Suite - Summary

## ✅ Test Results

**All 17 tests passing!**

```
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Time:        ~15 seconds
```

## Test Coverage

### 1. Event Creation (4 tests)
- ✅ Create outdoor events with ticket categories
- ✅ Create indoor events with venue integration and automatic seat calculation
- ✅ Validation of required fields
- ✅ Authentication requirements

### 2. Event Listing and Retrieval (3 tests)
- ✅ List all events
- ✅ Get single event by ID
- ✅ Handle non-existent events (404 responses)

### 3. Event Updates (3 tests)
- ✅ Update event details (name, description, location, status)
- ✅ Update ticket categories
- ✅ Handle non-existent event updates

### 4. Event Deletion (2 tests)
- ✅ Delete events successfully
- ✅ Handle non-existent event deletion

### 5. Auto-Expiry Logic (2 tests)
- ✅ Automatically expire events past booking deadline
- ✅ Keep future events as 'live'

### 6. Ticket Category Management (2 tests)
- ✅ Track sold quantity correctly
- ✅ Handle sold-out categories

### 7. Event Type Filtering (1 test)
- ✅ Retrieve events by specific type (music, drama, sport, other)

## Quick Start

```bash
# Navigate to server directory
cd server

# Run event tests
npm run test:events

# Run with verbose output
npm run test:events -- --verbose

# Run all tests
npm test
```

## Test Features

### Automated Testing
- Uses **MongoDB Memory Server** for isolated testing
- No impact on production or development databases
- Automatic cleanup after each test

### Test Users
- **Admin**: Full system access
- **Manager**: Can create and manage events  
- **Customer**: Can view and book events

### Test Data
- Outdoor events with multiple ticket categories
- Indoor events with venue integration
- Various event types (music, drama, sport)
- Past and future events for expiry testing

## Key Test Scenarios

### Outdoor Event Creation
```javascript
{
  name: 'Summer Music Festival',
  eventType: 'music',
  venueType: 'outdoor',
  location: 'Central Park, Colombo',
  ticketCategories: [
    { name: 'VIP', price: 5000, totalQuantity: 100 },
    { name: 'General', price: 2000, totalQuantity: 500 }
  ]
}
```

### Indoor Event with Venue
```javascript
{
  name: 'Classical Concert',
  eventType: 'music',
  venueType: 'indoor',
  venueId: '<venue_id>',
  ticketCategories: [
    { name: 'Premium', price: 3000, rows: ['A', 'B'] },
    { name: 'Standard', price: 1500, rows: ['C', 'D'] }
  ]
}
// Automatically calculates totalQuantity from venue seat rows
```

## Business Logic Tested

1. **Seat Quantity Calculation**
   - For indoor events, automatically calculates ticket quantities from venue seat rows
   - Example: Rows A+B (20+20 seats) = 40 Premium tickets

2. **Auto-Expiry**
   - Events automatically expire when booking deadline passes
   - Status changes from 'live' to 'expired'
   - Persisted in database

3. **Sold Quantity Tracking**
   - Tracks tickets sold per category
   - Calculates remaining tickets
   - Identifies sold-out categories

4. **Authentication & Authorization**
   - Requires authentication for event creation
   - Validates user roles
   - Protects sensitive operations

## Next Steps

### Extend Test Coverage
1. **Ticket Purchase Flow**
   - Test complete booking process
   - Verify payment integration
   - Test QR code generation

2. **Seat Selection**
   - Test seat locking mechanism
   - Verify concurrent booking handling
   - Test seat availability updates

3. **Integration Tests**
   - End-to-end user journeys
   - Event creation to ticket purchase
   - Multi-user scenarios

### Performance Testing
- Load testing with multiple concurrent events
- Stress testing ticket purchase flow
- Database query optimization

### Security Testing
- Input validation
- SQL injection prevention
- XSS protection
- Rate limiting

## Troubleshooting

### Common Issues

**Tests Timeout**
```bash
# Increase timeout
npm run test:events -- --testTimeout=60000
```

**Port Already in Use**
```bash
# Kill existing processes
# Windows: taskkill /F /IM node.exe
# Linux/Mac: killall node
```

**Database Connection Issues**
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

## Documentation

- Full test documentation: `tests/README.md`
- Command reference: `TEST_COMMANDS.md`
- Test file: `tests/event.test.js`

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Event Tests
  run: |
    cd server
    npm install
    npm run test:events
```

## Success Metrics

- ✅ 100% test pass rate
- ✅ ~15 second execution time
- ✅ Zero database side effects
- ✅ Comprehensive coverage of event lifecycle
- ✅ Clear, maintainable test code

---

**Last Updated**: $(date)
**Test Suite Version**: 1.0.0
**Status**: All tests passing ✅
