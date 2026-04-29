const { Server } = require('socket.io');
const { lockedSlots } = require('../services/lockService');
const Property = require('../models/Property');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        process.env.CLIENT_URL
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a property room to listen only to relevant updates
    socket.on('join_property_room', (propertyId) => {
      socket.join(`property_${propertyId}`);
    });

    socket.on('leave_property_room', (propertyId) => {
      socket.leave(`property_${propertyId}`);
    });

    // lock_slot event
    socket.on('lock_slot', async ({ propertyId, date, timeSlotStart, userId }) => {
      const slotKey = `${propertyId}_${date}_${timeSlotStart}`;

      try {
        const property = await Property.findById(propertyId);
        if (!property) {
          socket.emit('lock_error', { message: 'Property not found' });
          return;
        }

        const targetDate = new Date(date);
        targetDate.setHours(0,0,0,0);
        const alreadyBlocked = property.blockedSlots && property.blockedSlots.some(b => {
          const bDate = new Date(b.date);
          bDate.setHours(0,0,0,0);
          return bDate.getTime() === targetDate.getTime() &&
                 b.timeSlot.start === timeSlotStart;
        });

        if (alreadyBlocked) {
          socket.emit('lock_error', { message: 'This slot is manually blocked by the owner.' });
          return;
        }

        // Prevent simultaneous locks on the same slot
        if (lockedSlots.has(slotKey)) {
          socket.emit('lock_error', { message: 'Slot is already locked by another user' });
          return;
        }

      // Enforce maximum of 2 pending slot locks per customer
      const userLockCount = [...lockedSlots.values()].filter(v => v.userId === userId).length;
      if (userLockCount >= 2) {
        socket.emit('lock_error', {
          message: 'You can only hold up to 2 pending slots at a time. Please complete or cancel an existing booking first.',
          code: 'LOCK_LIMIT_EXCEEDED'
        });
        return;
      }

      // Start 120s timer
      const timeoutId = setTimeout(() => {
        lockedSlots.delete(slotKey);
        io.to(`property_${propertyId}`).emit('slot_released', { propertyId, date, timeSlotStart });
      }, 120000);

      const expiresAt = new Date(Date.now() + 120000);
      lockedSlots.set(slotKey, { userId, timeoutId, expiresAt });

      // Build payload and broadcast
      const payload = { propertyId, date, timeSlotStart, userId, expiresAt };
      io.to(`property_${propertyId}`).emit('slot_locked', payload);
      socket.emit('lock_success', payload);
      } catch (err) {
        socket.emit('lock_error', { message: err.message });
      }
    });

    // release_slot event
    socket.on('release_slot', ({ propertyId, date, timeSlotStart, userId }) => {
      const slotKey = `${propertyId}_${date}_${timeSlotStart}`;
      const lockedData = lockedSlots.get(slotKey);

      if (lockedData && lockedData.userId === userId) {
        clearTimeout(lockedData.timeoutId);
        lockedSlots.delete(slotKey);
        io.to(`property_${propertyId}`).emit('slot_released', { propertyId, date, timeSlotStart });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Usually we might clean up locks tied to this socket if they drop connection, 
      // but without a strict user-socket mapping, the timer will handle abandonments.
    });
  });
};

const getIo = () => io;

module.exports = { initSocket, getIo };
