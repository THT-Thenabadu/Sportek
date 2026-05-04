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
import { useFocusEffect } from '@react-navigation/native';
import { TextInput, Alert } from 'react-native';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrModal, setQrModal] = useState(null); // booking object for QR

  // Reschedule state
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const fetchRescheduleSlots = async (propertyId, date) => {
    setLoadingRescheduleSlots(true);
    setRescheduleSlots([]);
    setSelectedRescheduleSlot(null);
    try {
      const res = await api.get(`/bookings/slots/${propertyId}?date=${date}`);
      const slotsData = Array.isArray(res.data) ? res.data : (res.data?.slots || []);
      setRescheduleSlots(slotsData.filter(s => s.state === 'Available'));
    } catch (e) {
      console.log('Error fetching slots:', e.message);
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  const handleDateChange = (days) => {
    const currentDate = new Date(rescheduleDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split('T')[0];
    setRescheduleDate(newDateStr);
    if (rescheduleModal) {
      fetchRescheduleSlots(rescheduleModal.propertyId._id || rescheduleModal.propertyId, newDateStr);
    }
  };

  const openRescheduleModal = (booking) => {
    setRescheduleModal(booking);
    const today = new Date().toISOString().split('T')[0];
    setRescheduleDate(today);
    setRescheduleReason('');
    fetchRescheduleSlots(booking.propertyId._id || booking.propertyId, today);
  };

  const submitReschedule = async () => {
    if (!selectedRescheduleSlot) {
      Alert.alert('Error', 'Please select a time slot.');
      return;
    }
    setSubmittingReschedule(true);
    try {
      await api.post('/reschedule', {
        bookingId: rescheduleModal._id,
        requestedDate: rescheduleDate,
        requestedTimeSlot: {
          start: selectedRescheduleSlot.start,
          end: selectedRescheduleSlot.end
        },
        customerMessage: rescheduleReason
      });
      Alert.alert('Success', 'Reschedule request sent to owner!');
      setRescheduleModal(null);
      fetchBookings();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not request reschedule.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  if (loading) return <LoadingSpinner message="Loading your bookings..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <BookingCard booking={item}>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
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
              {/* Reschedule button for confirmed/booked bookings */}
              {['booked', 'active', 'pending_onsite'].includes(item.status) && (
                <TouchableOpacity
                  style={[styles.qrBtn, { backgroundColor: '#fdf4ff' }]}
                  onPress={() => openRescheduleModal(item)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#c026d3" />
                  <Text style={[styles.qrBtnText, { color: '#c026d3' }]}>Reschedule</Text>
                </TouchableOpacity>
              )}
            </View>
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

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <Modal
          visible={!!rescheduleModal}
          transparent
          animationType="slide"
          onRequestClose={() => setRescheduleModal(null)}
        >
          <View style={styles.rescheduleOverlay}>
            <View style={styles.rescheduleCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reschedule Booking</Text>
                <TouchableOpacity onPress={() => setRescheduleModal(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.rescheduleSubtitle}>Select New Date</Text>
              <View style={styles.dateSelector}>
                <TouchableOpacity onPress={() => handleDateChange(-1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-back" size={20} color="#1d4ed8" />
                </TouchableOpacity>
                <Text style={styles.dateText}>{rescheduleDate}</Text>
                <TouchableOpacity onPress={() => handleDateChange(1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#1d4ed8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.rescheduleSubtitle}>Available Slots</Text>
              <View style={{ maxHeight: 150 }}>
                {loadingRescheduleSlots ? (
                  <LoadingSpinner message="Loading slots..." />
                ) : rescheduleSlots.length === 0 ? (
                  <Text style={styles.emptyText}>No slots available for this date.</Text>
                ) : (
                  <FlatList
                    data={rescheduleSlots}
                    numColumns={2}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.slotBtn,
                          selectedRescheduleSlot?.start === item.start && styles.slotBtnSelected
                        ]}
                        onPress={() => setSelectedRescheduleSlot(item)}
                      >
                        <Text style={[
                          styles.slotText,
                          selectedRescheduleSlot?.start === item.start && styles.slotTextSelected
                        ]}>
                          {item.start} - {item.end}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>

              <Text style={styles.rescheduleSubtitle}>Reason (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Why do you want to reschedule?"
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
              />

              <TouchableOpacity
                style={[styles.submitRescheduleBtn, submittingReschedule && { opacity: 0.7 }]}
                onPress={submitReschedule}
                disabled={submittingReschedule || !selectedRescheduleSlot}
              >
                <Text style={styles.submitRescheduleBtnText}>
                  {submittingReschedule ? 'Sending Request...' : 'Send Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  qrHint: { fontSize: 13, color: '#64748b', marginTop: 16, textAlign: 'center' },
  closeBtn: {
    marginTop: 20,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  // Reschedule Modal
  rescheduleOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  rescheduleCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  rescheduleSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  dateArrow: { padding: 4 },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  slotBtn: {
    flex: 1,
    margin: 4,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  slotBtnSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  slotText: { color: '#475569', fontSize: 12 },
  slotTextSelected: { color: '#fff', fontWeight: '700' },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    color: '#1e293b',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitRescheduleBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitRescheduleBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
