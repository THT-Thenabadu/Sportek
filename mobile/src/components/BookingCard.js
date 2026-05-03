import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const STATUS_CONFIG = {
  booked:         { color: '#16a34a', bg: '#dcfce7', label: 'Confirmed', icon: 'checkmark-circle' },
  pending:        { color: '#d97706', bg: '#fef3c7', label: 'Pending',   icon: 'time' },
  pending_onsite: { color: '#7c3aed', bg: '#ede9fe', label: 'Pay On-Site', icon: 'cash' },
  active:         { color: '#0284c7', bg: '#e0f2fe', label: 'Active',    icon: 'play-circle' },
  ended:          { color: '#64748b', bg: '#f1f5f9', label: 'Ended',     icon: 'stop-circle' },
  cancelled:      { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled', icon: 'close-circle' },
  completed:      { color: '#16a34a', bg: '#dcfce7', label: 'Completed', icon: 'checkmark-done-circle' },
};

export default function BookingCard({ booking, children }) {
  const { propertyId, date, timeSlot, status, totalAmount } = booking;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const facilityName = propertyId?.name || 'Facility';
  const dateStr = date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const timeStr = timeSlot ? `${timeSlot.start} – ${timeSlot.end}` : '—';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.facilityName} numberOfLines={1}>{facilityName}</Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={14} color="#64748b" />
        <Text style={styles.detailText}>{dateStr}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="time-outline" size={14} color="#64748b" />
        <Text style={styles.detailText}>{timeStr}</Text>
      </View>
      {totalAmount != null && (
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>LKR {totalAmount}</Text>
        </View>
      )}

      {/* Extra content (e.g. QR code) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
  },
});
