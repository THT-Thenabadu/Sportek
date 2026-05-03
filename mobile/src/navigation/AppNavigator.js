import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../store/useAuthStore';
import AuthStack from './AuthStack';
import CustomerTabs from './CustomerTabs';
import OwnerStack from './OwnerStack';
import SecurityStack from './SecurityStack';

export default function AppNavigator() {
  const { isAuthenticated, isCheckingAuth, user } = useAuth();

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  const getMainNavigator = () => {
    if (!user) return <AuthStack />;
    switch (user.role) {
      case 'propertyOwner':
        return <OwnerStack />;
      case 'securityOfficer':
        return <SecurityStack />;
      default:
        return <CustomerTabs />;
    }
  };

  return (
    <NavigationContainer>
      {isAuthenticated ? getMainNavigator() : <AuthStack />}
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
