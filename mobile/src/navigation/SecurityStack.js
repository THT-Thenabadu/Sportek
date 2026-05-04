import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SecurityHomeScreen from '../screens/security/SecurityHomeScreen';
import ScanQRScreen from '../screens/security/ScanQRScreen';
import UpcomingBookingsScreen from '../screens/security/UpcomingBookingsScreen';
import CurrentBookingsScreen from '../screens/security/CurrentBookingsScreen';
import EntryLogScreen from '../screens/security/EntryLogScreen';
import BookingDetailsScreen from '../screens/security/BookingDetailsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Stack = createNativeStackNavigator();

const HEADER_STYLE = {
  headerStyle: { backgroundColor: '#1d4ed8' },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontWeight: '700' },
};

export default function SecurityStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE} initialRouteName="SecurityHome">
      <Stack.Screen
        name="SecurityHome"
        component={SecurityHomeScreen}
        options={{ title: 'Security Dashboard' }}
      />
      <Stack.Screen
        name="ScanQR"
        component={ScanQRScreen}
        options={{ title: 'Scan QR Code' }}
      />
      <Stack.Screen
        name="UpcomingBookings"
        component={UpcomingBookingsScreen}
        options={{ title: 'Upcoming Bookings' }}
      />
      <Stack.Screen
        name="CurrentBookings"
        component={CurrentBookingsScreen}
        options={{ title: 'Current Bookings' }}
      />
      <Stack.Screen
        name="EntryLog"
        component={EntryLogScreen}
        options={{ title: 'Entry Log' }}
      />
      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{ title: 'Booking Details' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
    </Stack.Navigator>
  );
}
