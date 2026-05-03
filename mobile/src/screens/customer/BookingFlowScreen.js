import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';

export default function BookingFlowScreen({ route, navigation }) {
  const { facility, slots: initialSlots } = route?.params || {};
  const slots = Array.isArray(initialSlots) ? initialSlots : [];
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      Alert.alert('Select a time slot', 'Please choose a time slot before confirming.');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Book ${facility.name}\n${today}\n${selectedSlot.start} – ${selectedSlot.end}\n\nPayment: LKR ${facility.pricePerHour} (On-site)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await api.post('/bookings/create-onsite', {
                propertyId: facility._id,
                date: today,
                timeSlotStart: selectedSlot.start,
                timeSlotEnd: selectedSlot.end,
              });
              Alert.alert(
                '🎉 Booking Confirmed!',
                `Your booking at ${facility.name} has been confirmed.\nPay LKR ${facility.pricePerHour} on arrival.`,
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
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{today}</Text>
          </View>
        </View>

        {/* Time Slot Selection */}
        <Text style={styles.sectionTitle}>Select a Time Slot</Text>
        {slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Ionicons name="time-outline" size={40} color="#cbd5e1" />
            <Text style={styles.noSlotsText}>No available slots for today</Text>
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

        {/* Price Summary */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Amount Due (on arrival)</Text>
          <Text style={styles.priceAmount}>LKR {facility.pricePerHour}</Text>
          <View style={styles.paymentBadge}>
            <Ionicons name="cash-outline" size={14} color="#7c3aed" />
            <Text style={styles.paymentText}>Pay On-Site</Text>
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
              <Text style={styles.confirmBtnText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          * Payment will be collected on-site before your session begins.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
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
