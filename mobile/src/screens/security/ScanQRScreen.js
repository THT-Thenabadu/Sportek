import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';

export default function ScanQRScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const lastScannedRef = useRef(null);

  // Re-enable scanning after 3s
  useEffect(() => {
    if (!scanning) {
      const timer = setTimeout(() => setScanning(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanning]);

  if (!permission) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" /></View>;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#cbd5e1" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Sportek needs access to your camera to scan booking QR codes.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleScan = async ({ data }) => {
    if (!scanning || processing) return;
    if (data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    setScanning(false);
    setProcessing(true);
    Vibration.vibrate(100);

    try {
      const res = await api.post('/bookings/scan-qr', { qrData: data });
      const booking = res.data?.booking || res.data;
      const customerName = booking?.customerId?.name || 'Customer';
      const facilityName = booking?.propertyId?.name || 'Facility';
      const timeSlot = booking?.timeSlot ? `${booking.timeSlot.start} – ${booking.timeSlot.end}` : '';
      const status = booking?.status || 'unknown';

      Alert.alert(
        '✅ QR Verified',
        `Customer: ${customerName}\nFacility: ${facilityName}\nTime: ${timeSlot}\nStatus: ${status}`,
        [{ text: 'Done', onPress: () => { setProcessing(false); lastScannedRef.current = null; } }]
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not verify this QR code.';
      Alert.alert('❌ Scan Failed', msg, [
        { text: 'Try Again', onPress: () => { setProcessing(false); setScanning(true); lastScannedRef.current = null; } },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? handleScan : undefined}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top section */}
        <View style={styles.overlaySection}>
          <Text style={styles.overlayTitle}>Scan Booking QR</Text>
          <Text style={styles.overlaySubtitle}>Align the QR code within the frame</Text>
        </View>

        {/* Middle row with scanner frame */}
        <View style={styles.middleRow}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            {[['tl', 0, 0], ['tr', 0, null], ['bl', null, 0], ['br', null, null]].map(([key, top, left]) => (
              <View
                key={key}
                style={[
                  styles.corner,
                  top === 0 && { top: 0 },
                  top === null && { bottom: 0 },
                  left === 0 && { left: 0 },
                  left === null && { right: 0 },
                ]}
              />
            ))}
            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.processingText}>Verifying...</Text>
              </View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* Bottom section */}
        <View style={styles.overlaySection}>
          <View style={styles.bottomBtns}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigation.navigate('UpcomingBookings')}
            >
              <Ionicons name="calendar-outline" size={18} color="#ffffff" />
              <Text style={styles.navBtnText}>Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigation.navigate('CurrentBookings')}
            >
              <Ionicons name="time-outline" size={18} color="#ffffff" />
              <Text style={styles.navBtnText}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person-outline" size={18} color="#ffffff" />
              <Text style={styles.navBtnText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const FRAME = 260;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 16, backgroundColor: '#f8fafc',
  },
  permissionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  permissionText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  permissionBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  permissionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayTitle: {
    fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 6,
  },
  overlaySubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    height: FRAME,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    width: FRAME,
    height: FRAME,
    borderRadius: 4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#1d4ed8',
    borderWidth: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 4,
  },
  processingText: { color: '#ffffff', fontWeight: '600' },
  bottomBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  navBtn: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  navBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
});
