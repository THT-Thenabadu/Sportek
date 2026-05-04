import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';

const TYPE_OPTIONS = ['visitor', 'member', 'maintenance'];
const TYPE_COLORS = {
  visitor:     { bg: '#eff6ff', text: '#1d4ed8' },
  member:      { bg: '#f0fdf4', text: '#16a34a' },
  maintenance: { bg: '#fef9c3', text: '#a16207' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const getNow = () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return {
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    date: now.toISOString().split('T')[0],
    dateObj: now,
  };
};

// ── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({ log, onDelete, onExit }) {
  const colors = TYPE_COLORS[log.type] || { bg: '#f1f5f9', text: '#475569' };
  const date = log.entryDate
    ? new Date(log.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete entry for ${log.name}?`)) onDelete(log._id);
    } else {
      Alert.alert('Delete Entry', `Remove entry for ${log.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(log._id) },
      ]);
    }
  };

  const handleExit = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Mark exit for ${log.name}?`)) onExit(log._id);
    } else {
      Alert.alert('Mark Exit', `Mark ${log.name} as exited?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Exit', onPress: () => onExit(log._id) },
      ]);
    }
  };

  return (
    <View style={styles.card}>
      {/* Top row — name + type badge */}
      <View style={styles.cardTop}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{log.name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{log.name}</Text>
          <Text style={styles.cardId}>ID: {log.idNumber}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.typeText, { color: colors.text }]}>
            {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
          </Text>
        </View>
      </View>

      {/* Time row */}
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="log-in-outline" size={13} color="#1d4ed8" />
          <Text style={styles.metaLabel}>Entry</Text>
          <Text style={styles.metaValue}>{log.entryTime}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Ionicons name="log-out-outline" size={13} color={log.exitTime ? '#16a34a' : '#94a3b8'} />
          <Text style={styles.metaLabel}>Exit</Text>
          <Text style={[styles.metaValue, { color: log.exitTime ? '#16a34a' : '#94a3b8' }]}>
            {log.exitTime || '—'}
          </Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color="#64748b" />
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaValue}>{date}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.cardActions}>
        {log.exitTime ? (
          <View style={styles.exitedTag}>
            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
            <Text style={styles.exitedTagText}>Exited at {log.exitTime}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.exitActionBtn} onPress={handleExit}>
            <Ionicons name="log-out-outline" size={15} color="#fff" />
            <Text style={styles.exitActionBtnText}>Mark Exit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteActionBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={15} color="#dc2626" />
          <Text style={styles.deleteActionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function EntryLogScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Form
  const [form, setForm] = useState({ name: '', idNumber: '', type: 'visitor', venue: '', propertyId: '' });
  const [entryTime, setEntryTime] = useState('');
  const [entryDate, setEntryDate] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterDate) params.date = filterDate;
      const res = await api.get('/entry-logs', { params });
      setLogs(res.data || []);
    } catch (e) {
      console.log('Entry log fetch error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterType, filterDate]);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get('/entry-logs/properties');
      setProperties(res.data || []);
    } catch (e) {
      console.log('Properties fetch error:', e.message);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openModal = () => {
    const { time, date } = getNow();
    setEntryTime(time);
    setEntryDate(date);
    setForm({ name: '', idNumber: '', type: 'visitor', venue: '', propertyId: '' });
    setShowModal(true);
  };

  // ── Save entry ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.idNumber.trim() || !form.venue || !form.propertyId) {
      const msg = 'Please fill all fields including venue and property.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Missing Fields', msg);
      return;
    }
    setSaving(true);
    try {
      await api.post('/entry-logs', {
        ...form,
        entryTime,
        entryDate: new Date(entryDate),
      });
      setShowModal(false);
      fetchLogs();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save entry.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await api.delete(`/entry-logs/${id}`);
      setLogs(prev => prev.filter(l => l._id !== id));
    } catch (e) {
      console.log('Delete error:', e.message);
    }
  };

  const handleExit = async (id) => {
    try {
      const res = await api.patch(`/entry-logs/${id}/exit`);
      setLogs(prev => prev.map(l => l._id === id ? res.data : l));
    } catch (e) {
      console.log('Exit error:', e.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Entry Log</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openModal}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterBox}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or ID..."
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

          <View style={styles.filterRow}>
            {/* Type filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilters}>
              <TouchableOpacity
                style={[styles.filterChip, !filterType && styles.filterChipActive]}
                onPress={() => setFilterType('')}
              >
                <Text style={[styles.filterChipText, !filterType && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              {TYPE_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, filterType === t && styles.filterChipActive]}
                  onPress={() => setFilterType(filterType === t ? '' : t)}
                >
                  <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date filter */}
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              value={filterDate}
              onChangeText={setFilterDate}
            />
          </View>
        </View>

        {/* Records */}
        {loading ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No entries found</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>{logs.length} record{logs.length !== 1 ? 's' : ''}</Text>
            {logs.map(log => (
              <EntryCard key={log._id} log={log} onDelete={handleDelete} onExit={handleExit} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Entry</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Auto time/date */}
              <View style={styles.autoRow}>
                <View style={styles.autoField}>
                  <Ionicons name="time-outline" size={14} color="#1d4ed8" />
                  <Text style={styles.autoLabel}>Entry Time</Text>
                  <Text style={styles.autoValue}>{entryTime}</Text>
                </View>
                <View style={styles.autoField}>
                  <Ionicons name="calendar-outline" size={14} color="#1d4ed8" />
                  <Text style={styles.autoLabel}>Entry Date</Text>
                  <Text style={styles.autoValue}>{entryDate}</Text>
                </View>
              </View>

              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* ID Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>ID Number *</Text>
                <TextInput
                  style={styles.input}
                  value={form.idNumber}
                  onChangeText={v => setForm(f => ({ ...f, idNumber: v }))}
                  placeholder="National ID / Passport / Staff ID"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type *</Text>
                <View style={styles.typeRow}>
                  {TYPE_OPTIONS.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                      onPress={() => setForm(f => ({ ...f, type: t }))}
                    >
                      <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Property */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Property *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {properties.length === 0 ? (
                    <Text style={styles.noData}>No properties found</Text>
                  ) : properties.map(p => (
                    <TouchableOpacity
                      key={p._id}
                      style={[styles.venueChip, form.propertyId === p._id && styles.venueChipActive]}
                      onPress={() => setForm(f => ({ ...f, propertyId: p._id, venue: p.name }))}
                    >
                      <Text style={[styles.venueChipText, form.propertyId === p._id && styles.venueChipTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Entry</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 10, marginBottom: 10 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeFilters: { flex: 1 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 6 },
  filterChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  dateInput: { width: 110, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#1e293b' },

  // Card styles
  countText: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#dbeafe',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardAvatarText: { fontSize: 17, fontWeight: '800', color: '#1d4ed8' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardId: { fontSize: 12, color: '#64748b', marginTop: 2 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  metaItem: { flex: 1, alignItems: 'center', gap: 3 },
  metaLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  metaDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },
  cardActions: { flexDirection: 'row', gap: 10 },
  exitActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#0891b2', borderRadius: 10, paddingVertical: 10,
  },
  exitActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  exitedTag: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#dcfce7', borderRadius: 10, paddingVertical: 10,
  },
  exitedTagText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  deleteActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
  },
  deleteActionBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#94a3b8' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },

  autoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  autoField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, padding: 12 },
  autoLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  autoValue: { fontSize: 13, fontWeight: '800', color: '#1d4ed8', marginLeft: 'auto' },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  typeChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  typeChipTextActive: { color: '#fff' },

  venueChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  venueChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  venueChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  venueChipTextActive: { color: '#fff' },
  noData: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },

  saveBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
