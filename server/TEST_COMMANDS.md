# Test Commands Quick Reference

## Run Event Tests

```bash
# Navigate to server directory
cd server

# Run all event tests
npm run test:events

# Run all tests (including security and event tests)
npm test

# Run with verbose output
npm run test:events -- --verbose

# Run specific test suite
npm run test:events -- -t "Event Creation"

# Run specific test case
npm run test:events -- -t "should create an outdoor event"

# Watch mode (re-run on file changes)
npm run test:events -- --watch

# Generate coverage report
npm run test:events -- --coverage
```

## Test Output

### Successful Test Run
```
PASS  tests/event.test.js
  Event Process Tests
    Event Creation
      ✓ should create an outdoor event successfully (150ms)
      ✓ should create an indoor event with venue integration (120ms)
      ✓ should fail to create event without required fields (45ms)
      ✓ should fail to create event without authentication (30ms)
    Event Listing and Retrieval
      ✓ should list all events (80ms)
      ✓ should get a single event by ID (60ms)
      ✓ should return 404 for non-existent event (40ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        5.234s
```

## Debugging

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest tests/event.test.js

# Show console.log output
npm run test:events -- --silent=false

# Run only failed tests
npm run test:events -- --onlyFailures

# Update snapshots (if using snapshot testing)
npm run test:events -- -u
```

## Environment Variables

Tests use these environment variables (automatically set in test environment):

```bash
NODE_ENV=test
JWT_SECRET=test_secret_key
MONGODB_URI=<in-memory-db>
```

## Common Test Scenarios

### Test Event Creation
```bash
npm run test:events -- -t "Event Creation"
```

### Test Auto-Expiry
```bash
npm run test:events -- -t "Auto-Expiry"
```

### Test Ticket Management
```bash
npm run test:events -- -t "Ticket Category"
```

### Test Updates and Deletion
```bash
npm run test:events -- -t "Event Updates"
npm run test:events -- -t "Event Deletion"
```

## CI/CD Integration

For continuous integration, add to your pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Event Tests
  run: |
    cd server
    npm install
    npm run test:events
```

## Troubleshooting

### Tests Hanging
```bash
# Force exit after tests complete
npm run test:events -- --forceExit

# Detect open handles
npm run test:events -- --detectOpenHandles
```

### Clear Jest Cache
```bash
npx jest --clearCache
```

### Check Test Files
```bash
# List all test files
npx jest --listTests
```

## Performance

```bash
# Run tests in parallel (faster)
npm run test:events -- --maxWorkers=4

# Run tests sequentially (debugging)
npm run test:events -- --runInBand
```

## Coverage Reports

```bash
# Generate HTML coverage report
npm run test:events -- --coverage --coverageDirectory=coverage

# View coverage in browser
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

## Quick Test Checklist

Before committing code:

- [ ] Run `npm run test:events` - all tests pass
- [ ] No console errors or warnings
- [ ] Test coverage maintained or improved
- [ ] New features have corresponding tests
- [ ] Documentation updated if needed
