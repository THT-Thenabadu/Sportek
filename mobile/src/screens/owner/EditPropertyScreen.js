import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/axios';

const SPORT_TYPES = ['Football', 'Basketball', 'Tennis', 'Cricket', 'Swimming', 'Badminton', 'Gym', 'Volleyball', 'Other'];

const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      placeholder={placeholder}
      placeholderTextColor="#cbd5e1"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

export default function EditPropertyScreen({ route, navigation }) {
  const { property } = route.params;

  const [form, setForm] = useState({
    name: property.name || '',
    sportType: property.sportType || '',
    locationAddress: typeof property.location === 'object' ? property.location?.address : property.location || '',
    description: property.description || '',
    pricePerHour: property.pricePerHour ? property.pricePerHour.toString() : '',
    institution: property.institution || '',
    availableHoursStart: property.availableHours?.start || '08:00',
    availableHoursEnd: property.availableHours?.end || '22:00',
  });
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(property.images?.[0] || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.sportType || !form.locationAddress || !form.pricePerHour) {
      Alert.alert('Missing Fields', 'Name, sport type, location, and price are required.');
      return;
    }
    setLoading(true);

    let uploadedImageUrl = null;
    if (imageUri) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'upload.jpg',
        });
        formData.append('upload_preset', 'SportekEvent');

        const response = await fetch('https://api.cloudinary.com/v1_1/dcqcebwg8/image/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
          uploadedImageUrl = data.secure_url;
        } else {
          throw new Error('No secure_url in response');
        }
      } catch (err) {
        Alert.alert('Upload Error', 'Failed to upload image to Cloudinary.');
        setUploadingImage(false);
        setLoading(false);
        return;
      }
      setUploadingImage(false);
    }

    try {
      const payload = {
        name: form.name,
        sportType: form.sportType,
        description: form.description,
        pricePerHour: parseFloat(form.pricePerHour),
        institution: form.institution,
        location: { address: form.locationAddress },
        availableHours: {
          start: form.availableHoursStart,
          end: form.availableHoursEnd,
        },
      };
      if (uploadedImageUrl) {
        payload.images = [uploadedImageUrl];
      }

      await api.put(`/properties/${property._id}`, payload);
      Alert.alert('Success', 'Property updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Image Upload */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Property Image</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={32} color="#94a3b8" />
                  <Text style={styles.imagePlaceholderText}>Tap to select an image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Field label="Property Name *" value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. Greenfield Football Pitch" />
          <Field label="Location (Address) *" value={form.locationAddress} onChangeText={(v) => set('locationAddress', v)} placeholder="e.g. 45 Galle Road, Colombo 3" />
          <Field label="Price per Hour (LKR) *" value={form.pricePerHour} onChangeText={(v) => set('pricePerHour', v)} placeholder="e.g. 2500" keyboardType="numeric" />
          <Field label="Description" value={form.description} onChangeText={(v) => set('description', v)} placeholder="Describe the facility..." multiline />
          <Field label="Institution (optional)" value={form.institution} onChangeText={(v) => set('institution', v)} placeholder="e.g. University of Colombo" />
          <Field label="Available From (HH:MM) *" value={form.availableHoursStart} onChangeText={(v) => set('availableHoursStart', v)} placeholder="e.g. 08:00" />
          <Field label="Available Until (HH:MM) *" value={form.availableHoursEnd} onChangeText={(v) => set('availableHoursEnd', v)} placeholder="e.g. 22:00" />

          {/* Sport Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Sport Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.sportRow}>
                {SPORT_TYPES.map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.sportChip, form.sportType === sport && styles.sportChipActive]}
                    onPress={() => set('sportType', sport)}
                  >
                    <Text style={[styles.sportChipText, form.sportType === sport && styles.sportChipTextActive]}>
                      {sport}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || uploadingImage}
          >
            {loading || uploadingImage ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#ffffff" />
                <Text style={styles.submitBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  inputMultiline: {
    height: 90,
    paddingTop: 12,
  },
  sportRow: { flexDirection: 'row', gap: 8 },
  sportChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  sportChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  sportChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  sportChipTextActive: { color: '#ffffff' },
  submitBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});
