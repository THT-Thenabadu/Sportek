import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const SPORT_ICONS = {
  football: 'football',
  basketball: 'basketball',
  tennis: 'tennisball',
  badminton: 'tennisball',
  cricket: 'baseball',
  swimming: 'water',
  volleyball: 'football',
  gym: 'barbell',
};

const PLACEHOLDER_COLORS = ['#dbeafe', '#e0e7ff', '#d1fae5', '#fef3c7', '#ffe4e6'];

export default function FacilityCard({ facility, onPress, hideBookButton }) {
  const { name, sportType, location, pricePerHour, images } = facility;
  const locationText = typeof location === 'object' ? location?.address : location;
  const imageUri = images?.[0] || null;
  const colorIndex = (name?.charCodeAt(0) || 0) % PLACEHOLDER_COLORS.length;
  const bgColor = PLACEHOLDER_COLORS[colorIndex];
  const iconName = SPORT_ICONS[sportType?.toLowerCase()] || 'fitness';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: bgColor }]}>
          <Ionicons name={iconName} size={36} color="#1d4ed8" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.row}>
          <Ionicons name="trophy-outline" size={13} color="#64748b" />
          <Text style={styles.meta}>{sportType || 'Sport'}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color="#64748b" />
          <Text style={styles.meta} numberOfLines={1}>{locationText || 'Location N/A'}</Text>
        </View>
        {pricePerHour != null && (
          <View style={styles.bottomRow}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>LKR {pricePerHour}</Text>
              <Text style={styles.perHour}>/hr</Text>
            </View>
            {!hideBookButton && (
              <View style={styles.bookBtn}>
                <Text style={styles.bookBtnText}>Book</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 150,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  meta: {
    fontSize: 13,
    color: '#64748b',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  perHour: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  bookBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookBtnText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
});
