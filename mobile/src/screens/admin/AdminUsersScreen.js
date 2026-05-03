import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const ROLES = ['All', 'customer', 'propertyOwner', 'securityOfficer', 'admin'];

const ROLE_COLORS = {
  customer: { bg: '#dbeafe', text: '#1d4ed8' },
  propertyOwner: { bg: '#dcfce7', text: '#059669' },
  securityOfficer: { bg: '#fef3c7', text: '#d97706' },
  admin: { bg: '#fee2e2', text: '#dc2626' },
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');

  // Modal State for Warning
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnUserId, setWarnUserId] = useState(null);
  const [warnReason, setWarnReason] = useState('');
  const [warningLoading, setWarningLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.log('Error fetching users:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const handleBanToggle = async (user) => {
    try {
      await api.patch(`/users/${user._id}/ban`, { isBanned: !user.isBanned });
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isBanned: !user.isBanned } : u));
    } catch (err) {
      Alert.alert('Error', 'Could not update user status.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete User', 'Are you sure you want to permanently delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/users/${id}`);
            setUsers(prev => prev.filter(u => u._id !== id));
          } catch (err) {
            Alert.alert('Error', 'Could not delete user.');
          }
        }
      }
    ]);
  };

  const handleSendWarning = async () => {
    if (!warnReason.trim()) {
      Alert.alert('Error', 'Warning reason cannot be empty.');
      return;
    }
    setWarningLoading(true);
    try {
      await api.post(`/users/${warnUserId}/warn`, { reason: warnReason });
      Alert.alert('Success', 'Warning sent to user.');
      setShowWarnModal(false);
      setWarnReason('');
    } catch (err) {
      Alert.alert('Error', 'Could not send warning.');
    } finally {
      setWarningLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'All' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (loading) return <LoadingSpinner message="Loading users..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search and Filter */}
      <View style={styles.headerControls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or email..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll} contentContainerStyle={{ gap: 8 }}>
          {ROLES.map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
              onPress={() => setSelectedRole(role)}
            >
              <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
                {role === 'propertyOwner' ? 'Owner' : role === 'securityOfficer' ? 'Security' : role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No users found.</Text>
          </View>
        ) : (
          filteredUsers.map(user => {
            const roleStyle = ROLE_COLORS[user.role] || { bg: '#f1f5f9', text: '#64748b' };
            return (
              <View key={user._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: roleStyle.bg }]}>
                    <Text style={[styles.badgeText, { color: roleStyle.text }]}>{user.role}</Text>
                  </View>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, user.isBanned ? styles.statusBanned : styles.statusActive]}>
                    <Ionicons name={user.isBanned ? "close-circle" : "checkmark-circle"} size={14} color={user.isBanned ? '#dc2626' : '#059669'} />
                    <Text style={[styles.statusText, { color: user.isBanned ? '#dc2626' : '#059669' }]}>
                      {user.isBanned ? 'Banned' : 'Active'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionWarn]}
                    onPress={() => { setWarnUserId(user._id); setShowWarnModal(true); }}
                  >
                    <Ionicons name="warning-outline" size={16} color="#d97706" />
                    <Text style={styles.actionWarnText}>Warn</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, user.isBanned ? styles.actionUnban : styles.actionBan]}
                    onPress={() => handleBanToggle(user)}
                  >
                    <Ionicons name="shield-outline" size={16} color={user.isBanned ? '#1d4ed8' : '#dc2626'} />
                    <Text style={user.isBanned ? styles.actionUnbanText : styles.actionBanText}>
                      {user.isBanned ? 'Unban' : 'Ban'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionDelete]}
                    onPress={() => handleDelete(user._id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Warn Modal */}
      <Modal visible={showWarnModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Warning</Text>
            <Text style={styles.modalSub}>Provide a reason for warning this user.</Text>
            <TextInput
              style={styles.warnInput}
              placeholder="e.g., Violation of terms..."
              placeholderTextColor="#94a3b8"
              value={warnReason}
              onChangeText={setWarnReason}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setShowWarnModal(false); setWarnReason(''); }}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSend} onPress={handleSendWarning} disabled={warningLoading}>
                {warningLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnSendText}>Send Warning</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  headerControls: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 10, paddingHorizontal: 12, marginBottom: 12
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#1e293b', marginLeft: 8 },
  roleScroll: { flexDirection: 'row' },
  roleChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  roleChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  roleChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  roleChipTextActive: { color: '#ffffff' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#64748b' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  statusRow: { marginTop: 12, marginBottom: 16 },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusActive: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statusBanned: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  actionWarn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  actionWarnText: { color: '#d97706', fontWeight: '600', fontSize: 13 },
  actionBan: { backgroundColor: '#fef2f2', borderColor: '#fecaca', flex: 1, justifyContent: 'center' },
  actionBanText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  actionUnban: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', flex: 1, justifyContent: 'center' },
  actionUnbanText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
  actionDelete: { backgroundColor: '#fef2f2', borderColor: '#fecaca', paddingHorizontal: 12 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  warnInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, height: 100, textAlignVertical: 'top', fontSize: 15, color: '#1e293b', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalBtnCancelText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  modalBtnSend: { backgroundColor: '#d97706', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalBtnSendText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
