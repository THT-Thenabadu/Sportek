import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../store/useAuthStore';

const ROLE_LABELS = {
  customer: 'Customer',
  propertyOwner: 'Property Owner',
  securityOfficer: 'Security Officer',
  admin: 'Administrator',
  superAdmin: 'Super Admin',
};

const INFO_ROW_BG = ['#f0f9ff', '#f0fdf4', '#fefce8', '#fdf4ff'];

function InfoRow({ icon, label, value, bgIndex = 0 }) {
  return (
    <View style={[styles.infoRow, { backgroundColor: INFO_ROW_BG[bgIndex % INFO_ROW_BG.length] }]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#1d4ed8" />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const goToDashboard = () => {
    if (user?.role === 'customer') navigation.navigate('Home');
    else if (user?.role === 'propertyOwner') navigation.navigate('OwnerHome');
    else if (user?.role === 'securityOfficer') navigation.navigate('ScanQR');
    else if (user?.role === 'admin') navigation.navigate('AdminHome');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (!user) return null;

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#1d4ed8" />
            <Text style={styles.roleText}>{ROLE_LABELS[user.role] || user.role}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <InfoRow icon="person-outline" label="Full Name" value={user.name} bgIndex={0} />
          <InfoRow icon="mail-outline" label="Email" value={user.email} bgIndex={1} />
          <InfoRow icon="shield-outline" label="Role" value={ROLE_LABELS[user.role] || user.role} bgIndex={2} />
          {user.institution && (
            <InfoRow icon="school-outline" label="Institution" value={user.institution} bgIndex={3} />
          )}
        </View>

        {/* Go to Dashboard */}
        <TouchableOpacity style={styles.dashboardBtn} onPress={goToDashboard} activeOpacity={0.85}>
          <Ionicons name="grid-outline" size={20} color="#ffffff" />
          <Text style={styles.dashboardText}>Go to Dashboard</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Sportek v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(29,78,216,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#cbd5e1',
  },
  dashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
  },
  dashboardText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
