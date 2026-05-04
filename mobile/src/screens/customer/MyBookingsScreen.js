import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Modal,
  TouchableOpacity, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import BookingCard from '../../components/BookingCard';
import BookingQRCard from '../../components/BookingQRCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrModal, setQrModal] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/my-bookings');
      setBookings(res.data || []);
    } catch (e) {
      console.log('Error fetching bookings:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  if (loading) return <LoadingSpinner message="Loading your bookings..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <BookingCard booking={item}>
            {['booked', 'active', 'pending_onsite'].includes(item.status) && (
              <TouchableOpacity
                style={styles.qrBtn}
                onPress={() => setQrModal(item)}
              >
                <Ionicons name="qr-code-outline" size={16} color="#1d4ed8" />
                <Text style={styles.qrBtnText}>View & Download QR</Text>
              </TouchableOpacity>
            )}
          </BookingCard>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        ListHeaderComponent={
          <Text style={styles.header}>My Bookings ({bookings.length})</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Book a facility to get started</Text>
          </View>
        }
      />

      {/* QR Card Modal */}
      <Modal
        visible={!!qrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setQrModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setQrModal(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {/* Handle bar */}
            <View style={styles.handleBar} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking QR Code</Text>
              <TouchableOpacity onPress={() => setQrModal(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <BookingQRCard
              booking={qrModal}
              onClose={() => setQrModal(null)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 16, marginBottom: 12 },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  qrBtnText: { fontSize: 12, color: '#1d4ed8', fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#64748b' },
  emptyText: { fontSize: 13, color: '#94a3b8' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 32,
    maxHeight: '92%',
  },
  handleBar: {
    width: 40, height: 4, backgroundColor: '#cbd5e1',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
});
