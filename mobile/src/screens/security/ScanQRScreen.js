import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Vibration, TextInput, ScrollView, Platform, Alert, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';

// ── Booking Result Card ───────────────────────────────────────────────────────
function BookingResultCard({ booking, onScanAnother }) {
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(false);

  const customer = booking?.customerId?.name || 'Customer';
  const facility = booking?.propertyId?.name || 'Facility';
  const date = booking?.date
    ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const time = booking?.timeSlot ? `${booking.timeSlot.start} – ${booking.timeSlot.end}` : '—';

  const handleEndSession = async () => {
    setEnding(true);
    try {
      await api.patch(`/bookings/${booking._id}/end-session`);
      setEnded(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to end session.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setEnding(false);
    }
  };

  if (ended) {
    return (
      <View style={styles.resultCard}>
        <View style={styles.successBadge}>
          <Ionicons name="checkmark-done-circle" size={56} color="#475569" />
          <Text style={[styles.successTitle, { color: '#475569' }]}>Session Ended</Text>
          <Text style={styles.successSub}>Booking has been closed successfully</Text>
        </View>
        <TouchableOpacity style={styles.scanAnotherBtn} onPress={onScanAnother}>
          <Ionicons name="qr-code-outline" size={18} color="#fff" />
          <Text style={styles.scanAnotherText}>Scan Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.resultCard}>
      {/* Success header */}
      <View style={styles.successBadge}>
        <Ionicons name="checkmark-circle" size={56} color="#16a34a" />
        <Text style={styles.successTitle}>Access Granted</Text>
        <Text style={styles.successSub}>Booking verified — customer checked in</Text>
      </View>

      {/* Booking details */}
      <View style={styles.resultDetails}>
        <ResultRow icon="person-outline"           label="Customer" value={customer} />
        <ResultRow icon="business-outline"         label="Facility" value={facility} />
        <ResultRow icon="calendar-outline"         label="Date"     value={date} />
        <ResultRow icon="time-outline"             label="Time"     value={time} />
        <ResultRow icon="shield-checkmark-outline" label="Status"   value="ACTIVE" valueColor="#16a34a" />
      </View>

      {/* Exit button — moves booking to ended */}
      <TouchableOpacity
        style={[styles.exitSessionBtn, ending && { opacity: 0.7 }]}
        onPress={handleEndSession}
        disabled={ending}
      >
        {ending
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.exitSessionText}>Mark Exit / End Session</Text>
            </>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.scanAnotherBtn} onPress={onScanAnother}>
        <Ionicons name="qr-code-outline" size={18} color="#1d4ed8" />
        <Text style={[styles.scanAnotherText, { color: '#1d4ed8' }]}>Scan Another</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.resultRow}>
      <Ionicons name={icon} size={14} color="#64748b" />
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ScanQRScreen({ navigation }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'token'
  const [processing, setProcessing] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState('error'); // 'error' | 'early' | 'expired' | 'wrong_property' | 'already_used'
  const [tokenInput, setTokenInput] = useState('');
  const [scanning, setScanning] = useState(true);
  const lastScannedRef = useRef(null);

  // Re-enable scanning after 3s on error
  useEffect(() => {
    if (!scanning && !bookingDetails) {
      const t = setTimeout(() => setScanning(true), 3000);
      return () => clearTimeout(t);
    }
  }, [scanning, bookingDetails]);

  const processQR = async (data) => {
    if (processing) return;
    setProcessing(true);
    setErrorMsg('');
    setBookingDetails(null);
    if (Platform.OS !== 'web') Vibration.vibrate(100);

    try {
      const res = await api.post('/bookings/scan-qr', { qrData: data });
      setBookingDetails(res.data?.booking || res.data);
      setScanning(false);
    } catch (err) {
      const resData = err.response?.data;
      setErrorType(resData?.errorType || 'error');
      setErrorMsg(resData?.message || 'Invalid or unknown QR code.');
      setScanning(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleScan = ({ data }) => {
    if (!scanning || processing) return;
    if (data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    setScanning(false);
    processQR(data);
  };

  const verifyToken = async () => {
    if (!tokenInput.trim()) return;
    setProcessing(true);
    setErrorMsg('');
    setBookingDetails(null);
    try {
      const res = await api.post('/bookings/checkin-token', { token: tokenInput.trim().toUpperCase() });
      const booking = res.data?.booking || res.data;
      setBookingDetails(booking);
    } catch (err) {
      const resData = err.response?.data;
      setErrorType(resData?.errorType || 'error');
      setErrorMsg(resData?.message || 'Invalid token. Please check and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAnother = () => {
    setBookingDetails(null);
    setErrorMsg('');
    setErrorType('error');
    setTokenInput('');
    setScanning(true);
    lastScannedRef.current = null;
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (bookingDetails) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <BookingResultCard booking={bookingDetails} onScanAnother={handleScanAnother} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Camera scan (native only) ───────────────────────────────────────────────
  const renderCamera = () => {
    if (Platform.OS === 'web') {
      return <WebCameraScanner onScan={processQR} scanning={scanning} processing={processing} />;
    }

    // Native camera
    try {
      const { CameraView, useCameraPermissions } = require('expo-camera');
      return <NativeCameraScanner onScan={handleScan} scanning={scanning} processing={processing} />;
    } catch (e) {
      return (
        <View style={styles.webCameraFallback}>
          <Ionicons name="camera-outline" size={48} color="#94a3b8" />
          <Text style={styles.webCameraText}>Camera unavailable.</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Mode tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'camera' && styles.tabActive]}
              onPress={() => { setMode('camera'); handleScanAnother(); }}
            >
              <Ionicons name="qr-code-outline" size={16} color={mode === 'camera' ? '#fff' : '#64748b'} />
              <Text style={[styles.tabText, mode === 'camera' && styles.tabTextActive]}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'token' && styles.tabActive]}
              onPress={() => setMode('token')}
            >
              <Ionicons name="keypad-outline" size={16} color={mode === 'token' ? '#fff' : '#64748b'} />
              <Text style={[styles.tabText, mode === 'token' && styles.tabTextActive]}>Enter Token</Text>
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {errorMsg ? (
            <View style={[
              styles.errorBanner,
              errorType === 'too_early'      && styles.earlyBanner,
              errorType === 'expired'        && styles.expiredBanner,
              errorType === 'wrong_property' && styles.wrongPropBanner,
              errorType === 'already_used'   && styles.usedBanner,
            ]}>
              <Ionicons
                name={
                  errorType === 'too_early'      ? 'time-outline' :
                  errorType === 'expired'        ? 'calendar-outline' :
                  errorType === 'wrong_property' ? 'location-outline' :
                  errorType === 'already_used'   ? 'checkmark-done-outline' :
                  'close-circle-outline'
                }
                size={20}
                color={
                  errorType === 'too_early'      ? '#a16207' :
                  errorType === 'expired'        ? '#7c3aed' :
                  errorType === 'wrong_property' ? '#0891b2' :
                  errorType === 'already_used'   ? '#16a34a' :
                  '#dc2626'
                }
              />
              <Text style={[
                styles.errorText,
                errorType === 'too_early'      && { color: '#a16207' },
                errorType === 'expired'        && { color: '#7c3aed' },
                errorType === 'wrong_property' && { color: '#0891b2' },
                errorType === 'already_used'   && { color: '#16a34a' },
              ]}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* Camera mode */}
          {mode === 'camera' && (
            <View style={styles.cameraSection}>
              {renderCamera()}
              <Text style={styles.cameraHint}>
                Align the booking QR code within the frame
              </Text>
            </View>
          )}

          {/* Token mode */}
          {mode === 'token' && (
            <View style={styles.tokenSection}>
              <Text style={styles.tokenLabel}>Enter 6-character booking token</Text>
              <TextInput
                style={styles.tokenInput}
                value={tokenInput}
                onChangeText={v => setTokenInput(v.toUpperCase())}
                placeholder="e.g. AB12CD"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.verifyBtn, (!tokenInput.trim() || processing) && { opacity: 0.6 }]}
                onPress={verifyToken}
                disabled={!tokenInput.trim() || processing}
              >
                {processing
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.verifyBtnText}>Verify Token</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Quick nav */}
          <View style={styles.quickNav}>
            <QuickNavBtn icon="calendar-outline" label="Upcoming" onPress={() => navigation.navigate('UpcomingBookings')} />
            <QuickNavBtn icon="time-outline" label="Current" onPress={() => navigation.navigate('CurrentBookings')} />
            <QuickNavBtn icon="list-outline" label="Entry Log" onPress={() => navigation.navigate('EntryLog')} />
            <QuickNavBtn icon="person-outline" label="Profile" onPress={() => navigation.navigate('Profile')} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Web Camera Scanner (uses @zxing/browser) ─────────────────────────────────
function WebCameraScanner({ onScan, scanning, processing }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [camError, setCamError] = useState('');
  const [permissionState, setPermissionState] = useState('idle'); // idle | requesting | granted | denied

  const startScanner = async () => {
    setPermissionState('requesting');
    setCamError('');
    let stopped = false;

    try {
      // First explicitly request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      setPermissionState('granted');

      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (stopped || !videoRef.current) return;

      const deviceId = devices.length > 0 ? devices[0].deviceId : undefined;
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (stopped) return;
          if (result) onScan(result.getText());
        }
      );
      if (stopped) { try { controls.stop(); } catch (e) {} return; }
      controlsRef.current = controls;
    } catch (e) {
      if (!stopped) {
        setPermissionState('denied');
        if (e.name === 'NotAllowedError') {
          setCamError('Camera permission denied. Click "Allow" in your browser when prompted, or use token entry.');
        } else if (e.name === 'NotFoundError') {
          setCamError('No camera found on this device. Use token entry instead.');
        } else {
          setCamError('Camera unavailable: ' + e.message);
        }
      }
    }

    return () => { stopped = true; };
  };

  useEffect(() => {
    if (!scanning) return;
    // Auto-start on mount
    startScanner();
    return () => {
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch (e) {}
        controlsRef.current = null;
      }
    };
  }, [scanning]);

  // Show permission request UI
  if (permissionState === 'idle' || permissionState === 'denied') {
    return (
      <View style={styles.webCameraFallback}>
        <Ionicons name="camera-outline" size={48} color="#94a3b8" />
        {camError ? (
          <Text style={styles.webCameraText}>{camError}</Text>
        ) : (
          <Text style={styles.webCameraText}>Camera access needed to scan QR codes</Text>
        )}
        <TouchableOpacity style={styles.allowCameraBtn} onPress={startScanner}>
          <Ionicons name="camera" size={16} color="#fff" />
          <Text style={styles.allowCameraBtnText}>
            {permissionState === 'denied' ? 'Try Again' : 'Allow Camera'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.webCameraSubText}>
          Or use the "Enter Token" tab instead
        </Text>
      </View>
    );
  }

  if (permissionState === 'requesting') {
    return (
      <View style={styles.webCameraFallback}>
        <ActivityIndicator color="#1d4ed8" size="large" />
        <Text style={styles.webCameraText}>Requesting camera access...</Text>
        <Text style={styles.webCameraSubText}>
          Please click "Allow" in the browser popup
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraFrame}>
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        muted
        playsInline
      />
      {/* Corner markers */}
      <View style={[styles.corner, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }]} />
      <View style={[styles.corner, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
      <View style={[styles.corner, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }]} />
      <View style={[styles.corner, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }]} />
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Verifying...</Text>
        </View>
      )}
    </View>
  );
}

// ── Native Camera Scanner ─────────────────────────────────────────────────────
function NativeCameraScanner({ onScan, scanning, processing }) {
  const { CameraView, useCameraPermissions } = require('expo-camera');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Ionicons name="camera-outline" size={48} color="#94a3b8" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraFrame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? onScan : undefined}
      />
      {/* Corner markers */}
      <View style={[styles.corner, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }]} />
      <View style={[styles.corner, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
      <View style={[styles.corner, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }]} />
      <View style={[styles.corner, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }]} />
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Verifying...</Text>
        </View>
      )}
    </View>
  );
}

function QuickNavBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickNavBtn} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#1d4ed8" />
      <Text style={styles.quickNavLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },

  tabs: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: '#1d4ed8' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fee2e2', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  earlyBanner:     { backgroundColor: '#fef9c3', borderColor: '#fde047' },
  expiredBanner:   { backgroundColor: '#f5f3ff', borderColor: '#c4b5fd' },
  wrongPropBanner: { backgroundColor: '#ecfeff', borderColor: '#a5f3fc' },
  usedBanner:      { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', fontWeight: '500' },
  earlyText: { color: '#a16207' },

  cameraSection: { marginBottom: 16 },
  cameraFrame: {
    width: '100%', height: 280, borderRadius: 16,
    overflow: 'hidden', backgroundColor: '#000', position: 'relative',
  },
  corner: {
    position: 'absolute', width: 28, height: 28,
    borderColor: '#1d4ed8', borderWidth: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  processingText: { color: '#fff', fontWeight: '600' },
  cameraHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 },

  webCameraFallback: {
    height: 220, backgroundColor: '#f1f5f9', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed',
    padding: 20,
  },
  webCameraText: { fontSize: 13, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  webCameraSubText: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  allowCameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1d4ed8', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  allowCameraBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  permissionBox: {
    height: 200, backgroundColor: '#f1f5f9', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  permissionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  permissionBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  permissionBtnText: { color: '#fff', fontWeight: '700' },

  tokenSection: { marginBottom: 16 },
  tokenLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  tokenInput: {
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#1d4ed8',
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 28, fontWeight: '800', color: '#1e293b',
    textAlign: 'center', letterSpacing: 8, marginBottom: 12,
  },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 14,
  },
  verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  quickNav: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  quickNavBtn: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  quickNavLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },

  // Result card
  resultCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  successBadge: { alignItems: 'center', marginBottom: 20, gap: 6 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  successSub: { fontSize: 13, color: '#64748b' },
  resultDetails: { gap: 12, marginBottom: 20 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultLabel: { fontSize: 13, color: '#64748b', width: 72 },
  resultValue: { fontSize: 13, fontWeight: '700', color: '#1e293b', flex: 1 },
  scanAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 8,
  },
  scanAnotherText: { color: '#1d4ed8', fontWeight: '700', fontSize: 14 },
  exitSessionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 14,
    marginBottom: 10,
  },
  exitSessionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
