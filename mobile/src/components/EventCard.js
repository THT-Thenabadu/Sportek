import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function EventCard({ event, onPress }) {
  const { name, date, venueId, location, venue, ticketCategories, ticketTiers, bannerImage, image } = event;
  const dateStr = date
    ? new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date TBA';
  
  const sourceCats = ticketCategories?.length ? ticketCategories : ticketTiers;
  const minPrice = sourceCats?.length
    ? Math.min(...sourceCats.map((t) => t.price || 0))
    : null;
    
  const displayLocation = venueId?.name ? `${venueId.name}${venueId.city ? `, ${venueId.city}` : ''}` : (location || venue?.name);
  const displayImage = bannerImage || image;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {displayImage ? (
        <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="ticket" size={40} color="#1d4ed8" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={13} color="#64748b" />
          <Text style={styles.meta}>{dateStr}</Text>
        </View>
        {displayLocation ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color="#64748b" />
            <Text style={styles.meta} numberOfLines={1}>{displayLocation}</Text>
          </View>
        ) : null}
        {minPrice != null && (
          <Text style={styles.price}>From LKR {minPrice}</Text>
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
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#dbeafe',
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
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#64748b',
  },
  price: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
});
