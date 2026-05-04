import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import { useAuth } from '../../store/useAuthStore';

// ── Helpers ──────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Build next 7 days for date picker
const buildDays = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    });
  }
  return days;
};

const DAYS = buildDays();

// Slot state config
const SLOT_CONFIG = {
  Available: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', label: '' },
  Pending:   { bg: '#fef9c3', border: '#fde047', text: '#a16207', label: 'Held' },
  Booked:    { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', label: 'Booked' },
  Blocked:   { bg: '#f1f5f9', border: '#cbd5e1', text: '#94a3b8', label: 'Blocked' },
};

// ── Countdown badge ───────────────────────────────────────────────────────────
function CountdownBadge({ expiresAt }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  if (secs <= 0) return null;
  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <Text style={styles.countdownText}>{m}:{pad(s)}</Text>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BookingFlowScreen({ route, navigation }) {
  const { facility } = route?.params || {};
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [lockedByMe, setLockedByMe] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);   // seconds for MY lock countdown
  const [slotLockInfo, setSlotLockInfo] = useState({});
  const [step, setStep] = useState(1);              // 1 = pick slot, 2 = confirm
  const [booking, setBooking] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const lockedDateRef = useRef(null);

  // ── Fetch slots ─────────────────────────────────────────────────────────────
  const fetchSlots = useCallback(() => {
    if (!facility?._id) return;
    setLoadingSlots(true);
    api.get(`/bookings/slots/${facility._id}`, { params: { date: selectedDate } })
      .then(r => {
        const fetched = r.data.slots ?? r.data;
        setSlots(fetched);
        const lockMap = {};
        fetched.forEach(sl => {
          if (sl.state === 'Pending' && sl.lockExpiresAt) lockMap[sl.start] = sl.lockExpiresAt;
        });
        setSlotLockInfo(lockMap);
      })
      .catch(err => console.log('Slot fetch error:', err.message))
      .finally(() => setLoadingSlots(false));
  }, [facility?._id, selectedDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Socket.io / polling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!facility?._id) return;

    let socketInstance = null;

    const setupSocket = async () => {
      try {
        // Dynamically import socket.io-client — works on native, may fail on web
        const { default: io } = await import('socket.io-client');
        const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
        const s = io(baseUrl, { transports: ['websocket'] });
        socketRef.current = s;

        s.emit('join_property_room', facility._id);

        s.on('slot_locked', ({ date, timeSlotStart, expiresAt }) => {
          if (date !== selectedDate) return;
          setSlots(prev => prev.map(sl =>
            sl.start === timeSlotStart ? { ...sl, state: 'Pending', lockExpiresAt: expiresAt } : sl
          ));
          setSlotLockInfo(prev => ({ ...prev, [timeSlotStart]: expiresAt }));
        });

        s.on('slot_released', ({ date, timeSlotStart }) => {
          if (date !== selectedDate) return;
          setSlots(prev => prev.map(sl =>
            sl.start === timeSlotStart ? { ...sl, state: 'Available', lockExpiresAt: null } : sl
          ));
          setSlotLockInfo(prev => { const n = { ...prev }; delete n[timeSlotStart]; return n; });
        });

        s.on('slot_confirmed', ({ date, timeSlotStart }) => {
          if (date && date !== selectedDate) return;
          setSlots(prev => prev.map(sl =>
            sl.start === timeSlotStart ? { ...sl, state: 'Booked', lockExpiresAt: null } : sl
          ));
          setSlotLockInfo(prev => { const n = { ...prev }; delete n[timeSlotStart]; return n; });
        });

        s.on('lock_success', ({ expiresAt }) => {
          const secsLeft = Math.round((new Date(expiresAt) - Date.now()) / 1000);
          setTimeLeft(secsLeft);
          setLockedByMe(true);
          lockedDateRef.current = selectedDate;
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                clearInterval(timerRef.current);
                setLockedByMe(false);
                setSelectedSlot(null);
                setStep(1);
                fetchSlots();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        });

        s.on('lock_error', ({ message }) => {
          const msg = message || 'This slot was just taken. Please choose another.';
          Platform.OS === 'web' ? alert(msg) : Alert.alert('Slot Unavailable', msg);
          setSelectedSlot(null);
          fetchSlots();
        });

        socketInstance = s;
      } catch (e) {
        // Socket.io not available (web) — fall back to polling every 10s
        console.log('Socket.io unavailable, using polling');
        const pollInterval = setInterval(() => fetchSlots(), 10000);
        socketInstance = { disconnect: () => clearInterval(pollInterval) };
      }
    };

    setupSocket();

    return () => {
      socketInstance?.disconnect?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facility?._id, selectedDate]);

  // ── Select a slot ───────────────────────────────────────────────────────────
  const handleSelectSlot = (slot) => {
    if (slot.state !== 'Available') return;
    setSelectedSlot(slot);
    lockedDateRef.current = selectedDate;
    // Emit lock via socket if available, otherwise just proceed
    if (socketRef.current?.emit) {
      socketRef.current.emit('lock_slot', {
        propertyId: facility._id,
        date: selectedDate,
        timeSlotStart: slot.start,
        userId: user._id,
      });
    } else {
      // No socket — set a manual 120s countdown and go to step 2
      setLockedByMe(true);
      setTimeLeft(120);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setLockedByMe(false);
            setSelectedSlot(null);
            setStep(1);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setStep(2);
  };

  // ── Confirm on-site booking ─────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setConfirming(true);
    try {
      const res = await api.post('/bookings/create-onsite', {
        propertyId: facility._id,
        date: lockedDateRef.current || selectedDate,
        timeSlotStart: selectedSlot.start,
        timeSlotEnd: selectedSlot.end,
      });
      setBooking(res.data);
      if (timerRef.current) clearInterval(timerRef.current);
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed. Please try again.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Booking Failed', msg);
    } finally {
      setConfirming(false);
    }
  };

  // ── Cancel slot selection ───────────────────────────────────────────────────
  const handleCancel = () => {
    setSelectedSlot(null);
    setLockedByMe(false);
    setTimeLeft(null);
    setStep(1);
    if (timerRef.current) clearInterval(timerRef.current);
    fetchSlots();
  };

  // ── Access guard ────────────────────────────────────────────────────────────
  if (user?.role !== 'customer') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={64} color="#94a3b8" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>Booking is only available for customers.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 3: Success ─────────────────────────────────────────────────────────
  if (step === 3 && booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSub}>Your slot has been reserved.</Text>

            <View style={styles.bookingDetails}>
              <DetailRow icon="business-outline" label="Facility" value={facility.name} />
              <DetailRow icon="calendar-outline" label="Date" value={lockedDateRef.current || selectedDate} />
              <DetailRow icon="time-outline" label="Time" value={`${selectedSlot.start} – ${selectedSlot.end}`} />
              <DetailRow icon="cash-outline" label="Payment" value={`LKR ${facility.pricePerHour} (On-site)`} />
              {booking.passkey && <DetailRow icon="key-outline" label="Passkey" value={booking.passkey} highlight />}
            </View>

            <Text style={styles.successNote}>
              Show your passkey to the security officer on arrival.
            </Text>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => navigation.navigate('Bookings')}
            >
              <Ionicons name="list-outline" size={18} color="#fff" />
              <Text style={styles.confirmBtnText}>View My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 2: Confirm slot ────────────────────────────────────────────────────
  if (step === 2 && selectedSlot) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Lock timer */}
          {timeLeft !== null && (
            <View style={styles.timerBanner}>
              <Ionicons name="timer-outline" size={18} color="#a16207" />
              <Text style={styles.timerText}>
                Slot held for{' '}
                <Text style={styles.timerBold}>
                  {Math.floor(timeLeft / 60)}:{pad(timeLeft % 60)}
                </Text>
              </Text>
            </View>
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.facilityName}>{facility.name}</Text>
            <DetailRow icon="calendar-outline" label="Date" value={selectedDate} />
            <DetailRow icon="time-outline" label="Time" value={`${selectedSlot.start} – ${selectedSlot.end}`} />
            <DetailRow icon="location-outline" label="Location"
              value={typeof facility.location === 'object' ? facility.location?.address : facility.location} />
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Amount Due (on arrival)</Text>
            <Text style={styles.priceAmount}>LKR {facility.pricePerHour}</Text>
            <View style={styles.paymentBadge}>
              <Ionicons name="cash-outline" size={14} color="#7c3aed" />
              <Text style={styles.paymentText}>Pay On-Site</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, confirming && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            {confirming
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel — Choose Different Slot</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 1: Pick slot ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Facility header */}
        <View style={styles.summaryCard}>
          <Text style={styles.facilityName}>{facility?.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>
              {typeof facility?.location === 'object' ? facility?.location?.address : facility?.location}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>LKR {facility?.pricePerHour} / slot</Text>
          </View>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePicker}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d.value}
              style={[styles.dayChip, selectedDate === d.value && styles.dayChipActive]}
              onPress={() => { setSelectedDate(d.value); setSelectedSlot(null); setStep(1); }}
            >
              <Text style={[styles.dayChipText, selectedDate === d.value && styles.dayChipTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slot legend */}
        <View style={styles.legend}>
          {[['Available', '#1d4ed8'], ['Held', '#a16207'], ['Booked', '#dc2626']].map(([l, c]) => (
            <View key={l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c }]} />
              <Text style={styles.legendText}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Slots */}
        <Text style={styles.sectionTitle}>Available Time Slots</Text>
        {loadingSlots ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginTop: 24 }} />
        ) : slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Ionicons name="time-outline" size={40} color="#cbd5e1" />
            <Text style={styles.noSlotsText}>No slots available for this date</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot, i) => {
              const cfg = SLOT_CONFIG[slot.state] || SLOT_CONFIG.Available;
              const isAvailable = slot.state === 'Available';
              const lockExpiry = slotLockInfo[slot.start];

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.slotBtn,
                    { backgroundColor: cfg.bg, borderColor: cfg.border },
                    !isAvailable && styles.slotBtnDisabled,
                  ]}
                  onPress={() => isAvailable && handleSelectSlot(slot)}
                  disabled={!isAvailable}
                  activeOpacity={isAvailable ? 0.7 : 1}
                >
                  <Text style={[styles.slotTime, { color: cfg.text }]}>
                    {slot.start}
                  </Text>
                  <Text style={[styles.slotEnd, { color: cfg.text + '99' }]}>
                    – {slot.end}
                  </Text>
                  {cfg.label ? (
                    <View style={[styles.slotStateBadge, { backgroundColor: cfg.border }]}>
                      <Text style={[styles.slotStateText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                  ) : null}
                  {slot.state === 'Pending' && lockExpiry && (
                    <CountdownBadge expiresAt={lockExpiry} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Detail Row helper ─────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, highlight }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={14} color="#64748b" />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: '#1d4ed8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  facilityName: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 13, color: '#64748b' },

  datePicker: { marginBottom: 16 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8,
  },
  dayChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  dayChipTextActive: { color: '#fff' },

  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#64748b' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10 },

  noSlots: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noSlotsText: { fontSize: 13, color: '#94a3b8' },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  slotBtn: {
    width: '47%', borderWidth: 1.5, borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 2,
  },
  slotBtnDisabled: { opacity: 0.7 },
  slotTime: { fontSize: 15, fontWeight: '800' },
  slotEnd: { fontSize: 11 },
  slotStateBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  slotStateText: { fontSize: 9, fontWeight: '700' },
  countdownText: { fontSize: 10, color: '#a16207', fontWeight: '700', marginTop: 2 },

  timerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef9c3', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#fde047',
  },
  timerText: { fontSize: 13, color: '#a16207' },
  timerBold: { fontWeight: '800' },

  priceCard: {
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center',
  },
  priceLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  priceAmount: { fontSize: 28, fontWeight: '800', color: '#1d4ed8', marginBottom: 8 },
  paymentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ede9fe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  paymentText: { fontSize: 12, fontWeight: '600', color: '#7c3aed' },

  confirmBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    marginBottom: 12,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  homeBtn: { alignItems: 'center', paddingVertical: 12 },
  homeBtnText: { fontSize: 14, color: '#94a3b8' },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailLabel: { fontSize: 13, color: '#64748b', width: 70 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1e293b', flex: 1 },
  detailHighlight: { color: '#1d4ed8', fontSize: 16, fontWeight: '800' },

  successCard: { alignItems: 'center', paddingVertical: 20 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  successSub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  bookingDetails: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  successNote: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },

  errorTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginTop: 16, marginBottom: 8 },
  errorText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  backBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
