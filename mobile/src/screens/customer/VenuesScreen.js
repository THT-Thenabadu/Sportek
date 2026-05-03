import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import FacilityCard from '../../components/FacilityCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function VenuesScreen({ navigation }) {
  const [facilities, setFacilities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await api.get('/properties');
      setFacilities(res.data);
    } catch (e) {
      console.log('Error fetching venues:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

  const onRefresh = () => { setRefreshing(true); fetchFacilities(); };

  const filtered = facilities.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.sportType?.toLowerCase().includes(q) ||
      (typeof f.location === 'object' ? f.location?.address : f.location)?.toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner message="Loading venues..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or sport..."
          placeholderTextColor="#cbd5e1"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.resultCount}>
        {filtered.length} {filtered.length === 1 ? 'venue' : 'venues'} found
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <FacilityCard
            facility={item}
            onPress={() => navigation.navigate('FacilityDetail', { facility: item })}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No venues found</Text>
            <Text style={styles.emptyText}>Try adjusting your search query</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1e293b',
  },
  resultCount: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
