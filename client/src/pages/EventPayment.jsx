import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
<<<<<<< Updated upstream
import { ArrowLeft, Lock, Download, CheckCircle, Calendar, Clock, MapPin, Ticket } from 'lucide-react';
=======
import { ArrowLeft, CreditCard, Lock, Download, CheckCircle, Calendar, Clock, MapPin, Ticket, AlertTriangle } from 'lucide-react';
>>>>>>> Stashed changes
import QRCode from 'qrcode';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const fmt = (n) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Downloadable Ticket ──────────────────────────────────────────────────────
function TicketCard({ event, bookingData, ticketId, user }) {
  const cardRef = useRef(null);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const payload = JSON.stringify({ ticketId, eventId: event._id, seats: bookingData.seats.map(s => s.seatId) });
    QRCode.toDataURL(payload, { width: 140, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrUrl).catch(console.error);
  }, [ticketId]);

  const allSeats = bookingData.seats.map(s => s.seatId).join(', ');
  const serviceCharge = bookingData.totalAmount * 0.05;
  const grandTotal = bookingData.totalAmount + serviceCharge;

  const downloadTicket = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
      const link = document.createElement('a');
      link.download = `ticket-${ticketId?.slice(-8) || 'event'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) { alert('Download failed. Please try again.'); }
  };

  return (
    <div className="space-y-4">
      {/* Ticket card */}
      <div ref={cardRef} style={{ backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '480px', margin: '0 auto' }}>
        {/* Header banner */}
        <div style={{ background: 'linear-gradient(135deg, #0d1b2e 0%, #1a3a5c 100%)', padding: '20px 24px', position: 'relative' }}>
          {event.bannerImage && (
            <img src={event.bannerImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} crossOrigin="anonymous" />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: '#93c5fd', fontSize: '11px', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>EventHub · E-Ticket</p>
            <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', margin: 0, lineHeight: 1.2 }}>{event.name}</h2>
            <p style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '6px' }}>
              {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {event.time ? ` · ${event.time}` : ''}
            </p>
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ borderTop: '2px dashed #e2e8f0', margin: '0 24px' }} />

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* Left details */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              {[
                { label: 'Venue', value: event.location || '—' },
                { label: 'Organizer', value: event.organizerName || '—' },
                { label: 'Seats', value: allSeats || '—' },
                { label: 'Ticket ID', value: `#${(ticketId || '').slice(-8).toUpperCase()}` },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{item.label}</p>
                  <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600', margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              {Object.entries(bookingData.summary).map(([cat, d]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#475569', fontSize: '12px' }}>{cat} × {d.seats.length}</span>
                  <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '600' }}>Rs. {fmt(d.seats.length * d.price)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '6px' }}>
                <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: '700' }}>Total Paid</span>
                <span style={{ color: '#1a3a5c', fontSize: '14px', fontWeight: '800' }}>Rs. {fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* QR code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {qrUrl
              ? <img src={qrUrl} alt="QR" style={{ width: '110px', height: '110px', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
              : <div style={{ width: '110px', height: '110px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>Loading…</div>
            }
            <p style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'center', margin: 0 }}>Scan at entry</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 24px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '10px', margin: 0 }}>This ticket is valid for one entry only · Non-transferable · sportek.eventhub.lk</p>
        </div>
      </div>

      {/* Download button */}
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <button onClick={downloadTicket}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a2e4a] hover:bg-[#243d60] text-white font-bold text-sm rounded-xl transition-colors">
          <Download className="w-4 h-4" /> Download Ticket as Image
        </button>
      </div>
    </div>
  );
}

// ─── Main Payment Page ────────────────────────────────────────────────────────
export default function EventPayment() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [event, setEvent] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState('');


<<<<<<< Updated upstream

  // We will pass these directly to the Elements provider now
