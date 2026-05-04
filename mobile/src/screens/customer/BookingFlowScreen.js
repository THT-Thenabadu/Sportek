import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
// <<<<<<< mobile-featureBooking
import { TextInput } from 'react-native';
// =======
// >>>>>>> ReactNative/Mobile
import { useAuth } from '../../store/useAuthStore';
import io from 'socket.io-client';

export default function BookingFlowScreen({ route, navigation }) {
  const { facility, slots: initialSlots } = route?.params || {};
  const { user } = useAuth();
// <<<<<<< mobile-featureBooking
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState(Array.isArray(initialSlots) ? initialSlots : []);
  const [loadingSlots, setLoadingSlots] = useState(false);

// =======
//   const slots = Array.isArray(initialSlots) ? initialSlots : [];
// >>>>>>> ReactNative/Mobile
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('onsite');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

  const [socket, setSocket] = useState(null);
  const [lockedByMe, setLockedByMe] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [slotLockInfo, setSlotLockInfo] = useState({});
  const [tick, setTick] = useState(0);
  const lockedDateRef = useRef(null);
  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    fetchSlotsForDate(selectedDate);
  }, []);

  // Timer tick for countdown rendering
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Socket.io
  useEffect(() => {
    const socketUrl = api.defaults.baseURL?.replace('/api', '') || 'http://192.168.8.195:8000';
    const s = io(socketUrl);
    setSocket(s);

    s.emit('join_property_room', facility._id);

    s.on('slot_locked', ({ date, timeSlotStart, expiresAt }) => {
      if (date !== selectedDateRef.current) return;
      setSlots((prev) =>
        prev.map((sl) =>
          sl.start === timeSlotStart
            ? { ...sl, state: 'Pending', lockExpiresAt: expiresAt }
            : sl
        )
      );
      setSlotLockInfo((prev) => ({ ...prev, [timeSlotStart]: expiresAt }));
    });

    s.on('slot_released', ({ date, timeSlotStart }) => {
      if (date !== selectedDateRef.current) return;
      setSlots((prev) =>
        prev.map((sl) =>
          sl.start === timeSlotStart
            ? { ...sl, state: 'Available', lockExpiresAt: null }
            : sl
        )
      );
      setSlotLockInfo((prev) => {
        const n = { ...prev };
        delete n[timeSlotStart];
        return n;
      });
    });

    s.on('slot_confirmed', ({ date, timeSlotStart }) => {
      if (date && date !== selectedDateRef.current) return;
      setSlots((prev) =>
        prev.map((sl) =>
          sl.start === timeSlotStart
            ? { ...sl, state: 'Booked', lockExpiresAt: null }
            : sl
        )
      );
      setSlotLockInfo((prev) => {
        const n = { ...prev };
        delete n[timeSlotStart];
        return n;
      });
    });

    s.on('lock_success', ({ expiresAt }) => {
      const secsLeft = Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000));
      setTimeLeft(secsLeft);
      setLockedByMe(true);
      lockedDateRef.current = selectedDateRef.current;
    });

    s.on('lock_error', ({ message }) => {
      Alert.alert('Hold Failed', message);
      setSelectedSlot(null);
    });

    return () => {
      s.emit('leave_property_room', facility._id);
      s.disconnect();
    };
  }, [facility._id]);

  // Countdown logic for the active lock
  useEffect(() => {
    if (!lockedByMe || timeLeft === null) return;
    if (timeLeft <= 0) {
      setLockedByMe(false);
      setSelectedSlot(null);
      Alert.alert('Hold Expired', 'Your 5-minute hold on this slot has expired. Please try again.');
      fetchSlotsForDate(selectedDateRef.current);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedByMe, timeLeft]);

  const fetchSlotsForDate = async (dateStr) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await api.get(`/bookings/slots/${facility._id}?date=${dateStr}`);
      const slotsData = Array.isArray(res.data) ? res.data : (res.data?.slots || []);
      setSlots(slotsData);

      const lockMap = {};
      slotsData.forEach((sl) => {
        if (sl.state === 'Pending' && sl.lockExpiresAt) {
          lockMap[sl.start] = sl.lockExpiresAt;
        }
      });
      setSlotLockInfo(lockMap);
    } catch (e) {
      console.log('Error fetching slots:', e.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (days) => {
    if (lockedByMe) {
      Alert.alert('Action Blocked', 'You have a slot held. Please complete or cancel it before changing the date.');
      return;
    }
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
    fetchSlotsForDate(newDateStr);
  };

  const handleHoldSlot = () => {
    if (!socket || !user) return;
    socket.emit('lock_slot', {
      propertyId: facility._id,
      date: selectedDate,
      timeSlotStart: selectedSlot.start,
      userId: user._id
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      Alert.alert('Select a time slot', 'Please choose a time slot before confirming.');
      return;
    }

    if (paymentMethod === 'card') {
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv) {
        Alert.alert('Invalid Card', 'Please enter your card details.');
        return;
      }
    }

    const paymentText = paymentMethod === 'card' ? 'Pay by Card' : 'Pay on Arrival';

    Alert.alert(
      'Confirm Booking',
      `Book ${facility.name}\n${selectedDate}\n${selectedSlot.start} – ${selectedSlot.end}\n\nPayment: LKR ${facility.pricePerHour} (${paymentText})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              // Simulating payment process if card is selected
              if (paymentMethod === 'card') {
                await new Promise(resolve => setTimeout(resolve, 1500));
              }

              // Use create-onsite for now as mock or replace with real payment intent in future
              await api.post('/bookings/create-onsite', {
                propertyId: facility._id,
                date: lockedDateRef.current || selectedDate,
                timeSlotStart: selectedSlot.start,
                timeSlotEnd: selectedSlot.end,
                paymentMethod: paymentMethod
              });

              setLockedByMe(false);
              setTimeLeft(null);

              // Update local state to show it as Booked immediately
              setSlots((prevSlots) =>
                prevSlots.map((s) =>
                  s.start === selectedSlot.start ? { ...s, state: 'Booked' } : s
                )
              );
              setSelectedSlot(null);

              Alert.alert(
                '🎉 Booking Confirmed!',
                `Your booking at ${facility.name} has been confirmed.\n${paymentMethod === 'card' ? 'Payment successful.' : `Pay LKR ${facility.pricePerHour} on arrival.`}`,
                [
                  { text: 'OK', style: 'cancel' },
                  { text: 'View My Bookings', onPress: () => navigation.navigate('Bookings') }
                ]
              );
            } catch (err) {
              Alert.alert('Booking Failed', err.response?.data?.message || 'Could not complete booking.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (user?.role !== 'customer') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#94a3b8" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>Booking is only available for customers.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Facility Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.facilityName}>{facility.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{typeof facility.location === 'object' ? facility.location?.address : facility.location}</Text>
          </View>
        </View>

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select a Date</Text>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => handleDateChange(-1)} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={24} color="#1d4ed8" />
          </TouchableOpacity>
          <Text style={styles.dateText}>{selectedDate}</Text>
          <TouchableOpacity onPress={() => handleDateChange(1)} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={24} color="#1d4ed8" />
          </TouchableOpacity>
        </View>

        {/* Time Slot Selection */}
        <Text style={styles.sectionTitle}>Select a Time Slot</Text>
        {loadingSlots ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginVertical: 32 }} />
        ) : slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Ionicons name="time-outline" size={40} color="#cbd5e1" />
            <Text style={styles.noSlotsText}>No available slots for this date</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot, i) => {
              const isSelected = selectedSlot?.start === slot.start;
              const isAvailable = slot.state === 'Available';
              const isBooked = slot.state === 'Booked';
              const isBlocked = slot.state === 'Blocked';
              const isPending = slot.state === 'Pending';
              
              let btnStyle = styles.slotBtnAvailable;
              let txtStyle = styles.slotTextAvailable;
              let iconName = 'time-outline';
              let stateLabel = '';

              let pendingSecsLeft = null;
              if (isPending && slotLockInfo[slot.start]) {
                void tick;
                pendingSecsLeft = Math.max(0, Math.round((new Date(slotLockInfo[slot.start]) - Date.now()) / 1000));
              }

              if (isBooked) {
                btnStyle = styles.slotBtnBooked;
                txtStyle = styles.slotTextBooked;
                iconName = 'close-circle';
                stateLabel = 'Booked';
              } else if (isBlocked) {
                btnStyle = styles.slotBtnBlocked;
                txtStyle = styles.slotTextBlocked;
                iconName = 'ban';
                stateLabel = 'Blocked';
              } else if (isPending) {
                btnStyle = styles.slotBtnPending;
                txtStyle = styles.slotTextPending;
                iconName = 'hourglass-outline';
                stateLabel = pendingSecsLeft !== null
                  ? `Held · ${Math.floor(pendingSecsLeft / 60)}:${String(pendingSecsLeft % 60).padStart(2, '0')}`
                  : 'Held';
              }

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.slotBtn, btnStyle, isSelected && styles.slotBtnSelected]}
                  onPress={() => setSelectedSlot(slot)}
                  disabled={!isAvailable}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={isSelected ? '#ffffff' : txtStyle.color}
                    />
                    <Text style={[styles.slotText, txtStyle, isSelected && styles.slotTextSelected]}>
                      {slot.start} – {slot.end}
                    </Text>
                  </View>
                  {!isAvailable && (
                    <View style={styles.slotStateRow}>
                      <Ionicons name={iconName} size={12} color={txtStyle.color} />
                      <Text style={[styles.slotStateText, txtStyle]}>{stateLabel}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedSlot && !lockedByMe && (
           <View style={{ marginTop: 24, marginBottom: 24 }}>
             <TouchableOpacity style={styles.holdBtn} onPress={handleHoldSlot}>
               <Text style={styles.holdBtnText}>Hold Slot & Proceed to Payment</Text>
             </TouchableOpacity>
           </View>
        )}

        {/* Payment Method Selection */}
        {lockedByMe && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {timeLeft !== null && (
                 <Text style={[styles.timerText, timeLeft <= 30 && { color: '#ef4444' }]}>
                   ⏳ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                 </Text>
              )}
            </View>
        <View style={styles.paymentMethodContainer}>
          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'card' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <Ionicons name="card-outline" size={24} color={paymentMethod === 'card' ? '#1d4ed8' : '#64748b'} />
            <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextActive]}>Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'onsite' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('onsite')}
          >
            <Ionicons name="cash-outline" size={24} color={paymentMethod === 'onsite' ? '#1d4ed8' : '#64748b'} />
            <Text style={[styles.methodText, paymentMethod === 'onsite' && styles.methodTextActive]}>On-Site</Text>
          </TouchableOpacity>
        </View>

        {paymentMethod === 'card' && (
          <View style={styles.cardInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Card Number"
              keyboardType="numeric"
              maxLength={16}
              value={cardDetails.number}
              onChangeText={(text) => setCardDetails({ ...cardDetails, number: text })}
            />
            <View style={styles.cardRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="MM/YY"
                keyboardType="numeric"
                maxLength={5}
                value={cardDetails.expiry}
                onChangeText={(text) => setCardDetails({ ...cardDetails, expiry: text })}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="CVV"
                keyboardType="numeric"
                maxLength={3}
                value={cardDetails.cvv}
                onChangeText={(text) => setCardDetails({ ...cardDetails, cvv: text })}
              />
            </View>
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Amount Due {paymentMethod === 'onsite' ? '(on arrival)' : '(now)'}</Text>
          <Text style={styles.priceAmount}>LKR {facility.pricePerHour}</Text>
          <View style={styles.paymentBadge}>
            <Ionicons name={paymentMethod === 'card' ? "card-outline" : "cash-outline"} size={14} color="#7c3aed" />
            <Text style={styles.paymentText}>{paymentMethod === 'card' ? 'Pay Now' : 'Pay On-Site'}</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!selectedSlot || loading) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={!selectedSlot || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.confirmBtnText}>Confirm Booking {paymentMethod === 'card' ? `& Pay LKR ${facility.pricePerHour}` : ''}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          {paymentMethod === 'card' ? '* Your card will be charged securely via our mock gateway.' : '* Payment will be collected on-site before your session begins.'}
        </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateArrow: { padding: 4 },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1d4ed8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  facilityName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: { fontSize: 13, color: '#64748b' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noSlotsText: { fontSize: 13, color: '#94a3b8' },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  slotBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  slotBtnAvailable: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  slotBtnBooked: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  slotBtnBlocked: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  slotBtnPending: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  slotBtnSelected: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },

  slotText: { fontSize: 13, fontWeight: '700' },
  slotTextAvailable: { color: '#1d4ed8' },
  slotTextBooked: { color: '#64748b' },
  slotTextBlocked: { color: '#ef4444' },
  slotTextPending: { color: '#d97706' },
  slotTextSelected: { color: '#ffffff' },

  slotStateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  slotStateText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  methodBtnActive: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  methodTextActive: {
    color: '#1d4ed8',
  },
  cardInputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    color: '#1e293b',
  },
  cardRow: {
    flexDirection: 'row',
  },
  priceCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1d4ed8',
    marginBottom: 8,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
  },
  holdBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  holdBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#d97706',
  },
  confirmBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowColor: 'transparent',
    elevation: 0,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
