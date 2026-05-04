import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminEventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [venues, setVenues] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    name: '', description: '', date: '', time: '', location: '', bookingDeadline: '',
    ticketTiers: [
      { tier: 'Gold', price: '', totalQuantity: '' },
      { tier: 'Silver', price: '', totalQuantity: '' },
      { tier: 'Bronze', price: '', totalQuantity: '' }
    ]
  };
  const [form, setForm] = useState(initialForm);
  const [imageUri, setImageUri] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data || []);
    } catch (err) {
      console.log('Error fetching events:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchVenues = useCallback(async () => {
    try {
      const res = await api.get('/venues');
      setVenues(res.data || []);
    } catch (err) {
      console.log('No /venues route or failed to fetch:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchVenues();
  }, [fetchEvents, fetchVenues]);

  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  const handleDelete = (id) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/events/${id}`);
            setEvents(prev => prev.filter(e => e._id !== id));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete event.');
          }
        }
      }
    ]);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setImageUri(null);
    setShowModal(true);
  };

  const openEdit = (evt) => {
    setEditingId(evt._id);
    setForm({
      name: evt.name, description: evt.description, date: evt.date, time: evt.time, location: evt.location,
      ticketTiers: evt.ticketTiers || initialForm.ticketTiers
    });
    setImageUri(evt.bannerImage || null);
    setShowModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!form.name || !form.date || !form.location || !form.time) {
      Alert.alert('Error', 'Name, Date, Time, and Location are required.');
      return;
    }
    setSaving(true);
    let bannerImage = editingId ? imageUri : '';

    if (imageUri && !imageUri.startsWith('http') && Platform.OS !== 'web') {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'upload.jpg' });
        formData.append('upload_preset', 'SportekEvent');
        const imgRes = await fetch('https://api.cloudinary.com/v1_1/dcqcebwg8/image/upload', {
          method: 'POST', body: formData,
        });
        const imgData = await imgRes.json();
        if (imgData.secure_url) bannerImage = imgData.secure_url;
      } catch (err) {
        Alert.alert('Upload Error', 'Failed to upload image.');
        setUploadingImage(false);
        setSaving(false);
        return;
      }
      setUploadingImage(false);
    }

    try {
      // Map ticketTiers → ticketCategories (model uses 'name' not 'tier')
      const ticketCategories = form.ticketTiers
        .filter(t => t.price && t.totalQuantity)
        .map(t => ({
          name: t.tier,
          price: Number(t.price),
          totalQuantity: Number(t.totalQuantity),
        }));

      // bookingDeadline defaults to event date if not set
      const bookingDeadline = form.bookingDeadline || form.date;

      const payload = {
        name: form.name,
        description: form.description,
        date: form.date,
        time: form.time,
        location: form.location,
        venueType: 'outdoor',   // default for mobile creation
        bookingDeadline,
        bannerImage,
        ticketCategories,
        ticketTiers: form.ticketTiers, // keep legacy field too
        status: 'live',
      };

      if (editingId) {
        await api.put(`/events/${editingId}`, payload);
      } else {
        await api.post('/events', payload);
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (index, field, val) => {
    const newTiers = [...form.ticketTiers];
    newTiers[index][field] = val;
    setForm({ ...form, ticketTiers: newTiers });
  };

  if (loading) return <LoadingSpinner message="Loading events..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerControls}>
        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createBtnText}>Create Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No events found.</Text>
          </View>
        ) : (
          events.map(evt => (
            <View key={evt._id} style={styles.card}>
              {evt.bannerImage ? (
                <Image source={{ uri: evt.bannerImage }} style={styles.cardImg} />
              ) : (
                <View style={styles.cardImgPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#94a3b8" />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.eventName}>{evt.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.metaText}>{new Date(evt.date).toLocaleDateString()} {evt.time}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.metaText}>{evt.location}</Text>
                </View>
                
                <View style={styles.tiersContainer}>
                  {evt.ticketTiers?.map((t, i) => (
                    <View key={i} style={styles.tierChip}>
                      <Text style={styles.tierName}>{t.tier}</Text>
                      <Text style={styles.tierPrice}>${t.price || 0}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionBtnEdit} onPress={() => openEdit(evt)}>
                    <Ionicons name="pencil" size={14} color="#1d4ed8" />
                    <Text style={styles.actionBtnEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnDelete} onPress={() => handleDelete(evt._id)}>
                    <Ionicons name="trash" size={14} color="#dc2626" />
                    <Text style={styles.actionBtnDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Event' : 'Create Event'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Event Name *</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="e.g. Summer Tournament" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={v => setForm({ ...form, description: v })} multiline placeholder="Event details..." />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
                  <TextInput style={styles.input} value={form.date} onChangeText={v => setForm({ ...form, date: v })} placeholder="2025-08-15" />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Time</Text>
                  <TextInput style={styles.input} value={form.time} onChangeText={v => setForm({ ...form, time: v })} placeholder="18:00" />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Booking Deadline (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={form.bookingDeadline} onChangeText={v => setForm({ ...form, bookingDeadline: v })} placeholder="2025-08-14 (defaults to event date)" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Location / Venue *</Text>
                {venues.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {venues.map(v => (
                      <TouchableOpacity key={v._id} style={[styles.venueChip, form.location === v.name && styles.venueChipActive]} onPress={() => setForm({ ...form, location: v.name })}>
                        <Text style={[styles.venueChipText, form.location === v.name && styles.venueChipTextActive]}>{v.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
                <TextInput style={styles.input} value={form.location} onChangeText={v => setForm({ ...form, location: v })} placeholder="Or type location manually..." />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Banner Image</Text>
                <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.imgPreview} /> : <Ionicons name="camera-outline" size={32} color="#94a3b8" />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 8 }]}>Ticket Tiers</Text>
              {form.ticketTiers.map((t, i) => (
                <View key={t.tier} style={styles.tierRow}>
                  <View style={styles.tierCol}>
                    <Text style={styles.tierLabel}>{t.tier} Price</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={t.price ? t.price.toString() : ''} onChangeText={v => updateTier(i, 'price', v)} placeholder="0" />
                  </View>
                  <View style={styles.tierCol}>
                    <Text style={styles.tierLabel}>{t.tier} Qty</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={t.totalQuantity ? t.totalQuantity.toString() : ''} onChangeText={v => updateTier(i, 'totalQuantity', v)} placeholder="0" />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={[styles.saveBtn, (saving || uploadingImage) && { opacity: 0.7 }]} onPress={handleSave} disabled={saving || uploadingImage}>
                {saving || uploadingImage ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Event</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  headerControls: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'flex-end' },
  createBtn: { backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardImg: { width: '100%', height: 160 },
  cardImgPlaceholder: { width: '100%', height: 160, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 16 },
  eventName: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 13, color: '#64748b' },
  tiersContainer: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 16 },
  tierChip: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', flex: 1 },
  tierName: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
  tierPrice: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  actionsRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  actionBtnEdit: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#eff6ff' },
  actionBtnEditText: { color: '#1d4ed8', fontWeight: '700', fontSize: 14 },
  actionBtnDelete: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fef2f2' },
  actionBtnDeleteText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b' },
  textArea: { height: 80, textAlignVertical: 'top' },
  venueChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  venueChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  venueChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  venueChipTextActive: { color: '#ffffff' },
  imgPicker: { width: '100%', height: 160, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imgPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  tierRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tierCol: { flex: 1 },
  tierLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  saveBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});
