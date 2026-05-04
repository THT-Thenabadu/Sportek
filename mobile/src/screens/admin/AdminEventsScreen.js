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

const NativeInput = ({ type, value, onChangeText, placeholder, style }) => {
  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type, value, placeholder,
      onChange: (e) => onChangeText(e.target.value),
      style: { ...StyleSheet.flatten(style), outline: 'none', backgroundColor: 'transparent', border: 'none', width: '100%', height: '100%' },
      className: 'rn-input-web'
    });
  }
  return <TextInput style={{flex:1}} value={value} onChangeText={onChangeText} placeholder={placeholder} />;
};

export default function AdminEventsScreen() {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, events, venues, bookings
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Events State ---
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const initialEventForm = {
    name: '', description: '', eventType: 'music', date: '', time: '', 
    venueType: 'indoor', venueId: '', location: '', organizerName: '', bookingDeadline: '',
    ticketCategories: []
  };
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [imageUri, setImageUri] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [eventFormError, setEventFormError] = useState('');

  // --- Venues State ---
  const [venues, setVenues] = useState([]);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueStep, setVenueStep] = useState(1);
  const [savingVenue, setSavingVenue] = useState(false);
  const [venueImageUri, setVenueImageUri] = useState(null);
  const [uploadingVenueImage, setUploadingVenueImage] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [showViewVenueModal, setShowViewVenueModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);

  const initialVenueForm = {
    name: '', venueType: 'Stadium', totalCapacity: '', description: '',
    address: '', city: '', locationType: 'indoor',
    seatRows: [{ rowLabel: 'A', seatCount: '10' }]
  };
  const [venueForm, setVenueForm] = useState(initialVenueForm);
  const [venueFormError, setVenueFormError] = useState('');
  const VENUE_TYPES = ['Stadium', 'Arena', 'Hall', 'Court', 'Field', 'Gymnasium', 'Auditorium', 'Other'];

  // --- Bookings State ---
  const [tickets, setTickets] = useState([]);

  // Fetch Methods
  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data || []);
    } catch (err) {
      console.log('Error fetching events:', err.message);
    }
  }, []);

  const fetchVenues = useCallback(async () => {
    try {
      const res = await api.get('/venues');
      setVenues(res.data || []);
    } catch (err) {
      console.log('Error fetching venues:', err.message);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get('/tickets/admin/all');
      setTickets(res.data || []);
    } catch (err) {
      console.log('Error fetching tickets:', err.message);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchEvents(), fetchVenues(), fetchTickets()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchEvents, fetchVenues, fetchTickets]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = () => { setRefreshing(true); loadAllData(); };

  // --- Venue Handlers ---
  const addVenueRow = () => {
    const nextLabel = String.fromCharCode(65 + venueForm.seatRows.length);
    setVenueForm({
      ...venueForm,
      seatRows: [...venueForm.seatRows, { rowLabel: nextLabel, seatCount: '10' }]
    });
  };

  const removeVenueRow = (index) => {
    const updated = venueForm.seatRows.filter((_, i) => i !== index);
    setVenueForm({ ...venueForm, seatRows: updated });
  };

  const updateVenueRow = (index, field, val) => {
    const updated = [...venueForm.seatRows];
    updated[index][field] = val;
    setVenueForm({ ...venueForm, seatRows: updated });
  };

  const pickVenueImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8, base64: Platform.OS === 'web'
    });
    if (!result.canceled) {
      if (Platform.OS === 'web' && result.assets[0].base64) {
        setVenueImageUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else {
        setVenueImageUri(result.assets[0].uri);
      }
    }
  };

  const handleNextStep = () => {
    setVenueFormError('');
    if (venueStep === 1) {
      if (!venueForm.name || !venueForm.totalCapacity || !venueForm.venueType) {
        setVenueFormError('Please fill in Venue Name, Type, and Total Capacity before proceeding.');
        return;
      }
    } else if (venueStep === 2) {
      if (!venueForm.address || !venueForm.city) {
        setVenueFormError('Please fill in Address and City before proceeding.');
        return;
      }
    }
    setVenueStep(s => s + 1);
  };

  const handleSaveVenue = async () => {
    // Validate seat total matches capacity for indoor venues
    if (venueForm.locationType === 'indoor') {
      const totalSeats = venueForm.seatRows.reduce((sum, r) => sum + Number(r.seatCount || 0), 0);
      const capacity = Number(venueForm.totalCapacity);
      if (totalSeats !== capacity) {
        setVenueFormError(`Seat total (${totalSeats}) must equal Total Capacity (${capacity}). Adjust your rows.`);
        return;
      }
    }
    setSavingVenue(true);
    let seatLayoutImage = editingVenueId ? (venueForm.seatLayoutImageUrl || '') : '';

    if (venueImageUri && venueForm.locationType === 'indoor' && !venueImageUri.startsWith('http')) {
      setUploadingVenueImage(true);
      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          formData.append('file', venueImageUri);
        } else {
          formData.append('file', { uri: venueImageUri, type: 'image/jpeg', name: 'venue_map.jpg' });
        }
        formData.append('upload_preset', 'SportekEvent');
        const imgRes = await fetch('https://api.cloudinary.com/v1_1/dcqcebwg8/image/upload', {
          method: 'POST', body: formData,
        });
        const imgData = await imgRes.json();
        if (imgData.secure_url) seatLayoutImage = imgData.secure_url;
      } catch (err) {
        Alert.alert('Upload Error', 'Failed to upload venue layout image.');
        setUploadingVenueImage(false);
        setSavingVenue(false);
        return;
      }
      setUploadingVenueImage(false);
    } else if (venueImageUri && venueImageUri.startsWith('http')) {
      seatLayoutImage = venueImageUri;
    }

    try {
      const payload = {
        name: venueForm.name,
        venueType: venueForm.venueType,
        totalCapacity: Number(venueForm.totalCapacity),
        description: venueForm.description,
        address: venueForm.address,
        city: venueForm.city,
        locationType: venueForm.locationType,
        seatLayoutImage: venueForm.locationType === 'indoor' ? seatLayoutImage : '',
        seatRows: venueForm.locationType === 'indoor' ? venueForm.seatRows.map(r => ({
          rowLabel: r.rowLabel.toUpperCase(),
          seatCount: Number(r.seatCount)
        })) : []
      };

      if (editingVenueId) {
        await api.put(`/venues/${editingVenueId}`, payload);
        Alert.alert('Success', 'Venue updated successfully');
      } else {
        await api.post('/venues', payload);
        Alert.alert('Success', 'Venue added successfully');
      }
      setShowVenueModal(false);
      setEditingVenueId(null);
      fetchVenues();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save venue');
    } finally {
      setSavingVenue(false);
    }
  };

  const openEditVenue = async (v) => {
    // Fetch fresh full venue data from API to ensure seatLayoutImage is present
    let fullVenue = v;
    try {
      const res = await api.get(`/venues/${v._id}`);
      fullVenue = res.data;
    } catch (err) {
      console.log('Could not fetch full venue, using cached data:', err.message);
    }

    setEditingVenueId(fullVenue._id);
    const existingImage = fullVenue.seatLayoutImage && fullVenue.seatLayoutImage.length > 0
      ? fullVenue.seatLayoutImage
      : null;

    setVenueImageUri(existingImage);
    setVenueForm({
      name: fullVenue.name,
      venueType: fullVenue.venueType,
      totalCapacity: String(fullVenue.totalCapacity),
      description: fullVenue.description || '',
      address: fullVenue.address,
      city: fullVenue.city,
      locationType: fullVenue.locationType,
      seatLayoutImageUrl: existingImage || '',
      seatRows: fullVenue.seatRows?.length
        ? fullVenue.seatRows.map(r => ({ rowLabel: r.rowLabel, seatCount: String(r.seatCount) }))
        : [{ rowLabel: 'A', seatCount: '10' }],
    });
    setVenueFormError('');
    setVenueStep(1);
    setShowVenueModal(true);
  };

  const handleDeleteVenue = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this venue?')) {
        api.delete(`/venues/${id}`)
          .then(() => fetchVenues())
          .catch((err) => Alert.alert('Error', 'Failed to delete venue'));
      }
    } else {
      Alert.alert('Delete Venue', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await api.delete(`/venues/${id}`);
              fetchVenues();
            } catch (err) { Alert.alert('Error', 'Failed to delete venue'); }
          }
        }
      ]);
    }
  };

  // --- Event Handlers ---
  const handleDeleteEvent = (id) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/events/${id}`);
            fetchEvents();
          } catch (err) { Alert.alert('Error', 'Failed to delete event.'); }
        }
      }
    ]);
  };

  const openCreateEvent = () => {
    setEditingEventId(null);
    setEventForm(initialEventForm);
    setImageUri(null);
    setEventFormError('');
    setShowEventModal(true);
  };

  const openEditEvent = async (evt) => {
    let fullEvt = evt;
    try {
      const res = await api.get(`/events/${evt._id}`);
      fullEvt = res.data;
    } catch (err) {
      console.log('Failed to fetch full event, using cache', err);
    }
    setEditingEventId(fullEvt._id);
    const dateStr = fullEvt.date ? new Date(fullEvt.date).toISOString().split('T')[0] : '';
    const deadlineStr = fullEvt.bookingDeadline ? new Date(fullEvt.bookingDeadline).toISOString().split('T')[0] : '';
    
    setEventForm({
      name: fullEvt.name, description: fullEvt.description || '', eventType: fullEvt.eventType || 'music',
      date: dateStr, time: fullEvt.time, venueType: fullEvt.venueType || 'indoor', 
      venueId: fullEvt.venueId?._id || fullEvt.venueId || '', location: fullEvt.location || '',
      organizerName: fullEvt.organizerName || '', bookingDeadline: deadlineStr,
      ticketCategories: fullEvt.ticketCategories?.length ? fullEvt.ticketCategories : (fullEvt.ticketTiers || [])
    });
    setImageUri(fullEvt.bannerImage || null);
    setEventFormError('');
    setShowEventModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8, base64: Platform.OS === 'web'
    });
    if (!result.canceled) {
      if (Platform.OS === 'web' && result.assets[0].base64) {
        setImageUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else {
        setImageUri(result.assets[0].uri);
      }
    }
  };

  const handleSaveEvent = async () => {
    setEventFormError('');
    if (!eventForm.name || !eventForm.date || !eventForm.time) {
      setEventFormError('Please fill in Event Name, Date, and Time.');
      return;
    }
    if (eventForm.venueType === 'indoor' && !eventForm.venueId) {
      setEventFormError('Please select a Venue Auditorium.');
      return;
    }
    if (eventForm.venueType === 'outdoor' && !eventForm.location) {
      setEventFormError('Please specify the Outdoor Location.');
      return;
    }
    if (!eventForm.bookingDeadline) {
      setEventFormError('Please specify a Booking Deadline.');
      return;
    }

    setSavingEvent(true);
    let bannerImage = editingEventId ? (imageUri || '') : '';

    if (imageUri && !imageUri.startsWith('http')) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          formData.append('file', imageUri);
        } else {
          formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'event_banner.jpg' });
        }
        formData.append('upload_preset', 'SportekEvent');
        const imgRes = await fetch('https://api.cloudinary.com/v1_1/dcqcebwg8/image/upload', {
          method: 'POST', body: formData,
        });
        const imgData = await imgRes.json();
        if (imgData.secure_url) bannerImage = imgData.secure_url;
      } catch (err) {
        Alert.alert('Upload Error', 'Failed to upload event banner.');
        setUploadingImage(false);
        setSavingEvent(false);
        return;
      }
      setUploadingImage(false);
    } else if (imageUri && imageUri.startsWith('http')) {
      bannerImage = imageUri;
    }

    try {
      const payload = {
        name: eventForm.name,
        description: eventForm.description,
        eventType: eventForm.eventType,
        date: eventForm.date,
        time: eventForm.time,
        venueType: eventForm.venueType,
        venueId: eventForm.venueType === 'indoor' ? eventForm.venueId : null,
        location: eventForm.venueType === 'outdoor' ? eventForm.location : '',
        organizerName: eventForm.organizerName,
        bookingDeadline: eventForm.bookingDeadline,
        ticketCategories: eventForm.ticketCategories.map(c => ({
          name: c.name || c.tier, price: Number(c.price), totalQuantity: Number(c.totalQuantity)
        })),
        bannerImage,
        status: 'live' // auto publish
      };

      if (editingEventId) {
        await api.put(`/events/${editingEventId}`, payload);
      } else {
        await api.post('/events', payload);
      }
      setShowEventModal(false);
      fetchEvents();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save event.');
    } finally {
      setSavingEvent(false);
    }
  };

  const addCategory = () => {
    if (eventForm.ticketCategories.length >= 5) return;
    setEventForm({ ...eventForm, ticketCategories: [...eventForm.ticketCategories, { name: '', price: '', totalQuantity: '' }] });
  };
  const removeCategory = (index) => {
    const cats = [...eventForm.ticketCategories];
    cats.splice(index, 1);
    setEventForm({ ...eventForm, ticketCategories: cats });
  };
  const updateCategory = (index, field, val) => {
    const cats = [...eventForm.ticketCategories];
    cats[index][field] = val;
    setEventForm({ ...eventForm, ticketCategories: cats });
  };

  // --- Renderers ---
  if (loading) return <LoadingSpinner message="Loading Dashboard..." />;

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.dashTitle}>Event Management</Text>
      
      <TouchableOpacity style={styles.dashCard} onPress={() => setCurrentView('venues')}>
        <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
          <Ionicons name="business" size={32} color="#1d4ed8" />
        </View>
        <View style={styles.dashCardText}>
          <Text style={styles.dashCardTitle}>Venues</Text>
          <Text style={styles.dashCardSub}>{venues.length} registered venues</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.dashCard} onPress={() => setCurrentView('events')}>
        <View style={[styles.iconBox, { backgroundColor: '#fce7f3' }]}>
          <Ionicons name="ticket" size={32} color="#be185d" />
        </View>
        <View style={styles.dashCardText}>
          <Text style={styles.dashCardTitle}>Events</Text>
          <Text style={styles.dashCardSub}>{events.length} active events</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.dashCard} onPress={() => setCurrentView('bookings')}>
        <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="clipboard" size={32} color="#15803d" />
        </View>
        <View style={styles.dashCardText}>
          <Text style={styles.dashCardTitle}>Bookings</Text>
          <Text style={styles.dashCardSub}>{tickets.length} total tickets sold</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderVenues = () => (
    <>
      <View style={styles.headerControls}>
        <TouchableOpacity style={styles.backBtnRow} onPress={() => setCurrentView('dashboard')}>
          <Ionicons name="arrow-back" size={20} color="#1d4ed8" />
          <Text style={styles.backBtnText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createBtn} onPress={() => { setEditingVenueId(null); setVenueStep(1); setVenueForm(initialVenueForm); setVenueImageUri(null); setShowVenueModal(true); }}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createBtnText}>Add Venue</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {venues.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No venues found.</Text>
          </View>
        ) : (
          venues.map(v => (
            <View key={v._id} style={styles.listItemCard}>
              <View style={{flex:1}}>
                <Text style={styles.listItemTitle}>{v.name}</Text>
                <Text style={styles.listItemSub}>{v.city} • {v.venueType} • {v.totalCapacity} seats</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { setSelectedVenue(v); setShowViewVenueModal(true); }}>
                  <Ionicons name="eye-outline" size={20} color="#059669" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditVenue(v)}>
                  <Ionicons name="pencil-outline" size={20} color="#1d4ed8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteVenue(v._id)}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Venue Creation Wizard Modal */}
      <Modal visible={showVenueModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingVenueId ? 'Edit Venue' : 'Create New Venue'}</Text>
              <TouchableOpacity onPress={() => setShowVenueModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {/* Steps Indicator */}
            <View style={styles.stepIndicator}>
               <Text style={[styles.stepText, venueStep >= 1 && styles.stepTextActive]}>1. Info</Text>
               <Text style={styles.stepDiv}>→</Text>
               <Text style={[styles.stepText, venueStep >= 2 && styles.stepTextActive]}>2. Location</Text>
               <Text style={styles.stepDiv}>→</Text>
               <Text style={[styles.stepText, venueStep === 3 && styles.stepTextActive]}>3. Layout</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {venueStep === 1 && (
                <View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Venue Name *</Text>
                    <TextInput style={styles.input} value={venueForm.name} onChangeText={v => setVenueForm({...venueForm, name: v})} placeholder="e.g. Grand City Symphony" />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.formGroup, {flex: 1}]}>
                      <Text style={styles.label}>Venue Type *</Text>
                      <TextInput style={styles.input} value={venueForm.venueType} onChangeText={v => setVenueForm({...venueForm, venueType: v})} placeholder="e.g. Indoor Auditorium" />
                    </View>
                    <View style={[styles.formGroup, {flex: 1}]}>
                      <Text style={styles.label}>Total Capacity *</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={venueForm.totalCapacity} onChangeText={v => setVenueForm({...venueForm, totalCapacity: v})} placeholder="e.g. 500" />
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput style={[styles.input, styles.textArea]} value={venueForm.description} onChangeText={v => setVenueForm({...venueForm, description: v})} multiline placeholder="Additional details about the venue..." />
                  </View>
                </View>
              )}

              {venueStep === 2 && (
                <View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Address *</Text>
                    <TextInput style={styles.input} value={venueForm.address} onChangeText={v => setVenueForm({...venueForm, address: v})} placeholder="e.g. 123 Arts District Way" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>City *</Text>
                    <TextInput style={styles.input} value={venueForm.city} onChangeText={v => setVenueForm({...venueForm, city: v})} placeholder="e.g. Colombo" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Venue Environment *</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity style={[styles.envBtn, venueForm.locationType === 'indoor' && styles.envBtnActive]} onPress={() => setVenueForm({...venueForm, locationType: 'indoor'})}>
                        <Text style={[styles.envBtnText, venueForm.locationType === 'indoor' && styles.envBtnTextActive]}>Indoor</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.envBtn, venueForm.locationType === 'outdoor' && styles.envBtnActive]} onPress={() => setVenueForm({...venueForm, locationType: 'outdoor'})}>
                        <Text style={[styles.envBtnText, venueForm.locationType === 'outdoor' && styles.envBtnTextActive]}>Outdoor</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {venueStep === 3 && (
                <View>
                  {venueForm.locationType === 'outdoor' ? (
                    <View style={styles.outdoorNotice}>
                      <Text style={styles.outdoorNoticeText}>Seat layout is not applicable for outdoor venues. You can proceed to save.</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>
                          Seat Layout Map{' '}
                          {(venueImageUri || venueForm.seatLayoutImageUrl)
                            ? <Text style={{color:'#16a34a', fontSize:11}}>(image linked — tap to change)</Text>
                            : null}
                        </Text>
                        <TouchableOpacity
                          style={[styles.imgPicker, { height: 300, backgroundColor: '#f8fafc', borderStyle: 'dashed' }]}
                          onPress={pickVenueImage}
                          activeOpacity={0.8}
                        >
                          {(venueImageUri || venueForm.seatLayoutImageUrl) ? (
                            <Image
                              source={{ uri: venueImageUri || venueForm.seatLayoutImageUrl }}
                              resizeMode="contain"
                              style={{ width: '100%', height: '100%' }}
                              onError={() => {}}
                            />
                          ) : (
                            <View style={{alignItems: 'center', gap: 8}}>
                              <Ionicons name="image-outline" size={40} color="#94a3b8" />
                              <Text style={{fontSize: 13, color: '#64748b', fontWeight: '600'}}>Tap to upload seat map</Text>
                              <Text style={{fontSize: 11, color: '#94a3b8'}}>PNG, JPG up to 5MB</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 12 }}>
                        <Text style={styles.label}>Seat Row Assignment</Text>
                        <TouchableOpacity style={styles.addRowBtn} onPress={addVenueRow}>
                          <Text style={styles.addRowBtnText}>Add Row</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {venueForm.seatRows.map((r, i) => (
                        <View key={i} style={styles.tierRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tierLabel}>Row Label</Text>
                            <TextInput style={styles.input} maxLength={3} value={r.rowLabel} onChangeText={v => updateVenueRow(i, 'rowLabel', v)} placeholder="e.g. A" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tierLabel}>No. Seats</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={r.seatCount} onChangeText={v => updateVenueRow(i, 'seatCount', v)} placeholder="e.g. 10" />
                          </View>
                          <TouchableOpacity style={{ justifyContent: 'center', paddingLeft: 8, paddingTop: 16 }} onPress={() => removeVenueRow(i)} disabled={venueForm.seatRows.length === 1}>
                            <Ionicons name="trash" size={20} color={venueForm.seatRows.length === 1 ? '#cbd5e1' : '#dc2626'} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Seat count vs capacity summary */}
                      {(() => {
                        const totalSeats = venueForm.seatRows.reduce((sum, r) => sum + Number(r.seatCount || 0), 0);
                        const capacity = Number(venueForm.totalCapacity);
                        const diff = capacity - totalSeats;
                        const isMatch = totalSeats === capacity && capacity > 0;
                        const bgColor = isMatch ? '#f0fdf4' : '#fef2f2';
                        const textColor = isMatch ? '#16a34a' : '#dc2626';
                        return (
                          <View style={{ backgroundColor: bgColor, borderRadius: 10, padding: 12, marginTop: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>Total Capacity</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{capacity}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>Seats Configured</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{totalSeats}</Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>
                                {isMatch ? '✓ Seats match capacity!' : diff > 0 ? `${diff} seats remaining to assign` : `${Math.abs(diff)} seats over capacity!`}
                              </Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: textColor }}>
                                {isMatch ? 'OK' : `${totalSeats}/${capacity}`}
                              </Text>
                            </View>
                          </View>
                        );
                      })()}
                    </>
                  )}
                </View>
              )}
              
              {venueFormError ? (
                <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginTop: 16 }}>
                  <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                    {venueFormError}
                  </Text>
                </View>
              ) : null}

              <View style={styles.wizardFooter}>
                {venueStep > 1 ? (
                  <TouchableOpacity style={styles.wizardBtnOutline} onPress={() => { setVenueStep(s => s - 1); setVenueFormError(''); }}>
                    <Text style={styles.wizardBtnOutlineText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.wizardBtnOutline} onPress={() => { setShowVenueModal(false); setVenueFormError(''); }}>
                    <Text style={styles.wizardBtnOutlineText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                
                {venueStep < 3 ? (
                  <TouchableOpacity style={styles.wizardBtnSolid} onPress={handleNextStep}>
                    <Text style={styles.wizardBtnSolidText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.wizardBtnSolid, (savingVenue || uploadingVenueImage) && { opacity: 0.7 }]} onPress={handleSaveVenue} disabled={savingVenue || uploadingVenueImage}>
                    {savingVenue || uploadingVenueImage ? <ActivityIndicator color="#fff" /> : <Text style={styles.wizardBtnSolidText}>{editingVenueId ? 'Update Venue' : 'Create Venue Profile'}</Text>}
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Venue View Modal */}
      <Modal visible={showViewVenueModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Venue Details</Text>
              <TouchableOpacity onPress={() => setShowViewVenueModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedVenue && (
                <View style={{ gap: 16 }}>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e293b' }}>{selectedVenue.name}</Text>
                    <Text style={{ fontSize: 14, color: '#64748b' }}>{selectedVenue.venueType} • {selectedVenue.totalCapacity} capacity</Text>
                  </View>
                  <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4 }}>Location</Text>
                    <Text style={{ fontSize: 14, color: '#334155' }}>{selectedVenue.address}</Text>
                    <Text style={{ fontSize: 14, color: '#334155' }}>{selectedVenue.city}</Text>
                    <Text style={{ fontSize: 13, color: '#0ea5e9', marginTop: 4, fontWeight: '500', textTransform: 'capitalize' }}>{selectedVenue.locationType} Venue</Text>
                  </View>
                  {selectedVenue.description ? (
                    <View>
                      <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4 }}>Description</Text>
                      <Text style={{ fontSize: 14, color: '#334155', lineHeight: 20 }}>{selectedVenue.description}</Text>
                    </View>
                  ) : null}
                  {selectedVenue.seatLayoutImage ? (
                    <View>
                      <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4 }}>Seat Layout Map</Text>
                      <Image source={{ uri: selectedVenue.seatLayoutImage }} resizeMode="contain" style={{ width: '100%', height: 200, backgroundColor: '#f1f5f9', borderRadius: 8 }} />
                    </View>
                  ) : null}
                  {selectedVenue.seatRows && selectedVenue.seatRows.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 8 }}>Seat Rows ({selectedVenue.seatRows.length})</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {selectedVenue.seatRows.map((r, i) => (
                          <View key={i} style={{ backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>Row {r.rowLabel}: {r.seatCount}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );

  const renderBookings = () => {
    // Group tickets by event
    const grouped = tickets.reduce((acc, t) => {
      const eName = t.eventId?.name || 'Unknown Event';
      if (!acc[eName]) acc[eName] = [];
      acc[eName].push(t);
      return acc;
    }, {});

    return (
      <>
        <View style={styles.headerControls}>
          <TouchableOpacity style={styles.backBtnRow} onPress={() => setCurrentView('dashboard')}>
            <Ionicons name="arrow-back" size={20} color="#1d4ed8" />
            <Text style={styles.backBtnText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No bookings found.</Text>
            </View>
          ) : (
            Object.keys(grouped).map(eventName => (
              <View key={eventName} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{eventName}</Text>
                {grouped[eventName].map(t => (
                  <View key={t._id} style={styles.bookingCard}>
                    <View style={{flex: 1}}>
                      <Text style={styles.bookingName}>{t.customerId?.name || 'Unknown User'}</Text>
                      <Text style={styles.bookingEmail}>{t.customerId?.email || 'N/A'}</Text>
                      <Text style={styles.bookingMeta}>{new Date(t.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                      <View style={styles.tierChip}>
                        <Text style={styles.tierName}>{t.tier}</Text>
                        <Text style={styles.tierPrice}>LKR {t.price}</Text>
                      </View>
                      <Text style={[styles.bookingStatus, {color: t.status === 'active' ? '#16a34a' : '#dc2626'}]}>
                        {t.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </>
    );
  };

  const renderEvents = () => (
    <>
      <View style={styles.headerControls}>
        <TouchableOpacity style={styles.backBtnRow} onPress={() => setCurrentView('dashboard')}>
          <Ionicons name="arrow-back" size={20} color="#1d4ed8" />
          <Text style={styles.backBtnText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateEvent}>
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
                      <Text style={styles.tierPrice}>LKR {t.price || 0}</Text>
                      <Text style={styles.tierStats}>
                        Sold: {t.soldQuantity || 0} / {t.totalQuantity || '∞'}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionBtnEdit} onPress={() => openEditEvent(evt)}>
                    <Ionicons name="pencil" size={14} color="#1d4ed8" />
                    <Text style={styles.actionBtnEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnDelete} onPress={() => handleDeleteEvent(evt._id)}>
                    <Ionicons name="trash" size={14} color="#dc2626" />
                    <Text style={styles.actionBtnDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Event Modal */}
      <Modal visible={showEventModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '95%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowEventModal(false)}>
                  <Ionicons name="arrow-back" size={24} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{editingEventId ? 'Edit Event' : 'Create New Event'}</Text>
              </View>
              <View style={{ backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>DRAFT MODE</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              
              {/* SECTION 1 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>1. BASIC EVENT INFO</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Event Name</Text>
                  <TextInput style={styles.input} value={eventForm.name} onChangeText={v => setEventForm({ ...eventForm, name: v })} placeholder="e.g. Midnight Blues Concert" />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Event Description</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={eventForm.description} onChangeText={v => setEventForm({ ...eventForm, description: v })} multiline placeholder="Experience an unforgettable night..." />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Event Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {['music', 'drama', 'sport', 'other'].map(type => (
                      <TouchableOpacity key={type} style={[styles.envBtn, eventForm.eventType === type && styles.envBtnActive, { flex: 0, paddingHorizontal: 16 }]} onPress={() => setEventForm({ ...eventForm, eventType: type })}>
                        <Text style={[styles.envBtnText, eventForm.eventType === type && styles.envBtnTextActive, { textTransform: 'capitalize' }]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Background Image</Text>
                  <TouchableOpacity style={[styles.imgPicker, { height: 120 }]} onPress={pickImage}>
                    {imageUri ? <Image source={{ uri: imageUri }} style={styles.imgPreview} /> : (
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        <Ionicons name="image-outline" size={32} color="#94a3b8" />
                        <Text style={{ fontSize: 13, color: '#64748b' }}>Upload a file</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECTION 2 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>2. DATE & TIME</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Event Date</Text>
                    <View style={styles.input}>
                      <NativeInput type="date" value={eventForm.date} onChangeText={v => setEventForm({ ...eventForm, date: v })} placeholder="YYYY-MM-DD" />
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Event Time</Text>
                    <View style={styles.input}>
                      <NativeInput type="time" value={eventForm.time} onChangeText={v => setEventForm({ ...eventForm, time: v })} placeholder="--:--" />
                    </View>
                  </View>
                </View>
              </View>

              {/* SECTION 3 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>3. VENUE DETAILS</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Venue Type</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[styles.envBtn, eventForm.venueType === 'indoor' && styles.envBtnActive, { paddingVertical: 10 }]} onPress={() => setEventForm({ ...eventForm, venueType: 'indoor', venueId: '' })}>
                        <Text style={[styles.envBtnText, eventForm.venueType === 'indoor' && styles.envBtnTextActive]}>Indoor</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.envBtn, eventForm.venueType === 'outdoor' && styles.envBtnActive, { paddingVertical: 10 }]} onPress={() => setEventForm({ ...eventForm, venueType: 'outdoor', venueId: null })}>
                        <Text style={[styles.envBtnText, eventForm.venueType === 'outdoor' && styles.envBtnTextActive]}>Outdoor</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{eventForm.venueType === 'indoor' ? 'Select Auditorium' : 'Location Name'}</Text>
                    {eventForm.venueType === 'indoor' ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 8 }}>
                        {venues.filter(v => v.venueType !== 'outdoor' && v.locationType !== 'outdoor').map(v => (
                          <TouchableOpacity key={v._id} style={[styles.venueChip, eventForm.venueId === v._id && styles.venueChipActive]} onPress={() => setEventForm({ ...eventForm, venueId: v._id })}>
                            <Text style={[styles.venueChipText, eventForm.venueId === v._id && styles.venueChipTextActive]}>{v.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <TextInput style={styles.input} value={eventForm.location} onChangeText={v => setEventForm({ ...eventForm, location: v })} placeholder="Outdoor location..." />
                    )}
                  </View>
                </View>
                {/* Dynamic Image Preview */}
                {eventForm.venueType === 'indoor' && eventForm.venueId ? (
                  (() => {
                    const selectedVenueObj = venues.find(v => v._id === eventForm.venueId);
                    if (selectedVenueObj && selectedVenueObj.seatLayoutImage) {
                      return (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '600', marginBottom: 6 }}>✓ Venue Map Loaded</Text>
                          <Image source={{ uri: selectedVenueObj.seatLayoutImage }} style={{ width: '100%', height: 160, resizeMode: 'contain', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }} />
                        </View>
                      );
                    }
                    return null;
                  })()
                ) : null}
              </View>

              {/* SECTION 4 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>4. OPERATIONS & DEADLINES</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Organizer Name</Text>
                    <TextInput style={styles.input} value={eventForm.organizerName} onChangeText={v => setEventForm({ ...eventForm, organizerName: v })} placeholder="e.g. BlueStar Events" />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Booking Deadline Date</Text>
                    <View style={styles.input}>
                      <NativeInput type="date" value={eventForm.bookingDeadline} onChangeText={v => setEventForm({ ...eventForm, bookingDeadline: v })} placeholder="YYYY-MM-DD" />
                    </View>
                  </View>
                </View>
              </View>

              {/* SECTION 5 */}
              <View style={styles.sectionContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.sectionTitle}>5. TICKET CATEGORIES (PRICING)</Text>
                  <TouchableOpacity style={{ backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }} onPress={addCategory}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>+ Add Category ({eventForm.ticketCategories.length}/5)</Text>
                  </TouchableOpacity>
                </View>
                
                {eventForm.ticketCategories.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: 12 }}>
                    <Ionicons name="pricetag-outline" size={24} color="#94a3b8" />
                    <Text style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>No ticket categories added.</Text>
                  </View>
                ) : (
                  eventForm.ticketCategories.map((c, i) => (
                    <View key={i} style={styles.tierRow}>
                      <View style={styles.tierCol}>
                        <Text style={styles.tierLabel}>Name</Text>
                        <TextInput style={styles.input} value={c.name} onChangeText={v => updateCategory(i, 'name', v)} placeholder="VIP" />
                      </View>
                      <View style={styles.tierCol}>
                        <Text style={styles.tierLabel}>Price (LKR)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={c.price ? String(c.price) : ''} onChangeText={v => updateCategory(i, 'price', v)} placeholder="0" />
                      </View>
                      <View style={styles.tierCol}>
                        <Text style={styles.tierLabel}>Total Qty</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={c.totalQuantity ? String(c.totalQuantity) : ''} onChangeText={v => updateCategory(i, 'totalQuantity', v)} placeholder="0" />
                      </View>
                      <TouchableOpacity style={{ justifyContent: 'center', paddingLeft: 8, paddingTop: 16 }} onPress={() => removeCategory(i)}>
                        <Ionicons name="trash" size={20} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {eventFormError ? (
                <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{eventFormError}</Text>
                </View>
              ) : null}

              <View style={styles.wizardFooter}>
                <TouchableOpacity style={styles.wizardBtnOutline} onPress={() => setShowEventModal(false)}>
                  <Text style={styles.wizardBtnOutlineText}>DISCARD</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.wizardBtnSolid, { backgroundColor: '#4f46e5' }, (savingEvent || uploadingImage) && { opacity: 0.7 }]} onPress={handleSaveEvent} disabled={savingEvent || uploadingImage}>
                  {savingEvent || uploadingImage ? <ActivityIndicator color="#fff" /> : <Text style={styles.wizardBtnSolidText}>{editingEventId ? 'UPDATE EVENT' : 'PUBLISH EVENT LIVE'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'events' && renderEvents()}
      {currentView === 'venues' && renderVenues()}
      {currentView === 'bookings' && renderBookings()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  headerControls: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 16 },
  createBtn: { backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  content: { padding: 16, paddingBottom: 40 },
  
  // Dashboard Styles
  dashTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  dashCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity:0.05, shadowRadius:8, elevation:3 },
  iconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  dashCardText: { flex: 1 },
  dashCardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  dashCardSub: { fontSize: 14, color: '#64748b' },

  // Shared List Styles
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  listItemCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0,height:1}, shadowOpacity:0.05, shadowRadius:4, elevation:2 },
  listItemTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  listItemSub: { fontSize: 13, color: '#64748b' },

  // Bookings Styles
  groupContainer: { marginBottom: 24 },
  groupTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 12, paddingLeft: 4 },
  bookingCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: {width:0,height:1}, shadowOpacity:0.05, shadowRadius:4, elevation:2 },
  bookingName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  bookingEmail: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  bookingMeta: { fontSize: 11, color: '#94a3b8' },
  bookingStatus: { fontSize: 11, fontWeight: '700', marginTop: 8, textAlign: 'right' },

  // Events Styles
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
  tierStats: { fontSize: 10, color: '#64748b', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  actionBtnEdit: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#eff6ff' },
  actionBtnEditText: { color: '#1d4ed8', fontWeight: '700', fontSize: 14 },
  actionBtnDelete: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fef2f2' },
  actionBtnDeleteText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#4f46e5', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 1, borderBottomColor: '#e0e7ff', paddingBottom: 8 },
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
  
  // Venue Wizard Styles
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  stepText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  stepTextActive: { color: '#1d4ed8', fontWeight: '800' },
  stepDiv: { marginHorizontal: 8, color: '#cbd5e1' },
  envBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  envBtnActive: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  envBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  envBtnTextActive: { color: '#1d4ed8' },
  outdoorNotice: { padding: 24, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', alignItems: 'center', marginTop: 20 },
  outdoorNoticeText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  addRowBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addRowBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  wizardFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
  wizardBtnOutline: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  wizardBtnOutlineText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  wizardBtnSolid: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#1d4ed8', alignItems: 'center' },
  wizardBtnSolidText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
