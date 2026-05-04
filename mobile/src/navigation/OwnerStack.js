import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../store/useAuthStore';

import OwnerHomeScreen from '../screens/owner/OwnerHomeScreen';
import MyPropertiesScreen from '../screens/owner/MyPropertiesScreen';
import AddPropertyScreen from '../screens/owner/AddPropertyScreen';
import EditPropertyScreen from '../screens/owner/EditPropertyScreen';
import AssetManagementScreen from '../screens/owner/AssetManagementScreen';
import OwnerRescheduleRequestsScreen from '../screens/owner/OwnerRescheduleRequestsScreen';
import FacilityDetailScreen from '../screens/customer/FacilityDetailScreen';
import BookingFlowScreen from '../screens/customer/BookingFlowScreen';

const Drawer = createDrawerNavigator();

const HEADER_STYLE = {
  headerStyle: { backgroundColor: '#1d4ed8' },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontWeight: '700' },
  drawerActiveBackgroundColor: '#1d4ed8',
  drawerActiveTintColor: '#ffffff',
  drawerInactiveTintColor: '#333333',
  drawerStyle: { backgroundColor: '#ffffff' },
};

function CustomDrawerContent(props) {
  const { user, logout } = useAuth();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ backgroundColor: '#1d4ed8', paddingTop: 0 }}>
        <View style={styles.userInfoSection}>
          <Text style={styles.userName}>{user?.name || 'Owner'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'owner@example.com'}</Text>
        </View>
        <View style={{ backgroundColor: '#ffffff', paddingTop: 10, flex: 1 }}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OwnerStack() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={HEADER_STYLE}
      initialRouteName="OwnerHome"
    >
      <Drawer.Screen
        name="OwnerHome"
        component={OwnerHomeScreen}
        options={{ title: 'Dashboard', drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="MyProperties"
        component={MyPropertiesScreen}
        options={{ title: 'My Properties', drawerIcon: ({ color }) => <Ionicons name="business-outline" size={22} color={color} /> }}
      />
      <Drawer.Screen
          name="RescheduleRequests"
          component={OwnerRescheduleRequestsScreen}
          options={{ title: 'Reschedule Requests', drawerIcon: ({ color }) => <Ionicons name="time-outline" size={22} color={color} /> }}
     />
      <Drawer.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{ title: 'Add Property', drawerIcon: ({ color }) => <Ionicons name="add-circle-outline" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="AssetManagement"
        component={AssetManagementScreen}
        options={{ title: 'Asset Management', drawerIcon: ({ color }) => <Ionicons name="construct-outline" size={22} color={color} /> }}
      />
      {/* Unlisted Screens */}
      <Drawer.Screen
        name="EditProperty"
        component={EditPropertyScreen}
        options={{ title: 'Edit Property', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="FacilityDetail"
        component={FacilityDetailScreen}
        options={{ title: 'Facility Details', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="BookingFlow"
        component={BookingFlowScreen}
        options={{ title: 'Booking', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  userInfoSection: {
    paddingLeft: 20,
    paddingVertical: 40,
    paddingTop: 60,
  },
  userName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  logoutSection: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
});
