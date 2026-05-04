import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../store/useAuthStore';

export default function EventDetailScreen({ route, navigation }) {
  const { event } = route.params;
  const { 
    name, date, time, description, eventType, venueId, location, venue, 
    organizerName, bookingDeadline, ticketCategories, ticketTiers, bannerImage, image 
  } = event;

  const { user } = useAuth();

  const sourceCats = ticketCategories?.length ? ticketCategories : (ticketTiers || []);
  const displayImage = bannerImage || image;
  const displayLocation = venueId?.name ? `${venueId.name}${venueId.city ? `, ${venueId.city}` : ''}` : (location || venue?.name || 'TBA');
  const dateStr = date ? new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBA';
  const deadlineStr = bookingDeadline ? new Date(bookingDeadline).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  
  const minPrice = sourceCats.length ? Math.min(...sourceCats.map(c => c.price || 0)) : 0;
  
  const totalBooked = sourceCats.reduce((acc, cat) => acc + (cat.soldQuantity || 0), 0);

  const handleBookNow = async () => {
    if (!user) {
      if (Platform.OS === 'web') {
        window.alert('Please login to book tickets.');
      } else {
        Alert.alert('Login Required', 'Please login to book tickets.');
      }
      return;
    }
    
    if (Platform.OS === 'web') {
      window.alert('Ticket purchasing is available on the web app for full payment processing.');
    } else {
      Alert.alert(
        'Purchase Ticket',
        `Ready to book your tickets?\n\nTicket purchasing is available on the web app for full payment processing.`,
        [{ text: 'OK' }]
      );
    }
  };

  const InfoGridCard = ({ icon, title, value }) => (
    <View style={styles.gridCard}>
      <View style={styles.gridIconBox}>
        <Ionicons name={icon} size={16} color="#3b82f6" />
      </View>
      <View style={styles.gridTextContent}>
        <Text style={styles.gridCardTitle}>{title}</Text>
        <Text style={styles.gridCardValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Image */}
        <ImageBackground 
          source={{ uri: displayImage || 'https://via.placeholder.com/800x400' }} 
          style={styles.headerImage}
        >
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{name}</Text>
              {eventType ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{eventType.charAt(0).toUpperCase() + eventType.slice(1)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>About This Event</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : (
            <Text style={styles.description}>No description available for this event.</Text>
          )}

          {/* 2-Column Grid */}
          <View style={styles.gridContainer}>
            <InfoGridCard icon="calendar-outline" title="DATE" value={dateStr} />
            <InfoGridCard icon="time-outline" title="TIME" value={time || 'TBA'} />
            <InfoGridCard icon="location-outline" title="VENUE" value={displayLocation} />
            <InfoGridCard icon="business-outline" title="ORGANIZER" value={organizerName || 'Sportek Events'} />
            <InfoGridCard icon="pricetag-outline" title="STARTING PRICE" value={`LKR ${minPrice}`} />
            <InfoGridCard icon="alert-circle-outline" title="BOOKING DEADLINE" value={deadlineStr} />
          </View>

          {/* Ticket Categories */}
          <View style={styles.ticketSection}>
            <Text style={styles.sectionTitle}>Ticket Categories</Text>
            
            {sourceCats.map((cat, i) => {
              const total = cat.totalQuantity || 100;
              const sold = cat.soldQuantity || 0;
              const available = Math.max(0, total - sold);
              const percent = Math.min(100, Math.round(((total - available) / total) * 100)) || 0;
              
              return (
                <View key={i} style={styles.catCard}>
                  <View style={styles.catHeader}>
                    <Text style={styles.catName}>{cat.name || cat.tier || `Category ${i+1}`}</Text>
                    <Text style={styles.catPrice}>LKR {cat.price}</Text>
                  </View>
                  <View style={styles.catSub}>
                    <Text style={styles.catAvail}>{available} / {total} available</Text>
                    <Text style={styles.catPercent}>{100 - percent}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${100 - percent}%` }]} />
                  </View>
                </View>
              );
            })}

            <View style={styles.bookArea}>
              <View style={styles.bookInfo}>
                <Ionicons name="people-outline" size={16} color="#64748b" />
                <Text style={styles.bookInfoText}>{totalBooked} tickets already booked</Text>
              </View>
              <TouchableOpacity 
                style={styles.bookBtn} 
                activeOpacity={0.85}
                onPress={handleBookNow}
              >
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
              <Text style={styles.bookDeadline}>Book before {deadlineStr}</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  headerImage: {
    width: '100%',
    height: 280,
    justifyContent: 'flex-end',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  gridIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTextContent: { flex: 1 },
  gridCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  gridCardValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  ticketSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 40,
  },
  catCard: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  catPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3b82f6',
  },
  catSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catAvail: {
    fontSize: 12,
    color: '#64748b',
  },
  catPercent: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  bookArea: {
    marginTop: 8,
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  bookInfoText: {
    fontSize: 13,
    color: '#64748b',
  },
  bookBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bookDeadline: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 12,
  }
});
