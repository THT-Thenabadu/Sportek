import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  booked:         { label: 'Upcoming',   bg: '#eff6ff', text: '#1d4ed8', icon: 'calendar-outline',          dot: '#1d4ed8' },
  pending_onsite: { label: 'Upcoming',   bg: '#fef9c3', text: '#a16207', icon: 'calendar-outline',          dot: '#a16207' },
  active:         { label: 'Active',     bg: '#dcfce7', text: '#16a34a', icon: 'radio-button-on-outline',   dot: '#16a34a' },
  completed:      { label: 'Completed',  bg: '#f0fdf4', text: '#15803d', icon: 'checkmark-circle-outline',  dot: '#15803d' },
  ended:          { label: 'Ended',      bg: '#f1f5f9', text: '#475569', icon: 'stop-circle-outline',       dot: '#475569' },
  cancelled:      { label: 'Cancelled',  bg: '#fee2e2', text: '#dc2626', icon: 'close-circle-outline',      dot: '#dc2626' },
  pending:        { label: 'Pending',    bg: '#fef9c3', text: '#a16207', icon: 'time-outline',              dot: '#a16207' },
};

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ── Booking Card ──────────────────────────────────────────────────────────────
function BookingCard({ booking }) {
  const status = booking.status || 'pending';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const customer = booking.customerId?.name || 'Unknown';
  const email    = booking.customerId?.email || '';
  const facility = booking.propertyId?.name || 'Unknown Facility';
  const date = booking.date
    ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const time = booking.timeSlot
    ? `${booking.timeSlot.start} – ${booking.timeSlot.end}`
    : '—';
  const amount = booking.totalAmount
    ? `LKR ${Number(booking.totalAmount).toLocaleString()}`
    : '—';
  const payMethod = booking.paymentMethod === 'onsite' ? 'On-Site' : 'Online';

  return (
    <View style={styles.card}>
      {/* Status dot bar */}
      <View style={[styles.cardDot, { backgroundColor: cfg.dot }]} />

      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{customer[0]?.toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.customerName}>{customer}</Text>
            <Text style={styles.customerEmail} numberOfLines={1}>{email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.text} />
            <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Details grid */}
        <View style={styles.detailGrid}>
          <DetailItem icon="business-outline"  label="Facility" value={facility} />
          <DetailItem icon="calendar-outline"  label="Date"     value={date} />
          <DetailItem icon="time-outline"      label="Time"     value={time} />
          <DetailItem icon="cash-outline"      label="Amount"   value={amount} />
          <DetailItem icon="card-outline"      label="Payment"  value={payMethod} />
          {booking.passkey ? (
            <DetailItem icon="key-outline" label="Passkey" value={booking.passkey} highlight />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DetailItem({ icon, label, value, highlight }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={12} color="#94a3b8" />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailHighlight]}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BookingDetailsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/all-security');
      setBookings(res.data || []);
    } catch (e) {
      console.log('Error fetching bookings:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  // Filter by tab
  const filtered = bookings.filter(b => {
    const matchTab =
      activeTab === 'all'       ? true :
      activeTab === 'upcoming'  ? ['booked', 'pending_onsite'].includes(b.status) :
      activeTab === 'active'    ? b.status === 'active' :
      activeTab === 'completed' ? ['completed', 'ended'].includes(b.status) :
      activeTab === 'cancelled' ? b.status === 'cancelled' :
      true;

    const matchSearch = !search.trim() ||
      b.customerId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.propertyId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.passkey?.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingToken?.toLowerCase().includes(search.toLowerCase());

    return matchTab && matchSearch;
  });

  // Count per tab
  const counts = {
    all:       bookings.length,
    upcoming:  bookings.filter(b => ['booked', 'pending_onsite'].includes(b.status)).length,
    active:    bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => ['completed', 'ended'].includes(b.status)).length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  if (loading) return <LoadingSpinner message="Loading bookings..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, facility, passkey..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, activeTab === tab.key && styles.tabCountTextActive]}>
                  {counts[tab.key]}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results count */}
        <Text style={styles.resultsText}>
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
        </Text>

        {/* Booking list */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        ) : (
          filtered.map(b => <BookingCard key={b._id} booking={b} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#1e293b' },

  tabsScroll: { marginBottom: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    marginRight: 8,
  },
  tabActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  tabCount: {
    backgroundColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  tabCountTextActive: { color: '#fff' },

  resultsText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 10 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardDot: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  avatarBox: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#1d4ed8' },
  cardInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  customerEmail: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: '700' },

  detailGrid: { gap: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 11, color: '#94a3b8', width: 56 },
  detailValue: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
  detailHighlight: { color: '#1d4ed8', fontWeight: '800', fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});