=======
  // ── 15-minute payment hold timer ──
  const [holdSecsLeft, setHoldSecsLeft] = useState(null);
  const holdTimerRef = useRef(null);

  // On mount: read the shared expiry from sessionStorage (set by seat selection page)
  useEffect(() => {
    const raw = sessionStorage.getItem(`seat_hold_expires_${eventId}`);
    if (!raw) return;
    const expiresAt = parseInt(raw, 10);
    const secsLeft = Math.floor((expiresAt - Date.now()) / 1000);
    if (secsLeft <= 0) {
      // Already expired before the page even loaded
      sessionStorage.removeItem(`seat_hold_expires_${eventId}`);
      sessionStorage.removeItem(`event_seats_${eventId}`);
      api.post(`/seats/${eventId}/unlock`, {}).catch(() => {});
      navigate(`/events/${eventId}/seats`, { state: { expired: true } });
      return;
    }
    setHoldSecsLeft(secsLeft);
    holdTimerRef.current = setInterval(() => {
      setHoldSecsLeft(prev => {
        if (prev <= 1) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current); };
  }, [eventId]);

  // When payment timer hits 0, unlock seats and redirect
  useEffect(() => {
    if (holdSecsLeft !== 0) return;
    sessionStorage.removeItem(`seat_hold_expires_${eventId}`);
    sessionStorage.removeItem(`event_seats_${eventId}`);
    api.post(`/seats/${eventId}/unlock`, {}).catch(() => {});
    navigate(`/events/${eventId}/seats`, { state: { expired: true } });
  }, [holdSecsLeft, eventId, navigate]);

>>>>>>> Stashed changes
  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const stored = sessionStorage.getItem(`event_seats_${eventId}`);
    if (!stored) { navigate(`/events/${eventId}/seats`); return; }
    const data = JSON.parse(stored);
    setBookingData(data);
    api.get(`/events/${eventId}`)
      .then(r => setEvent(r.data))
      .catch(() => navigate(`/events/${eventId}`))
      .finally(() => setLoading(false));
  }, [eventId, isAuthenticated]);

  const serviceCharge = bookingData ? bookingData.totalAmount * 0.05 : 0;
  const grandTotal = bookingData ? bookingData.totalAmount + serviceCharge : 0;

