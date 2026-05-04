import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';

import { useAuth } from '../../store/useAuthStore';

export default function FacilityDetailScreen({ route, navigation }) {
  const { facility } = route?.params || {};
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await api.get(`/bookings/slots/${facility._id}?date=${today}`);
        const slotsData = Array.isArray(res.data) ? res.data : (res.data?.slots || []);
        setSlots(slotsData);
      } catch (e) {
        console.log('Error fetching slots:', e.message);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [facility._id]);

  const imageUri = facility.images?.[0] || null;
  const availableSlots = Array.isArray(slots) ? slots.filter((s) => s.state === 'Available') : [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="fitness" size={60} color="#1d4ed8" />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.name}>{facility.name}</Text>

          {/* Tags */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Ionicons name="trophy-outline" size={13} color="#1d4ed8" />
              <Text style={styles.tagText}>{facility.sportType || 'Sport'}</Text>
            </View>
            <View style={styles.tag}>
              <Ionicons name="location-outline" size={13} color="#1d4ed8" />
              <Text style={styles.tagText}>{(typeof facility.location === 'object' ? facility.location?.address : facility.location) || 'N/A'}</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Price per hour</Text>
              <Text style={styles.price}>LKR {facility.pricePerHour}</Text>
            </View>
            <Ionicons name="cash-outline" size={28} color="#1d4ed8" />
          </View>

          {/* Description */}
          {facility.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this facility</Text>
              <Text style={styles.description}>{facility.description}</Text>
            </View>
          ) : null}

          {/* Available Slots */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Slots Today</Text>
            {loadingSlots ? (
              <ActivityIndicator color="#1d4ed8" style={{ marginTop: 10 }} />
            ) : availableSlots.length === 0 ? (
              <View style={styles.noSlots}>
                <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
                <Text style={styles.noSlotsText}>No available slots today</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotsScroll}>
                {availableSlots.slice(0, 8).map((slot, i) => (
                  <View key={i} style={styles.slotChip}>
                    <Text style={styles.slotText}>{slot.start} – {slot.end}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Book Button or Restriction Box */}
          {user?.role !== 'customer' ? (
            <View style={styles.restrictionBox}>
              <Ionicons name="information-circle-outline" size={24} color="#64748b" />
              <Text style={styles.restrictionText}>Only customers can make bookings.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.bookBtn, availableSlots.length === 0 && styles.bookBtnDisabled]}
              onPress={() => navigation.navigate('BookingFlow', { facility, slots: availableSlots })}
              disabled={availableSlots.length === 0}
            >
              <Ionicons name="calendar" size={18} color="#ffffff" />
              <Text style={styles.bookBtnText}>
                {availableSlots.length > 0 ? 'Book Now' : 'No Slots Available'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  image: { width: '100%', height: 240 },
  imagePlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 20 },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  slotsScroll: { marginBottom: 4 },
  slotChip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  slotText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noSlotsText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  bookBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  bookBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowColor: 'transparent',
    elevation: 0,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  restrictionBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  restrictionText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
