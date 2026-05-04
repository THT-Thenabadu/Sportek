import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Image, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../store/useAuthStore';
import api from '../../lib/axios';
import FacilityCard from '../../components/FacilityCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const SPORT_FILTERS = ['All', 'Football', 'Basketball', 'Tennis', 'Cricket', 'Swimming', 'Badminton', 'Gym'];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState(''); // '', 'price_asc', 'price_desc', 'name_asc'

  const fetchData = useCallback(async () => {
    try {
      const [propRes, reqRes] = await Promise.all([
        api.get('/properties'),
        api.get('/reschedule/owner')
      ]);
      setFacilities(propRes.data);
      setPendingRequestsCount(reqRes.data?.length || 0);
    } catch (e) {
      console.log('Error fetching data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  let filtered = facilities.filter((f) => {
    const matchesSport = selectedFilter === 'All' || f.sportType?.toLowerCase() === selectedFilter.toLowerCase();
    const matchesSearch = !searchQuery || 
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.sportType?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  filtered.sort((a, b) => {
    if (sortOption === 'price_asc') return (a.pricePerHour || 0) - (b.pricePerHour || 0);
    if (sortOption === 'price_desc') return (b.pricePerHour || 0) - (a.pricePerHour || 0);
    if (sortOption === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {/* Hero Banner */}
        <View style={styles.hero}>
          <View style={styles.heroContent}>
            <Text style={styles.greeting}>Hi, {firstName}! 👋</Text>
            <Text style={styles.heroTitle}>Ready to play?</Text>
            <Text style={styles.heroSubtitle}>Browse and book top sports facilities</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="fitness" size={48} color="rgba(255,255,255,0.3)" />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="business" size={22} color="#1d4ed8" />
            <Text style={styles.statNum}>{facilities.length}</Text>
            <Text style={styles.statLabel}>Venues</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={22} color="#1d4ed8" />
            <Text style={styles.statNum}>{SPORT_FILTERS.length - 1}</Text>
            <Text style={styles.statLabel}>Sports</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={22} color="#1d4ed8" />
            <Text style={styles.statNum}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Action Banners */}
        <TouchableOpacity 
          style={styles.actionBanner}
          onPress={() => navigation.navigate('RescheduleRequests')}
        >
          <View style={styles.actionBannerIcon}>
            <Ionicons name="swap-horizontal" size={24} color="#f59e0b" />
          </View>
          <View style={styles.actionBannerContent}>
            <Text style={styles.actionBannerTitle}>Venue Change Requests</Text>
            <Text style={styles.actionBannerSubtitle}>
              {pendingRequestsCount} pending customer {pendingRequestsCount === 1 ? 'request' : 'requests'}
            </Text>
          </View>
          {pendingRequestsCount > 0 && (
             <View style={styles.badge}>
               <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
             </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by venue name or sport..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters and Sort */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {SPORT_FILTERS.map((sport) => (
              <TouchableOpacity
                key={sport}
                style={[styles.filterChip, selectedFilter === sport && styles.filterChipActive]}
                onPress={() => setSelectedFilter(sport)}
              >
                <Text style={[styles.filterChipText, selectedFilter === sport && styles.filterChipTextActive]}>
                  {sport}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContent}>
            {[
              { id: '', label: 'Default Sort' },
              { id: 'price_asc', label: 'Price: Low to High' },
              { id: 'price_desc', label: 'Price: High to Low' },
              { id: 'name_asc', label: 'Name: A-Z' },
            ].map((sort) => (
              <TouchableOpacity
                key={sort.id}
                style={[styles.sortChip, sortOption === sort.id && styles.sortChipActive]}
                onPress={() => setSortOption(sort.id)}
              >
                <Ionicons name="swap-vertical" size={14} color={sortOption === sort.id ? '#ffffff' : '#64748b'} />
                <Text style={[styles.sortChipText, sortOption === sort.id && styles.sortChipTextActive]}>
                  {sort.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Venues List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Venues</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>No venues found</Text>
            </View>
          ) : (
            filtered.map((facility) => (
              <FacilityCard
                key={facility._id}
                facility={facility}
                onPress={() => navigation.navigate('FacilityDetail', { facility })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  hero: {
    backgroundColor: '#1d4ed8',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: { flex: 1 },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  heroIcon: {
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionBannerContent: {
    flex: 1,
  },
  actionBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  actionBannerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  filtersSection: { marginTop: 16 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  sortContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#ffffff' },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  sortChipActive: { backgroundColor: '#334155', borderColor: '#334155' },
  sortChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  sortChipTextActive: { color: '#ffffff' },
  section: { paddingHorizontal: 16, marginTop: 10, paddingBottom: 24 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
