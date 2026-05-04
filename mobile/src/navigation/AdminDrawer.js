import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../store/useAuthStore';

import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminApplicationsScreen from '../screens/admin/AdminApplicationsScreen';
import AdminEventsScreen from '../screens/admin/AdminEventsScreen';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    const performLogout = async () => {
      await logout();
      // AppNavigator handles state change
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        performLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout
        }
      ]);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Drawer Header Profile */}
        <View style={styles.drawerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Admin User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'admin@sportek.com'}</Text>
        </View>

        {/* Drawer Items */}
        <View style={styles.drawerItems}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
        drawerActiveBackgroundColor: '#eff6ff',
        drawerActiveTintColor: '#1d4ed8',
        drawerInactiveTintColor: '#475569',
        drawerLabelStyle: { fontSize: 15, marginLeft: -16 },
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginLeft: 16 }}>
            <Ionicons name="menu-outline" size={28} color="#ffffff" />
          </TouchableOpacity>
        )
      })}
    >
      <Drawer.Screen
        name="Dashboard"
        component={AdminHomeScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen
        name="User Management"
        component={AdminUsersScreen}
        options={{
          title: 'User Management',
          drawerIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen
        name="Owner Applications"
        component={AdminApplicationsScreen}
        options={{
          title: 'Owner Applications',
          drawerIcon: ({ color }) => <Ionicons name="clipboard-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen
        name="Events Management"
        component={AdminEventsScreen}
        options={{
          title: 'Events Management',
          drawerIcon: ({ color }) => <Ionicons name="ticket-outline" size={22} color={color} />
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    backgroundColor: '#1d4ed8',
    padding: 20,
    paddingTop: 60,
    marginBottom: 8,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#1d4ed8' },
  userName: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  userEmail: { color: '#bfdbfe', fontSize: 14, marginTop: 2 },
  drawerItems: { paddingHorizontal: 8 },
  logoutContainer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
});
