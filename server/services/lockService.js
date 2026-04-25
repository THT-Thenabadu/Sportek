// Key format: `${propertyId}_${date}_${timeSlotStart}`
// Value format: { userId, timeoutId, expiresAt }
const lockedSlots = new Map();

const getLockedSlotsForProperty = (propertyId, date) => {
  const locked = [];
  for (const [key, value] of lockedSlots.entries()) {
    if (key.startsWith(`${propertyId}_${date}`)) {
      locked.push({
        slotKey: key,
        userId: value.userId,
        expiresAt: value.expiresAt
      });
    }
  }
  return locked;
};

const isSlotLocked = (slotKey) => {
  return lockedSlots.has(slotKey);
};

module.exports = {
  lockedSlots,
  getLockedSlotsForProperty,
  isSlotLocked
};
