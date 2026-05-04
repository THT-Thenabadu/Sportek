import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import { TextInput } from 'react-native';

export default function BookingFlowScreen({ route, navigation }) {
  const { facility, slots: initialSlots } = route?.params || {};
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState(Array.isArray(initialSlots) ? initialSlots : []);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('onsite');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

  const fetchSlotsForDate = async (dateStr) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await api.get(`/bookings/slots/${facility._id}?date=${dateStr}`);
      const slotsData = Array.isArray(res.data) ? res.data : (res.data?.slots || []);
      setSlots(slotsData.filter((s) => s.state === 'Available'));
    } catch (e) {
      console.log('Error fetching slots:', e.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
    fetchSlotsForDate(newDateStr);
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
                date: selectedDate,
                timeSlotStart: selectedSlot.start,
                timeSlotEnd: selectedSlot.end,
                paymentMethod: paymentMethod
              });

              Alert.alert(
                '🎉 Booking Confirmed!',
                `Your booking at ${facility.name} has been confirmed.\n${paymentMethod === 'card' ? 'Payment successful.' : `Pay LKR ${facility.pricePerHour} on arrival.`}`,
                [{ text: 'View My Bookings', onPress: () => navigation.navigate('Bookings') }]
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
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.slotBtn, isSelected && styles.slotBtnSelected]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isSelected ? '#ffffff' : '#1d4ed8'}
                  />
                  <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                    {slot.start}
                  </Text>
                  <Text style={[styles.slotEnd, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                    – {slot.end}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Payment Method Selection */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
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
  },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotBtnSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  slotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  slotTextSelected: { color: '#ffffff' },
  slotEnd: {
    fontSize: 12,
    color: '#64748b',
  },
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
});
