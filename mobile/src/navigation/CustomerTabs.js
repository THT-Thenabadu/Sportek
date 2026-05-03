import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import HomeScreen from '../screens/customer/HomeScreen';
import VenuesScreen from '../screens/customer/VenuesScreen';
import FacilityDetailScreen from '../screens/customer/FacilityDetailScreen';
import BookingFlowScreen from '../screens/customer/BookingFlowScreen';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import EventsScreen from '../screens/customer/EventsScreen';
import EventDetailScreen from '../screens/customer/EventDetailScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const BLUE = '#1d4ed8';
const HEADER_STYLE = {
  headerStyle: { backgroundColor: BLUE },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontWeight: '700' },
};

// Nested stack for Home tab (allows navigating to FacilityDetail / BookingFlow)
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Sportek' }} />
      <Stack.Screen name="FacilityDetail" component={FacilityDetailScreen} options={{ title: 'Facility Details' }} />
      <Stack.Screen name="BookingFlow" component={BookingFlowScreen} options={{ title: 'Book Facility' }} />
    </Stack.Navigator>
  );
}

// Nested stack for Venues tab
function VenuesStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      <Stack.Screen name="VenuesMain" component={VenuesScreen} options={{ title: 'Venues' }} />
      <Stack.Screen name="FacilityDetail" component={FacilityDetailScreen} options={{ title: 'Facility Details' }} />
      <Stack.Screen name="BookingFlow" component={BookingFlowScreen} options={{ title: 'Book Facility' }} />
    </Stack.Navigator>
  );
}

// Nested stack for Events tab
function EventsStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      <Stack.Screen name="EventsMain" component={EventsScreen} options={{ title: 'Events' }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Details' }} />
    </Stack.Navigator>
  );
}

export default function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Venues: 'business',
            Bookings: 'calendar',
            Events: 'ticket',
            Profile: 'person-circle',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Venues" component={VenuesStack} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} options={{ headerShown: true, ...HEADER_STYLE, title: 'My Bookings' }} />
      <Tab.Screen name="Events" component={EventsStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, ...HEADER_STYLE, title: 'Profile' }} />
    </Tab.Navigator>
  );
}
