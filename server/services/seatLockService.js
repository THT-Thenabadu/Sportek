// In-memory seat lock store: key = "eventId_seatId", value = { userId, expiresAt }
const seatLocks = new Map();
const LOCK_TTL_MS = 15 * 60 * 1000; // 15 minutes

const lockSeat = (eventId, seatId, userId) => {
  const key = `${eventId}_${seatId}`;
  const existing = seatLocks.get(key);
  // Already locked by someone else and not expired
  if (existing && existing.userId !== userId && existing.expiresAt > Date.now()) {
    return { success: false, lockedBy: existing.userId };
  }
  seatLocks.set(key, { userId, expiresAt: Date.now() + LOCK_TTL_MS });
  return { success: true, expiresAt: Date.now() + LOCK_TTL_MS };
};

const unlockSeat = (eventId, seatId, userId) => {
  const key = `${eventId}_${seatId}`;
  const existing = seatLocks.get(key);
  if (existing && existing.userId === userId) {
    seatLocks.delete(key);
  }
};

const unlockAllForUser = (eventId, userId) => {
  for (const [key, val] of seatLocks.entries()) {
    if (key.startsWith(`${eventId}_`) && val.userId === userId) {
      seatLocks.delete(key);
    }
  }
};

const getLockedSeats = (eventId) => {
  const now = Date.now();
  const result = [];
  for (const [key, val] of seatLocks.entries()) {
    if (key.startsWith(`${eventId}_`)) {
      if (val.expiresAt > now) {
        const seatId = key.slice(eventId.length + 1);
        result.push({ seatId, userId: val.userId, expiresAt: val.expiresAt });
      } else {
        seatLocks.delete(key); // clean up expired
      }
    }
  }
  return result;
};

module.exports = { lockSeat, unlockSeat, unlockAllForUser, getLockedSeats };
