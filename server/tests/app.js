/**
 * Minimal Express app for testing — no DB connection, no server.listen.
 * Mirrors the route/middleware setup in index.js.
 */

// Stub Stripe before any routes load so it doesn't throw on missing key
jest.mock('stripe', () => {
  return () => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test' }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  });
});

const express = require('express');

const bookingRoutes = require('../routes/bookingRoutes');
const userRoutes    = require('../routes/userRoutes');

const app = express();

// Stripe webhook raw body (must come before json middleware)
app.use('/api/bookings/webhook', express.raw({ type: 'application/json' }));

app.use((req, res, next) => {
  if (req.originalUrl === '/api/bookings/webhook') return next();
  express.json()(req, res, next);
});

app.use('/api/bookings', bookingRoutes);
app.use('/api/users',    userRoutes);

module.exports = app;
