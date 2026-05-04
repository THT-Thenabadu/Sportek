import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_FILTERS = ['All', 'pending', 'approved', 'declined'];

export default function AdminApplicationsScreen() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchApps = useCallback(async () => {
    try {
      const res = await api.get('/applications');
      setApps(res.data || []);
    } catch (err) {
      console.log('Error fetching applications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);
  const onRefresh = () => { setRefreshing(true); fetchApps(); };

  const handleDecision = async (id, action) => {
    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Reject'} Application`,
      `Are you sure you want to ${action === 'approve' ? 'approve' : 'reject'} this owner application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            setActionLoading(id);
            try {
              const res = await api.patch(`/applications/${id}/${action}`);
              const updatedStatus = res.data.application?.status || (action === 'approve' ? 'approved' : 'declined');
              setApps(prev => prev.map(a => a._id === id ? { ...a, status: updatedStatus } : a));
              Alert.alert('Success', `Application has been ${updatedStatus}.`);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not update application.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const filteredApps = selectedStatus === 'All'
    ? apps
    : apps.filter(a => a.status === selectedStatus);

  if (loading) return <LoadingSpinner message="Loading applications..." />;

  const getStatusStyle = (status) => {
    if (status === 'approved') return { bg: '#dcfce7', text: '#059669', icon: 'checkmark-circle' };
    if (status === 'declined') return { bg: '#fee2e2', text: '#dc2626', icon: 'close-circle' };
    return { bg: '#fef3c7', text: '#d97706', icon: 'time' };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerControls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {STATUS_FILTERS.map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, selectedStatus === status && styles.filterChipActive]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[styles.filterChipText, selectedStatus === status && styles.filterChipTextActive]}>
                {status === 'declined' ? 'Rejected' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {filteredApps.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No applications found.</Text>
          </View>
        ) : (
          filteredApps.map(app => {
            const st = getStatusStyle(app.status);
            return (
              <View key={app._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.businessName}>{app.businessName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon} size={14} color={st.text} />
                    <Text style={[styles.statusText, { color: st.text }]}>
                      {app.status === 'declined' ? 'Rejected' : app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.applicantText}>
                  <Text style={{ fontWeight: '700' }}>{app.applicantId?.name || 'Unknown'}</Text> • {app.applicantId?.email || 'N/A'}
                </Text>
                
                <View style={styles.detailsBox}>
                  <Text style={styles.descText}>{app.propertyDescription}</Text>
                  <View style={styles.metaRow}><Text style={styles.metaLabel}>Address:</Text><Text style={styles.metaVal}>{app.address}</Text></View>
                  <View style={styles.metaRow}><Text style={styles.metaLabel}>NIC/Passport:</Text><Text style={styles.metaVal}>{app.nicOrPassport}</Text></View>
                  <View style={styles.metaRow}><Text style={styles.metaLabel}>Applied:</Text><Text style={styles.metaVal}>{new Date(app.createdAt).toLocaleDateString()}</Text></View>
                </View>

                {app.status === 'pending' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionApprove]}
                      onPress={() => handleDecision(app._id, 'approve')}
                      disabled={actionLoading === app._id}
                    >
                      {actionLoading === app._id ? <ActivityIndicator color="#059669" size="small" /> : (
                        <>
                          <Ionicons name="checkmark" size={18} color="#059669" />
                          <Text style={styles.actionApproveText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionReject]}
                      onPress={() => handleDecision(app._id, 'decline')}
                      disabled={actionLoading === app._id}
                    >
                      {actionLoading === app._id ? <ActivityIndicator color="#dc2626" size="small" /> : (
                        <>
                          <Ionicons name="close" size={18} color="#dc2626" />
                          <Text style={styles.actionRejectText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  headerControls: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filterChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#ffffff' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  businessName: { fontSize: 18, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  applicantText: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  detailsBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  descText: { fontSize: 14, color: '#475569', marginBottom: 10, lineHeight: 20 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', width: 90 },
  metaVal: { fontSize: 13, color: '#1e293b', flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  actionApprove: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  actionApproveText: { color: '#059669', fontWeight: '700', fontSize: 15 },
  actionReject: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  actionRejectText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});
