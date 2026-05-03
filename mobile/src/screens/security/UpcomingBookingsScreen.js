import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

function BookingItem({ booking }) {
  const customer = booking.customerId?.name || 'Unknown';
  const facility = booking.propertyId?.name || 'Unknown Facility';
  const date = booking.date
    ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—';
  const time = booking.timeSlot ? `${booking.timeSlot.start} – ${booking.timeSlot.end}` : '—';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarChar}>{customer[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.customerName}>{customer}</Text>
          <Text style={styles.facilityName}>{facility}</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.timeText}>{booking.timeSlot?.start || '—'}</Text>
        </View>
      </View>
      <View style={styles.slotRow}>
        <Ionicons name="time-outline" size={13} color="#64748b" />
        <Text style={styles.slotText}>{time}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>
      </View>
    </View>
  );
}

export default function UpcomingBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/upcoming-security');
      setBookings(res.data || []);
    } catch (e) {
      console.log('Error fetching upcoming bookings:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  if (loading) return <LoadingSpinner message="Loading upcoming bookings..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <BookingItem booking={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        ListHeaderComponent={
          <Text style={styles.headerTitle}>Upcoming Bookings ({bookings.length})</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No upcoming bookings</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 16, marginBottom: 12 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarChar: { fontSize: 15, fontWeight: '800', color: '#1d4ed8' },
  cardInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  facilityName: { fontSize: 12, color: '#64748b', marginTop: 1 },
  timeBlock: { alignItems: 'flex-end' },
  dateText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  timeText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotText: { fontSize: 13, color: '#475569', flex: 1 },
  statusBadge: {
    backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  statusText: { fontSize: 11, color: '#1d4ed8', fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});
