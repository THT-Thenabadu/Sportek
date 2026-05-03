import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MyPropertiesScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get('/properties/my-properties');
      setProperties(res.data || []);
    } catch (e) {
      console.log('Error fetching properties:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const onRefresh = () => { setRefreshing(true); fetchProperties(); };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/properties/${id}`);
              setProperties((prev) => prev.filter((p) => p._id !== id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete property.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner message="Loading properties..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={properties}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.images?.[0] ? (
              <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Ionicons name="business" size={32} color="#1d4ed8" />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.cardMeta}>
                <Ionicons name="trophy-outline" size={13} color="#64748b" />
                <Text style={styles.cardMetaText}>{item.sportType}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Ionicons name="location-outline" size={13} color="#64748b" />
                <Text style={styles.cardMetaText}>{typeof item.location === 'object' ? item.location?.address : item.location}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>LKR {item.pricePerHour}/hr</Text>
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => navigation.navigate('EditProperty', { property: item })}
                  >
                    <Ionicons name="pencil" size={14} color="#1d4ed8" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item._id)}
                  >
                    <Ionicons name="trash" size={14} color="#dc2626" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.assetBtn}
                    onPress={() => navigation.navigate('AssetManagement', { property: item })}
                  >
                    <Ionicons name="construct-outline" size={14} color="#1d4ed8" />
                    <Text style={styles.assetBtnText}>Assets</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerTitle}>My Properties ({properties.length})</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddProperty')}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No properties yet</Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={() => navigation.navigate('AddProperty')}
            >
              <Text style={styles.addFirstBtnText}>Add your first property</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: { width: '100%', height: 130 },
  cardImagePlaceholder: {
    width: '100%', height: 130,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { padding: 14 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  cardMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3,
  },
  cardMetaText: { fontSize: 13, color: '#64748b' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  actionBtns: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtn: { backgroundColor: '#eff6ff' },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  deleteBtn: { backgroundColor: '#fef2f2' },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  assetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assetBtnText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#64748b' },
  addFirstBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addFirstBtnText: { color: '#ffffff', fontWeight: '700' },
});
