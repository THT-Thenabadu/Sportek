import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

function CurrentBookingItem({ booking, onEndSession }) {
  const [ending, setEnding] = useState(false);
  const customer = booking.customerId?.name || 'Unknown';
  const facility = booking.propertyId?.name || 'Unknown Facility';
  const time = booking.timeSlot ? `${booking.timeSlot.start} – ${booking.timeSlot.end}` : '—';

  const handleEnd = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`End session for ${customer} at ${facility}?`)
      : await new Promise(resolve =>
          Alert.alert('End Session', `End session for ${customer} at ${facility}?`, [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'End Session', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmed) return;
    setEnding(true);
    await onEndSession(booking._id);
    setEnding(false);
  };

  return (
    <View style={[styles.card, styles.activeCard]}>
      <View style={styles.activeDot} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.customerName}>{customer}</Text>
            <Text style={styles.facilityName}>{facility}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={styles.timeText}>{time}</Text>
        </View>
        <TouchableOpacity
          style={[styles.endBtn, ending && { opacity: 0.7 }]}
          onPress={handleEnd}
          disabled={ending}
        >
          {ending ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Ionicons name="stop-circle-outline" size={15} color="#ffffff" />
              <Text style={styles.endBtnText}>End Session</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CurrentBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/current-security');
      setBookings(res.data || []);
    } catch (e) {
      console.log('Error fetching current bookings:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  const handleEndSession = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/end-session`);
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to end session.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    }
  };

  if (loading) return <LoadingSpinner message="Loading current sessions..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <CurrentBookingItem booking={item} onEndSession={handleEndSession} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        ListHeaderComponent={
          <Text style={styles.headerTitle}>Active Sessions ({bookings.length})</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No active sessions</Text>
            <Text style={styles.emptyText}>All clear!</Text>
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
    backgroundColor: '#ffffff', borderRadius: 14, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  activeCard: { borderWidth: 1, borderColor: '#bbf7d0' },
  activeDot: { width: 5, backgroundColor: '#16a34a' },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  facilityName: { fontSize: 12, color: '#64748b', marginTop: 2 },
  activeBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  timeText: { fontSize: 13, color: '#475569' },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#dc2626', borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  endBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#64748b' },
  emptyText: { fontSize: 13, color: '#94a3b8' },
});