<<<<<<< Updated upstream
  const handlePaySuccess = (newTicketId) => {
    setTicketId(newTicketId);
    sessionStorage.removeItem(`event_seats_${eventId}`);
    setSuccess(true);
=======
  const handlePay = async (e) => {
    e.preventDefault();
    if (!cardName.trim()) { setError('Please enter cardholder name.'); return; }
    setError('');
    setProcessing(true);
    try {
      const allSeats = bookingData.seats;
      const firstCat = allSeats[0]?.category;
      // Step 1: create ticket (pending)
      const res = await api.post('/tickets/purchase', {
        eventId,
        category: firstCat,
        tier: firstCat,
        seats: allSeats,
      });
      const newTicketId = res.data.ticketId;

      // Step 2: confirm payment (marks as paid + syncs soldQuantity)
      await api.patch(`/tickets/${newTicketId}/confirm-payment`);

      setTicketId(newTicketId);
      sessionStorage.removeItem(`event_seats_${eventId}`);
      sessionStorage.removeItem(`seat_hold_expires_${eventId}`);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
>>>>>>> Stashed changes
  };

  if (loading) return (
    <div className="min-h-screen bg-[#eef2f7] flex items-center justify-center">
      <div className="text-center"><LoadingSpinner /><p className="text-slate-500 text-sm mt-3">Loading…</p></div>
    </div>
  );

  if (!event || !bookingData) return null;

  // ── Success screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2e]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/events" className="text-white font-bold text-xl">EventHub</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-slate-300 hover:text-white text-sm">Home</Link>
              <Link to="/events" className="text-white text-sm font-medium">Events</Link>
              <a href="#" className="text-slate-300 hover:text-white text-sm">Contact Us</a>
            </div>
            <Link to="/dashboard" className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700">Dashboard</Link>
          </div>
        </nav>

        <div className="pt-24 pb-16 px-4">
          <div className="max-w-xl mx-auto">
            {/* Success banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-emerald-900">Booking Confirmed!</p>
                <p className="text-emerald-700 text-sm">Your ticket is ready. Download it below.</p>
              </div>
            </div>

            <TicketCard event={event} bookingData={bookingData} ticketId={ticketId} user={user} />

            <div className="mt-4 text-center">
              <Link to="/events" className="text-sm text-blue-600 hover:underline">← Back to Events</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment form ──
  return (
    <div className="min-h-screen bg-[#eef2f7]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2e]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/events" className="text-white font-bold text-xl">EventHub</Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-300 hover:text-white text-sm">Home</Link>
            <Link to="/events" className="text-white text-sm font-medium">Events</Link>
            <a href="#" className="text-slate-300 hover:text-white text-sm">Contact Us</a>
          </div>
          {!isAuthenticated ? (
            <div className="flex gap-3">
              <Link to="/login" className="text-slate-300 hover:text-white text-sm">Login</Link>
              <Link to="/register" className="px-4 py-1.5 text-sm font-semibold border border-white/40 text-white rounded-full hover:bg-white/10">Register</Link>
            </div>
          ) : (
            <Link to="/dashboard" className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700">Dashboard</Link>
          )}
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back */}
          <button onClick={() => navigate(`/events/${eventId}/seats`)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Ticket Selection
          </button>

          {/* ── 15-minute payment countdown banner ── */}
          {holdSecsLeft !== null && (() => {
            const mins = Math.floor(holdSecsLeft / 60);
            const secs = holdSecsLeft % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            const isUrgent  = holdSecsLeft <= 120; // last 2 minutes
            return (
              <div className={`mb-6 rounded-2xl border-2 px-5 py-3 flex items-center justify-between gap-4 ${
                isUrgent
                  ? 'bg-orange-50 border-orange-400 animate-pulse'
                  : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-center gap-3">
                  {isUrgent
                    ? <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-500" />
                    : <Clock className="w-5 h-5 flex-shrink-0 text-amber-500" />
                  }
                  <div>
                    <p className={`font-bold text-sm ${
                      isUrgent ? 'text-orange-700' : 'text-amber-800'
                    }`}>
                      {isUrgent
                        ? 'Hurry! Complete payment before your seats are released.'
                        : 'Complete your payment within 15 minutes to confirm your seats'
                      }
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      isUrgent ? 'text-orange-500' : 'text-amber-600'
                    }`}>
                      Your selected seats are held exclusively for you until the timer runs out.
                    </p>
                  </div>
                </div>
                <div className={`text-2xl font-black font-mono flex-shrink-0 ${
                  isUrgent ? 'text-orange-600' : 'text-amber-600'
                }`}>
                  {timeStr}
                </div>
              </div>
            );
          })()}

          <h1 className="text-3xl font-bold text-slate-900 mb-6">Payment</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Booking Summary ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <h2 className="font-bold text-slate-900 text-lg">Booking Summary</h2>

              <div>
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Event</p>
                <p className="font-bold text-slate-900 text-base">{event.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-slate-800 text-sm font-medium">{new Date(event.date).toISOString().split('T')[0]}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-slate-800 text-sm font-medium">{event.time || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Venue</p>
                <p className="text-slate-800 text-sm font-medium">{event.location || '—'}</p>
              </div>

              <div className="border-t pt-4 space-y-2">
                {Object.entries(bookingData.summary).map(([cat, d]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-800">{cat} × {d.seats.length}</span>
                      <span className="font-semibold text-slate-800">Rs. {fmt(d.seats.length * d.price)}</span>
                    </div>
                    <p className="text-xs text-blue-500 mt-0.5">Seats: {d.seats.join(', ')}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>Rs. {fmt(bookingData.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Service Charge (5%)</span>
                  <span>Rs. {fmt(serviceCharge)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-600 text-base pt-1 border-t">
                  <span>Total</span>
                  <span>Rs. {fmt(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* ── Right: Payment Details ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2 mb-5">
                <Lock className="w-5 h-5 text-blue-500" /> Payment Details
              </h2>

              <Elements stripe={stripePromise}>
                <PaymentForm
                  eventId={eventId}
                  bookingData={bookingData}
                  grandTotal={grandTotal}
                  onSuccess={handlePaySuccess}
                />
              </Elements>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentForm({ eventId, bookingData, grandTotal, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    try {
      const allSeats = bookingData.seats;
      const firstCat = allSeats[0]?.category;

      // Step 1: Create Ticket & PaymentIntent
      const res = await api.post('/tickets/purchase', {
        eventId,
        category: firstCat,
        tier: firstCat,
        seats: allSeats,
      });
      const { ticketId, clientSecret } = res.data;

      // Step 2: Confirm Card Payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) }
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
      } else if (paymentIntent.status === 'succeeded') {
        // Step 3: Tell backend payment is confirmed
        await api.patch(`/tickets/${ticketId}/confirm-payment`);
        onSuccess(ticketId);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Card Details</label>
        <div className="border border-slate-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <CardElement options={{
            style: {
              base: { fontSize: '15px', color: '#1e293b', '::placeholder': { color: '#94a3b8' } },
              invalid: { color: '#ef4444' }
            }
          }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">Test card: 4242 4242 4242 4242 · Any future date · Any CVC</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Lock className="w-3.5 h-3.5" /> Your payment info is secure and encrypted
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
      )}

      <button type="submit" disabled={!stripe || processing}
        className="w-full py-3.5 bg-[#1a2e4a] hover:bg-[#243d60] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
        <Lock className="w-4 h-4" />
        {processing ? 'Processing…' : `Pay Rs. ${fmt(grandTotal)} LKR`}
      </button>
    </form>
  );
}
