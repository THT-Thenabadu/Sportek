import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import { useAuth } from '../../store/useAuthStore';

const StatCard = ({ icon, label, value, color, bg }) => (
  <View style={[styles.statCard, { backgroundColor: bg }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, label, color, bg, onPress }) => (
  <TouchableOpacity style={[styles.actionCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.actionIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={26} color="#ffffff" />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={color} style={{ marginTop: 4 }} />
  </TouchableOpacity>
);

export default function SecurityHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ upcoming: 0, active: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [upcomingRes, currentRes] = await Promise.all([
        api.get('/bookings/upcoming-security'),
        api.get('/bookings/current-security'),
      ]);
      setStats({
        upcoming: (upcomingRes.data || []).length,
        active: (currentRes.data || []).length,
        total: (upcomingRes.data || []).length + (currentRes.data || []).length,
      });
    } catch (e) {
      console.log('Stats fetch error:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'S';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name}>{user?.name || 'Security Officer'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsRow}>
          <StatCard icon="calendar-outline" label="Upcoming" value={stats.upcoming} color="#1d4ed8" bg="#eff6ff" />
          <StatCard icon="radio-button-on-outline" label="Active" value={stats.active} color="#16a34a" bg="#f0fdf4" />
          <StatCard icon="layers-outline" label="Total" value={stats.total} color="#7c3aed" bg="#f5f3ff" />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="qr-code-outline"
            label="Scan QR Code"
            color="#1d4ed8"
            bg="#ffffff"
            onPress={() => navigation.navigate('ScanQR')}
          />
          <QuickAction
            icon="calendar-outline"
            label="Upcoming Bookings"
            color="#0891b2"
            bg="#ffffff"
            onPress={() => navigation.navigate('UpcomingBookings')}
          />
          <QuickAction
            icon="time-outline"
            label="Current Bookings"
            color="#16a34a"
            bg="#ffffff"
            onPress={() => navigation.navigate('CurrentBookings')}
          />
          <QuickAction
            icon="list-outline"
            label="Entry Log"
            color="#7c3aed"
            bg="#ffffff"
            onPress={() => navigation.navigate('EntryLog')}
          />
          <QuickAction
            icon="clipboard-outline"
            label="Booking Details"
            color="#0891b2"
            bg="#ffffff"
            onPress={() => navigation.navigate('BookingDetails')}
          />
          <QuickAction
            icon="person-outline"
            label="My Profile"
            color="#dc2626"
            bg="#ffffff"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1d4ed8', borderRadius: 20, padding: 20, marginBottom: 24,
  },
  greeting: { fontSize: 14, color: '#bfdbfe', fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  actionsGrid: { gap: 10 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1e293b' },
});
