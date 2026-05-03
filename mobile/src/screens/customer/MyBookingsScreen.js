import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Modal,
  TouchableOpacity, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import api from '../../lib/axios';
import BookingCard from '../../components/BookingCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrModal, setQrModal] = useState(null); // booking object for QR

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
            {/* Show QR button for confirmed/booked bookings */}
            {['booked', 'active', 'pending_onsite'].includes(item.status) && (
              <TouchableOpacity
                style={styles.qrBtn}
                onPress={() => setQrModal(item)}
              >
                <Ionicons name="qr-code-outline" size={16} color="#1d4ed8" />
                <Text style={styles.qrBtnText}>Show QR Code</Text>
              </TouchableOpacity>
            )}
          </BookingCard>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
        }
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

      {/* QR Code Modal */}
      <Modal
        visible={!!qrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setQrModal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking QR Code</Text>
              <TouchableOpacity onPress={() => setQrModal(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {qrModal?.propertyId?.name || 'Facility'}
            </Text>
            <Text style={styles.modalDate}>
              {qrModal?.date ? new Date(qrModal.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              {'  '}
              {qrModal?.timeSlot ? `${qrModal.timeSlot.start} – ${qrModal.timeSlot.end}` : ''}
            </Text>
            <View style={styles.qrContainer}>
              {qrModal?.qrCodeData ? (
                <QRCode
                  value={qrModal.qrCodeData}
                  size={200}
                  color="#1e293b"
                  backgroundColor="#ffffff"
                />
              ) : (
                <View style={styles.noQr}>
                  <Ionicons name="qr-code-outline" size={60} color="#cbd5e1" />
                  <Text style={styles.noQrText}>QR not available</Text>
                </View>
              )}
            </View>
            <Text style={styles.qrHint}>Show this QR to the security officer at the venue</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setQrModal(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 12,
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qrBtnText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyText: { fontSize: 13, color: '#94a3b8' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#1d4ed8',
    fontWeight: '600',
    marginBottom: 4,
    width: '100%',
  },
  modalDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
    width: '100%',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noQr: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  noQrText: { fontSize: 13, color: '#94a3b8' },
  qrHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
