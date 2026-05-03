import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import EventCard from '../../components/EventCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data || []);
    } catch (e) {
      console.log('Error fetching events:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  if (loading) return <LoadingSpinner message="Loading events..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => navigation.navigate('EventDetail', { event: item })}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
        }
        ListHeaderComponent={
          <Text style={styles.header}>Upcoming Events</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>Check back soon for upcoming events</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyText: { fontSize: 13, color: '#94a3b8' },
});
