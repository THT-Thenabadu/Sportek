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

// Hold duration in seconds (5 minutes)
const HOLD_DURATION_SECS = 5 * 60;

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
  const [holdExpired, setHoldExpired] = useState(false);     // "Time expired" message flag

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

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [isProceeding, setIsProceeding] = useState(false);

  // ── Fetch property info ──
  useEffect(() => {
    api.get(`/properties/${propertyId}`).then(r => setProperty(r.data)).catch(console.error);
  }, [propertyId]);

  // ── Fetch available slots ──
  const fetchSlots = useCallback(() => {
    setLoadingSlots(true);
    const params = { date: selectedDate };
    if (user && user._id) params.userId = user._id;

    api.get(`/bookings/slots/${propertyId}`, { params })
      .then(r => {
        const fetchedSlots = r.data.slots ?? r.data;
        
        // Filter out past slots if the selected date is today
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        let filteredSlots = fetchedSlots;
        
        if (selectedDate === todayStr) {
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          filteredSlots = fetchedSlots.filter(sl => {
            const [h, m] = sl.start.split(':').map(Number);
            return h > currentHour || (h === currentHour && m > currentMin);
          });
        }

        setSlots(filteredSlots);

        // Rebuild slotLockInfo from any already-pending slots
        const lockMap = {};
        filteredSlots.forEach(sl => {
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
  }, [propertyId, selectedDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Global per-second tick for rendering slot countdowns ──
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Socket.io ──
  useEffect(() => {
    const s = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000');
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

    // Server confirms OUR lock succeeded — start the personal checkout timer (5 minutes)
    s.on('lock_success', ({ expiresAt, bookingId: heldBookingId }) => {
      const secsLeft = Math.round((new Date(expiresAt) - Date.now()) / 1000);
      setTimeLeft(secsLeft);
      setLockedByMe(true);
      setHoldExpired(false);
      setIsProceeding(false);
      if (heldBookingId) setBookingId(heldBookingId);
    });

    // Server tells us our lock was rejected (slot already taken by someone else)
    s.on('lock_error', ({ message }) => {
      alert(message);
      setSelectedSlot(null);
      setIsProceeding(false);
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
      // Timer expired — clear user's local selection and show "Time expired"
      setLockedByMe(false);
      setSelectedSlot(null);
      setClientSecret('');
      setBookingId('');
      setHoldExpired(true);
      fetchSlots();
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedByMe, timeLeft, fetchSlots]);

  // ── Select a slot ──
  const handleSelectSlot = (slot) => {
    if (slot.state !== 'Available') return;
    if (!user) {
      alert('Please log in to book a slot.');
      navigate('/login');
      return;
    }
    if (!socket) return;

    // Clear any previous expired state
    setHoldExpired(false);
    setIsProceeding(false);

    // Just select locally first, don't lock yet
    setSelectedSlot(slot);
  };

  // ── Lock the slot when proceeding to payment ──
  const handleProceedToPayment = () => {
    if (!user) {
      alert('Please log in to proceed.');
      navigate('/login');
      return;
    }
    if (!selectedSlot || !socket) return;

    setIsProceeding(true);
    socket.emit('lock_slot', {
      propertyId,
      date: selectedDate,
      timeSlotStart: selectedSlot.start,
      userId: user._id
    });
  };

  // ── Cancel held slot (explicit user action) ──
  const handleCancelHold = async () => {
    if (!selectedSlot) return;

    // Cancel via API (releases DB hold + in-memory lock)
    try {
      await api.post('/bookings/cancel-hold', {
        propertyId,
        date: selectedDate,
        timeSlotStart: selectedSlot.start
      });
    } catch (err) {
      console.error('Cancel hold error:', err);
    }

    // Also emit socket event for immediate UI update
    if (socket && user) {
      socket.emit('release_slot', {
        propertyId,
        date: selectedDate,
        timeSlotStart: selectedSlot.start,
        userId: user._id
      });
    }

    // Reset local state
    setLockedByMe(false);
    setSelectedSlot(null);
    setClientSecret('');
    setBookingId('');
    setTimeLeft(null);
    setIntentError('');
    fetchSlots();
  };

  // ── Create PaymentIntent once slot is locked ──
  useEffect(() => {
    if (!lockedByMe || !selectedSlot) return;
    // Skip if we already have a client secret
    if (clientSecret) return;
    setCreatingIntent(true);
    setIntentError('');
    api.post('/bookings/create-payment-intent', {
      propertyId,
      date: selectedDate,
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
  }, [lockedByMe, selectedSlot, propertyId, selectedDate, clientSecret]);

  // ── Payment success ──
  const handlePaySuccess = () => {
    setPaySuccess(true);
    setTimeout(() => navigate('/dashboard/bookings'), 2500);
  };

  const handleOnsiteBooking = async () => {
    try {
      await api.post('/bookings/create-onsite', {
        propertyId,
        date: selectedDate,
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

  const timerColor = timeLeft !== null && timeLeft <= 60
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

      {/* Hold Expired Banner */}
      {holdExpired && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-800">Time Expired</p>
            <p className="text-sm text-red-600">Your 5-minute hold has expired. The slot has been released back to availability. Please select a new slot.</p>
          </div>
          <button
            onClick={() => setHoldExpired(false)}
            className="ml-auto text-red-400 hover:text-red-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* ── Slot Picker ── */}
        <Card>
          <CardHeader>
            <CardTitle>Select a Time Slot</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent>
            {/* Date Selector */}
            <div className="mb-5">
              <p className="text-sm font-medium text-slate-700 mb-3">Select Date</p>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: user?.institute && property?.institute && user.institute.toLowerCase() === property.institute.toLowerCase() ? 7 : 4 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  const dateStr = date.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateStr;
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const month = date.toLocaleDateString('en-US', { month: 'short' });
                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedSlot(null);
                        setClientSecret('');
                        setBookingId('');
                        setLockedByMe(false);
                        setTimeLeft(null);
                        setHoldExpired(false);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300'
                      }`}
                    >
                      <span className="text-xs font-medium uppercase">{dayName}</span>
                      <span className="text-2xl font-bold my-0.5">{dayNum}</span>
                      <span className="text-xs">{month}</span>
                    </button>
                  );
                })}
              </div>
            </div>
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
                <p className="text-xs text-primary-600 mt-1">Slot held for you — complete payment within 5 minutes.</p>
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
                  <span className="font-medium">{selectedDate}</span>
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

              {/* Action: Proceed to Payment */}
              {!lockedByMe && !intentError && (
                <div className="mt-4">
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={isProceeding}
                    isLoading={isProceeding}
                    className="w-full h-12 text-base font-bold"
                  >
                    {isProceeding ? 'Holding Slot...' : 'Proceed to Payment'}
                  </Button>
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

              {/* Cancel Hold Button */}
              {lockedByMe && (
                <button
                  onClick={handleCancelHold}
                  className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all mt-2"
                >
                  Cancel & Release Slot
                </button>
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
