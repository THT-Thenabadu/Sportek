import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../store/useAuthStore';
import AuthStack from './AuthStack';
import CustomerTabs from './CustomerTabs';
import OwnerStack from './OwnerStack';
import SecurityStack from './SecurityStack';
import AdminDrawer from './AdminDrawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FacilityDetailScreen from '../screens/customer/FacilityDetailScreen';
import BookingFlowScreen from '../screens/customer/BookingFlowScreen';

const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isCheckingAuth, user } = useAuth();

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  const RoleNavigator = () => {
    switch (user.role) {
      case 'propertyOwner':
        return <OwnerStack />;
      case 'securityOfficer':
        return <SecurityStack />;
      case 'admin':
      case 'superAdmin':
        return <AdminDrawer />;
      default:
        return <CustomerTabs />;
    }
  };

  const RootAuthNavigator = () => (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="RoleMain" component={RoleNavigator} />
      <RootStack.Screen 
        name="FacilityDetail" 
        component={FacilityDetailScreen} 
        options={{ headerShown: true, title: 'Facility Details', headerStyle: { backgroundColor: '#1d4ed8' }, headerTintColor: '#ffffff', headerTitleStyle: { fontWeight: '700' } }} 
      />
      <RootStack.Screen 
        name="BookingFlow" 
        component={BookingFlowScreen} 
        options={{ headerShown: true, title: 'Book Facility', headerStyle: { backgroundColor: '#1d4ed8' }, headerTintColor: '#ffffff', headerTitleStyle: { fontWeight: '700' } }} 
      />
    </RootStack.Navigator>
  );

  return (
    <NavigationContainer>
      {isAuthenticated ? <RootAuthNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
