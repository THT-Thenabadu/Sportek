import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LandingScreen from '../screens/public/LandingScreen';
import PublicFacilityDetailScreen from '../screens/public/PublicFacilityDetailScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f8fafc' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="PublicFacilityDetail"
        component={PublicFacilityDetailScreen}
        options={{
          headerShown: true,
          title: 'Facility Details',
          headerStyle: { backgroundColor: '#1d4ed8' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
    </Stack.Navigator>
  );
}
