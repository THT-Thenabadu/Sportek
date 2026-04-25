import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import PageWrapper from '../components/ui/PageWrapper';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ─── Stripe Payment Form ────────────────────────────────────────────────
function CheckoutForm({ clientSecret, bookingId, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });

    if (error) {
      onError(error.message);
      setPaying(false);
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(bookingId);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Card Details</label>
        <div className="border border-slate-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-primary-500 transition-all">
          <CardElement options={{
            style: {
              base: { fontSize: '15px', color: '#1e293b', '::placeholder': { color: '#94a3b8' } },
              invalid: { color: '#ef4444' }
            }
          }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">Test card: 4242 4242 4242 4242 · Any future date · Any CVC</p>
      </div>
      <Button type="submit" disabled={!stripe || paying} isLoading={paying} className="w-full h-12 text-base font-bold">
        {paying ? 'Processing…' : 'Confirm & Pay'}
      </Button>
    </form>
  );
}

// ─── Main Booking Flow ───────────────────────────────────────────────────
function BookingFlowInner() {
  const { id: propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [property, setProperty] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);   // { start, end }
  const [timeLeft, setTimeLeft] = useState(null);            // seconds remaining
  const [lockedByMe, setLockedByMe] = useState(false);
  const [socket, setSocket] = useState(null);

  // Payment state
  const [clientSecret, setClientSecret] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [onsiteSuccess, setOnsiteSuccess] = useState(false);
  // Per-slot lock expiry info so ALL users can render countdown timers
  // Key: timeSlotStart, Value: expiresAt (Date string)
  const [slotLockInfo, setSlotLockInfo] = useState({});
  // Local tick counter to force re-render of timers every second
  const [tick, setTick] = useState(0);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // ── Fetch property info ──
  useEffect(() => {
    api.get(`/properties/${propertyId}`).then(r => setProperty(r.data)).catch(console.error);
  }, [propertyId]);

  // ── Fetch available slots ──
  const fetchSlots = useCallback(() => {
    setLoadingSlots(true);
    api.get(`/bookings/slots/${propertyId}`, { params: { date: today } })
      .then(r => {
        // API returns { date, propertyId, slots: [...] }
        const fetchedSlots = r.data.slots ?? r.data;
        setSlots(fetchedSlots);

        // Rebuild slotLockInfo from any already-pending slots so page-load shows countdowns
        const lockMap = {};
        fetchedSlots.forEach(sl => {
          if (sl.state === 'Pending' && sl.lockExpiresAt) {
            lockMap[sl.start] = sl.lockExpiresAt;
          }
        });
        setSlotLockInfo(lockMap);
        setLoadingSlots(false);
      })
      .catch(err => {
        console.error('Slot fetch error:', err);
        setLoadingSlots(false);
      });
  }, [propertyId, today]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Global per-second tick for rendering slot countdowns ──
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Socket.io ──
  useEffect(() => {
    const s = io('http://localhost:5000');
    setSocket(s);

    // Join the property room so we receive real-time updates
    s.emit('join_property_room', propertyId);

    // Server broadcasts to the WHOLE room when someone locks — update state for ALL users
    s.on('slot_locked', ({ timeSlotStart, expiresAt }) => {
      // Update slot state to Pending (visually yellow/blocked) for every connected user
      setSlots(prev => prev.map(sl =>
        sl.start === timeSlotStart ? { ...sl, state: 'Pending', lockExpiresAt: expiresAt } : sl
      ));
      // Store lock expiry so anyone viewing can render a countdown
      setSlotLockInfo(prev => ({ ...prev, [timeSlotStart]: expiresAt }));
    });

    // Server broadcasts when a lock expires or payment fails/is cancelled
    s.on('slot_released', ({ timeSlotStart }) => {
      setSlots(prev => prev.map(sl =>
        sl.start === timeSlotStart ? { ...sl, state: 'Available', lockExpiresAt: null } : sl
      ));
      setSlotLockInfo(prev => { const n = { ...prev }; delete n[timeSlotStart]; return n; });
    });

    // Server broadcasts when a booking is fully confirmed via Stripe payment
    s.on('slot_confirmed', ({ timeSlotStart }) => {
      setSlots(prev => prev.map(sl =>
        sl.start === timeSlotStart ? { ...sl, state: 'Booked', lockExpiresAt: null } : sl
      ));
      setSlotLockInfo(prev => { const n = { ...prev }; delete n[timeSlotStart]; return n; });
    });

    // Server confirms OUR lock succeeded — start the personal checkout timer
    s.on('lock_success', ({ expiresAt }) => {
      const secsLeft = Math.round((new Date(expiresAt) - Date.now()) / 1000);
      setTimeLeft(secsLeft);
      setLockedByMe(true);
    });

    // Server tells us our lock was rejected (slot already taken by someone else)
    s.on('lock_error', ({ message }) => {
      alert(message);
      setSelectedSlot(null);
      fetchSlots(); // re-fetch from server to get accurate state
    });

    return () => {
      s.emit('leave_property_room', propertyId);
      s.disconnect();
    };
  }, [propertyId, fetchSlots]);

  // ── Countdown timer ──
  useEffect(() => {
    if (!lockedByMe || timeLeft === null) return;
    if (timeLeft <= 0) {
      setLockedByMe(false);
      setSelectedSlot(null);
      setClientSecret('');
      setBookingId('');
      alert('Your 120-second slot hold has expired. Please select a slot again.');
      fetchSlots();
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedByMe, timeLeft, fetchSlots]);

  // ── Select & lock a slot ──
  const handleSelectSlot = (slot) => {
    if (slot.state !== 'Available') return;
    if (!socket || !user) return;

    // Emit correct event name that server listens for: 'lock_slot'
    socket.emit('lock_slot', {
      propertyId,
      date: today,
      timeSlotStart: slot.start,
      userId: user._id
    });
    setSelectedSlot(slot);
  };

  // ── Create PaymentIntent once slot is locked ──
  useEffect(() => {
    if (!lockedByMe || !selectedSlot) return;
    setCreatingIntent(true);
    setIntentError('');
    api.post('/bookings/create-payment-intent', {
      propertyId,
      date: today,
      timeSlotStart: selectedSlot.start,
      timeSlotEnd: selectedSlot.end,
    })
      .then(r => {
        setClientSecret(r.data.clientSecret);
        setBookingId(r.data.bookingId);
        setCreatingIntent(false);
      })
      .catch(err => {
        setIntentError(err.response?.data?.message || 'Could not initiate payment. Please try again.');
        setCreatingIntent(false);
      });
  }, [lockedByMe, selectedSlot, propertyId, today]);

  // ── Payment success ──
  const handlePaySuccess = () => {
    setPaySuccess(true);
    setTimeout(() => navigate('/dashboard/bookings'), 2500);
  };

  const handleOnsiteBooking = async () => {
    try {
      await api.post('/bookings/create-onsite', {
        propertyId,
        date: today,
        timeSlotStart: selectedSlot.start,
        timeSlotEnd: selectedSlot.end,
      });
      setOnsiteSuccess(true);
      setTimeout(() => navigate('/dashboard/bookings'), 2500);
    } catch (err) {
      setIntentError(err.response?.data?.message || 'Failed to create on-site booking');
    }
  };

  const handlePayError = (msg) => setIntentError(msg);

  const fmtTime = (secs) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timerColor = timeLeft !== null && timeLeft <= 30
    ? 'text-red-500 animate-pulse'
    : 'text-amber-500';

  // ── Render ──
  if (paySuccess) {
    return (
      <PageWrapper className="max-w-lg text-center py-20">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Booking Confirmed!</h1>
        <p className="text-slate-500 mt-2">Your QR code has been generated. Redirecting to your dashboard…</p>
      </PageWrapper>
    );
  }

  if (onsiteSuccess) {
    return (
      <PageWrapper className="max-w-lg text-center py-20">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Booking Reserved!</h1>
        <p className="text-slate-500 mt-2">Please pay the security officer when you arrive. Your QR code is ready in My Bookings.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Secure Your Booking</h1>
        {property && (
          <p className="text-slate-500 mt-1">{property.name} · {property.location?.address}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* ── Slot Picker ── */}
        <Card>
          <CardHeader>
            <CardTitle>Select a Time Slot — Today</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No slots available for today.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {slots.map((s, i) => {
                  const isSelected = selectedSlot?.start === s.start;
                  const isBooked = s.state === 'Booked';
                  const isPending = s.state === 'Pending';

                  // Calculate remaining seconds for Pending slots (shown to ALL users)
                  let pendingSecsLeft = null;
                  if (isPending && slotLockInfo[s.start]) {
                    pendingSecsLeft = Math.max(0, Math.round((new Date(slotLockInfo[s.start]) - Date.now()) / 1000));
                  }

                  let cls = 'p-3 rounded-lg border text-center font-medium text-sm transition-all ';
                  if (isSelected)       cls += 'bg-primary-600 text-white border-primary-600 ring-2 ring-primary-300';
                  else if (isBooked)    cls += 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed';
                  else if (isPending)   cls += 'bg-yellow-50 text-yellow-700 border-yellow-300 cursor-not-allowed';
                  else                  cls += 'bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-200 cursor-pointer';

                  return (
                    <div key={i} className={cls} onClick={() => handleSelectSlot(s)}>
                      <div>{s.start} – {s.end}</div>
                      {isBooked  && <div className="text-xs mt-0.5 opacity-70">Booked</div>}
                      {isPending && (
                        <div className="text-xs mt-0.5 font-semibold">
                          {pendingSecsLeft !== null
                            ? `Held · ${Math.floor(pendingSecsLeft / 60)}:${String(pendingSecsLeft % 60).padStart(2, '0')}`
                            : 'Held'
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Checkout Panel ── */}
        {selectedSlot && (
          <Card className="border-primary-100">
            <CardHeader className="bg-primary-50 rounded-t-lg border-b border-primary-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-primary-800">Checkout</CardTitle>
                {lockedByMe && timeLeft !== null && (
                  <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColor}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {fmtTime(timeLeft)}
                  </div>
                )}
              </div>
              {lockedByMe && (
                <p className="text-xs text-primary-600 mt-1">Slot reserved for you. Complete payment before time runs out.</p>
              )}
              {lockedByMe && (
                <div className="flex gap-3 p-1 bg-slate-100 rounded-lg mt-4">
                  <button
                    onClick={() => setPaymentMethod('online')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      paymentMethod === 'online'
                        ? 'bg-white shadow text-primary-700'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    💳 Pay Online
                  </button>
                  <button
                    onClick={() => setPaymentMethod('onsite')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      paymentMethod === 'onsite'
                        ? 'bg-white shadow text-primary-700'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🏢 Pay On-Site
                  </button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Facility</span>
                  <span className="font-medium">{property?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium">{today}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Slot</span>
                  <span className="font-medium">{selectedSlot.start} – {selectedSlot.end}</span>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary-600">${property?.pricePerHour?.toFixed(2)}</span>
              </div>

              {/* Waiting for lock */}
              {!lockedByMe && !intentError && (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
                  Locking your slot…
                </div>
              )}

              {/* Error */}
              {intentError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{intentError}</div>
              )}

              {/* Creating payment intent */}
              {lockedByMe && creatingIntent && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
                  Preparing payment…
                </div>
              )}

              {/* Stripe Card Form */}
              {lockedByMe && clientSecret && !creatingIntent && paymentMethod === 'online' && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    clientSecret={clientSecret}
                    bookingId={bookingId}
                    onSuccess={handlePaySuccess}
                    onError={handlePayError}
                  />
                </Elements>
              )}

              {/* On-site Payment Confirmation */}
              {lockedByMe && paymentMethod === 'onsite' && !onsiteSuccess && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Your slot will be reserved. Please pay the security officer when you arrive at the venue.
                  </div>
                  <Button onClick={handleOnsiteBooking} className="w-full h-12 text-base font-bold">
                    Confirm On-Site Booking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

export default function BookingFlow() {
  return <BookingFlowInner />;
}
