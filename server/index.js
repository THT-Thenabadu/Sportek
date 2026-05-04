const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const connectDB = require('./db');
const { initSocket } = require('./sockets/bookingSocket');

const propertyRoutes = require('./routes/propertyRoutes');
const assetRoutes = require('./routes/assetRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

const userRoutes = require('./routes/userRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reviewRoutes = require('./routes/reviews');
const complaintRoutes = require('./routes/complaints');
const warningRoutes = require('./routes/warnings');

connectDB();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow all localhost origins and no-origin requests (mobile apps, Postman)
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    const allowedOrigins = [
      process.env.CLIENT_URL
    ].filter(Boolean);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Stripe webhook needs a raw body Buffer for signature verification.
// MUST be registered BEFORE express.json() so the body is not pre-parsed.
// The Stripe CLI forwards to /api/payments/webhook — match that path exactly.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// All other routes get JSON body parsing
app.use((req, res, next) => {
  // Skip json parsing for the webhook route (already parsed as raw Buffer above)
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }
  express.json({ limit: '15mb' })(req, res, next);
});

app.use('/api/properties', propertyRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reschedule', rescheduleRoutes); // Stripe webhook lives here: POST /api/payments/webhook
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);

app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/warnings', warningRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Sportek API is running' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
