import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminHomeScreen() {
  const [stats, setStats] = useState({ users: 0, properties: 0, bookings: 0, applications: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [usersRes, propsRes, booksRes, appsRes] = await Promise.all([
        api.get('/users'),
        api.get('/properties'),
        api.get('/bookings/all'),
        api.get('/applications')
      ]);

      setStats({
        users: usersRes.data.length || 0,
        properties: propsRes.data.length || 0,
        bookings: booksRes.data.length || 0,
        applications: (appsRes.data || []).filter((a) => a.status === 'pending').length
      });
    } catch (err) {
      console.log('Error fetching admin stats:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const STAT_CARDS = [
    { title: 'Total Users', value: stats.users, icon: 'people', color: '#1d4ed8' },
    { title: 'Total Properties', value: stats.properties, icon: 'business', color: '#1d4ed8' },
    { title: 'Total Bookings', value: stats.bookings, icon: 'calendar', color: '#1d4ed8' },
    { title: 'Pending Apps', value: stats.applications, icon: 'clipboard', color: '#1d4ed8' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.grid}>
          {STAT_CARDS.map((card, i) => (
            <View key={i} style={styles.card}>
              <View style={[styles.iconBg, { backgroundColor: card.color + '15' }]}>
                <Ionicons name={card.icon} size={24} color={card.color} />
              </View>
              <Text style={[styles.value, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.label}>{card.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  card: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 13, color: '#64748b', fontWeight: '600', textAlign: 'center' },
});
