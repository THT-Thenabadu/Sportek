import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../store/useAuthStore';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SecurityCredentialsScreen({ navigation }) {
  const { user } = useAuth();
  const [securityOfficer, setSecurityOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchSecurityOfficer();
  }, []);

  const fetchSecurityOfficer = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/my-security-officer');
      setSecurityOfficer(res.data);
      setFormData({
        email: res.data.email,
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load security officer credentials');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSecurityOfficer();
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    // Password validation (only if password is being changed)
    if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      } else if (!/^[a-zA-Z0-9]+$/.test(formData.password)) {
        errors.password = 'Password must contain only letters and numbers';
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        email: formData.email
      };

      // Only include password if it's being changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.put('/users/update-security-officer', updateData);
      
      Alert.alert('Success', 'Security officer credentials updated successfully!');
      setShowEditForm(false);
      
      // Refresh the data
      await fetchSecurityOfficer();
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading security credentials..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={32} color="#1d4ed8" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Security Credentials</Text>
            <Text style={styles.headerSubtitle}>Manage your security officer login</Text>
          </View>
        </View>

        {securityOfficer ? (
          <View style={styles.container}>
            {/* Current Credentials Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Current Security Officer</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setShowEditForm(!showEditForm)}
                >
                  <Ionicons 
                    name={showEditForm ? "close" : "create-outline"} 
                    size={20} 
                    color="#1d4ed8" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.credentialItem}>
                <View style={styles.credentialLabel}>
                  <Ionicons name="mail-outline" size={18} color="#64748b" />
                  <Text style={styles.labelText}>Email Address</Text>
                </View>
                <Text style={styles.credentialValue}>{securityOfficer.email}</Text>
              </View>

              <View style={styles.credentialItem}>
                <View style={styles.credentialLabel}>
                  <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                  <Text style={styles.labelText}>Password</Text>
                </View>
                <View style={styles.passwordContainer}>
                  <Text style={styles.passwordValue}>••••••••</Text>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={18} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Edit Form */}
            {showEditForm && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Update Credentials</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={[styles.input, formErrors.email && styles.inputError]}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    placeholder="security@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {formErrors.email && (
                    <Text style={styles.errorText}>{formErrors.email}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password (leave blank to keep current)</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={[styles.passwordInput, formErrors.password && styles.inputError]}
                      value={formData.password}
                      onChangeText={(value) => handleInputChange('password', value)}
                      placeholder="Enter new password"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Ionicons 
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#64748b" 
                      />
                    </TouchableOpacity>
                  </View>
                  {formErrors.password && (
                    <Text style={styles.errorText}>{formErrors.password}</Text>
                  )}
                  <Text style={styles.helperText}>Must be at least 6 characters with letters and numbers only</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <TextInput
                    style={[styles.input, formErrors.confirmPassword && styles.inputError]}
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    placeholder="Confirm new password"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  {formErrors.confirmPassword && (
                    <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>
                  )}
                </View>

                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={16} color="#d97706" />
                  <Text style={styles.warningText}>
                    The new password must be different from your property owner login password.
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowEditForm(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Security Officer Found</Text>
            <Text style={styles.emptySubtitle}>No security officer found for your account.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  container: { padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  credentialItem: {
    marginBottom: 16,
  },
  credentialLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  credentialValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    paddingLeft: 26,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 26,
  },
  passwordValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 0,
  },
  eyeButton: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});