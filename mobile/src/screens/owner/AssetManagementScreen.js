import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const HEALTH_OPTIONS = ['good', 'fair', 'poor'];
const HEALTH_COLORS = { good: '#16a34a', fair: '#d97706', poor: '#dc2626' };
const HEALTH_BG = { good: '#dcfce7', fair: '#fef3c7', poor: '#fee2e2' };

export default function AssetManagementScreen({ route }) {
  const initialProperty = route?.params?.property || null;
  const [property, setProperty] = useState(initialProperty);

  const [myProperties, setMyProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(!initialProperty);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(!!initialProperty);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', assetType: 'equipment', quantity: '1', healthStatus: 'good', notes: '', description: '',
  });

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get('/properties/my-properties');
      setMyProperties(res.data || []);
    } catch (e) {
      console.log('Error fetching properties:', e.message);
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  useEffect(() => {
    if (!property) {
      fetchProperties();
    }
  }, [property, fetchProperties]);

  const fetchAssets = useCallback(async () => {
    if (!property?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`/assets/property/${property._id}`);
      setAssets(res.data || []);
    } catch (e) {
      console.log('Error fetching assets:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [property?._id]);

  useEffect(() => {
    if (property?._id) {
      fetchAssets();
    }
  }, [property?._id, fetchAssets]);
  const onRefresh = () => { setRefreshing(true); fetchAssets(); };

  const handleAddAsset = async () => {
    if (!form.name || !form.category) {
      Alert.alert('Missing Fields', 'Asset name and category are required.');
      return;
    }
    setAddLoading(true);
    try {
      await api.post('/assets', {
        ...form,
        property: property._id,
        quantity: parseInt(form.quantity, 10) || 1,
        availableQuantity: parseInt(form.quantity, 10) || 1,
      });
      setShowAddModal(false);
      setForm({ name: '', category: '', assetType: 'equipment', quantity: '1', healthStatus: 'good', notes: '', description: '' });
      fetchAssets();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add asset.');
    } finally {
      setAddLoading(false);
    }
  };

  if (!property) {
    if (loadingProperties) return <LoadingSpinner message="Loading properties..." />;
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.listHeader}>
          <Text style={styles.headerTitle}>Select a Property</Text>
        </View>
        <FlatList
          data={myProperties}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.propertyCard} onPress={() => setProperty(item)}>
              <Ionicons name="business" size={24} color="#1d4ed8" />
              <Text style={styles.propertyName}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No properties found</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  if (loading) return <LoadingSpinner message="Loading assets..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={assets}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const hColor = HEALTH_COLORS[item.healthStatus] || '#64748b';
          const hBg = HEALTH_BG[item.healthStatus] || '#f1f5f9';
          return (
            <View style={styles.assetCard}>
              <View style={styles.assetHeader}>
                <Text style={styles.assetName}>{item.name}</Text>
                <View style={[styles.healthBadge, { backgroundColor: hBg }]}>
                  <Text style={[styles.healthText, { color: hColor }]}>{item.healthStatus}</Text>
                </View>
              </View>
              <Text style={styles.assetCategory}>{item.category} · {item.assetType}</Text>
              <View style={styles.assetMeta}>
                <Text style={styles.assetStock}>
                  {item.availableQuantity}/{item.quantity} available
                </Text>
                {item.notes ? <Text style={styles.assetNotes}>{item.notes}</Text> : null}
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.headerTitle}>Assets</Text>
              <Text style={styles.headerSub}>{property.name}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.addBtnText}>Add Asset</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="construct-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No assets yet</Text>
          </View>
        }
      />

      {/* Add Asset Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Add Asset</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                ['Asset Name *', 'name', 'e.g. Football'],
                ['Category *', 'category', 'e.g. Sports Equipment'],
                ['Quantity', 'quantity', '1'],
              ].map(([lbl, key, ph]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{lbl}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={ph}
                    placeholderTextColor="#cbd5e1"
                    value={form[key]}
                    onChangeText={(v) => setField(key, v)}
                    keyboardType={key === 'quantity' ? 'numeric' : 'default'}
                  />
                </View>
              ))}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Health Status</Text>
                <View style={styles.healthRow}>
                  {HEALTH_OPTIONS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.healthChip, form.healthStatus === h && { backgroundColor: HEALTH_COLORS[h] }]}
                      onPress={() => setField('healthStatus', h)}
                    >
                      <Text style={[styles.healthChipText, form.healthStatus === h && { color: '#fff' }]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Optional notes..."
                  placeholderTextColor="#cbd5e1"
                  value={form.notes}
                  onChangeText={(v) => setField('notes', v)}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, addLoading && { opacity: 0.7 }]}
                onPress={handleAddAsset}
                disabled={addLoading}
              >
                {addLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Asset</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16, marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  addBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  assetCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  assetName: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  healthBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  healthText: { fontSize: 11, fontWeight: '700' },
  assetCategory: { fontSize: 12, color: '#94a3b8', marginBottom: 6 },
  assetMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  assetStock: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  assetNotes: { fontSize: 12, color: '#94a3b8', flex: 1, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  fieldInput: {
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: '#1e293b',
  },
  healthRow: { flexDirection: 'row', gap: 8 },
  healthChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: 10, backgroundColor: '#f1f5f9',
  },
  healthChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  saveBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  propertyCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16,
    marginBottom: 10, shadowColor: '#000', flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  propertyName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
});
