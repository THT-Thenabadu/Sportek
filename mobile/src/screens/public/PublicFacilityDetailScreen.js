import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function PublicFacilityDetailScreen({ route, navigation }) {
  const { facility } = route?.params || {};
  if (!facility) return null;

  const locationText = typeof facility.location === 'object'
    ? facility.location?.address
    : facility.location;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        {facility.images?.[0] ? (
          <Image source={{ uri: facility.images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="fitness" size={56} color="#1d4ed8" />
          </View>
        )}

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.name}>{facility.name}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="trophy-outline" size={15} color="#1d4ed8" />
            <Text style={styles.metaText}>{facility.sportType || 'Sport'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color="#64748b" />
            <Text style={styles.metaText}>{locationText || 'Location N/A'}</Text>
          </View>

          {/* Price card */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Price per slot</Text>
            <Text style={styles.priceAmount}>LKR {facility.pricePerHour}</Text>
          </View>

          {/* Description */}
          {facility.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{facility.description}</Text>
            </View>
          )}

          {/* Login to book CTA */}
          <View style={styles.ctaCard}>
            <Ionicons name="lock-closed-outline" size={28} color="#1d4ed8" />
            <Text style={styles.ctaTitle}>Login to Book</Text>
            <Text style={styles.ctaSubtitle}>
              Create a free account or sign in to book this facility
            </Text>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.bookBtnText}>Create Free Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginBtnText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  image: { width: '100%', height: 220 },
  imagePlaceholder: {
    width: '100%', height: 220,
    backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: 20 },
  name: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { fontSize: 14, color: '#64748b' },
  priceCard: {
    backgroundColor: '#eff6ff', borderRadius: 14,
    padding: 16, marginVertical: 16, alignItems: 'center',
  },
  priceLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  priceAmount: { fontSize: 28, fontWeight: '800', color: '#1d4ed8' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  description: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  ctaCard: {
    backgroundColor: '#0f172a', borderRadius: 20,
    padding: 24, alignItems: 'center', marginTop: 8,
  },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginTop: 10, marginBottom: 6 },
  ctaSubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginBottom: 20, lineHeight: 18,
  },
  bookBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
    width: '100%', alignItems: 'center', marginBottom: 12,
  },
  bookBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  loginBtn: { paddingVertical: 8 },
  loginBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
});
