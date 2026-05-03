import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function EventDetailScreen({ route }) {
  const { event } = route.params;
  const { name, date, description, image, venue, ticketTiers = [] } = event;

  const dateStr = date
    ? new Date(date).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'Date TBA';

  const handleTicket = (tier) => {
    Alert.alert(
      'Purchase Ticket',
      `${tier.name}\nLKR ${tier.price}\n\nTicket purchasing is available on the web app for full payment processing.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="ticket" size={60} color="#1d4ed8" />
          </View>
        )}

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.name}>{name}</Text>

          {/* Meta */}
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color="#1d4ed8" />
              <Text style={styles.metaText}>{dateStr}</Text>
            </View>
            {venue?.name && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color="#1d4ed8" />
                <Text style={styles.metaText}>{venue.name}{venue.city ? `, ${venue.city}` : ''}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          ) : null}

          {/* Ticket Tiers */}
          {ticketTiers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ticket Tiers</Text>
              {ticketTiers.map((tier, i) => (
                <View key={i} style={styles.tierCard}>
                  <View style={styles.tierInfo}>
                    <Text style={styles.tierName}>{tier.name || `Tier ${i + 1}`}</Text>
                    {tier.description && (
                      <Text style={styles.tierDesc}>{tier.description}</Text>
                    )}
                    <Text style={styles.tierAvail}>
                      {tier.available ?? tier.quantity ?? '—'} tickets left
                    </Text>
                  </View>
                  <View style={styles.tierRight}>
                    <Text style={styles.tierPrice}>LKR {tier.price}</Text>
                    <TouchableOpacity
                      style={styles.buyBtn}
                      onPress={() => handleTicket(tier)}
                    >
                      <Text style={styles.buyBtnText}>Buy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
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
    width: '100%', height: 240,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 20 },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  metaCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: { fontSize: 14, color: '#374151', flex: 1 },
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
  tierCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tierInfo: { flex: 1, marginRight: 12 },
  tierName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  tierDesc: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  tierAvail: { fontSize: 12, color: '#94a3b8' },
  tierRight: { alignItems: 'flex-end', gap: 8 },
  tierPrice: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
  buyBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  buyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
