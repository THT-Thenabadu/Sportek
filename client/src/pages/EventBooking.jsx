import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft, CheckCircle, Ticket, Calendar, MapPin, Clock } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ clientSecret, ticketId, total, onCancel, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg('');

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) }
      });

      if (error) {
        setErrorMsg(error.message);
        setProcessing(false);
      } else if (paymentIntent?.status === 'succeeded') {
        await api.patch(`/tickets/${ticketId}/confirm-payment`);
        onSuccess();
      }
    } catch (err) {
      setErrorMsg('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Card Details</label>
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
      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={processing}
          className="flex-1 py-3 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium">
          Cancel
        </button>
        <button type="submit" disabled={processing || !stripe}
          className="flex-1 py-3 text-sm font-bold bg-[#1a2e4a] text-white rounded-xl hover:bg-[#243d60] disabled:opacity-50 transition-colors">
          {processing ? 'Processing…' : `Pay Rs. ${total}`}
        </button>
      </div>
    </form>
  );
}

export default function EventBooking() {
  const { id, catIndex } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const catIdx = parseInt(catIndex, 10);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    api.get(`/events/${id}`)
      .then(r => {
        setEvent(r.data);
        // Immediately initiate payment intent
        const cats = r.data.ticketCategories || [];
        const cat = cats[catIdx];
        if (!cat) { navigate(`/events/${id}`); return; }
        setPayLoading(true);
        return api.post('/tickets/purchase', {
          eventId: r.data._id,
          category: cat.name,
          tier: cat.name,
        });
      })
      .then(res => {
        if (res?.data?.clientSecret) {
          setClientSecret(res.data.clientSecret);
          setTicketId(res.data.ticketId);
        }
      })
      .catch(err => {
        alert(err.response?.data?.message || 'Could not initiate booking.');
        navigate(`/events/${id}`);
      })
      .finally(() => { setLoading(false); setPayLoading(false); });
  }, [id, catIdx, isAuthenticated]);

  if (loading || payLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-slate-500 text-sm mt-3">Preparing your booking…</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const cats = event.ticketCategories || [];
  const cat = cats[catIdx];
  if (!cat) return null;

  const deadline = event.bookingDeadline ? new Date(event.bookingDeadline) : null;

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your ticket for <span className="font-semibold text-slate-800">{event.name}</span> has been booked successfully.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 mb-6 space-y-1 text-left">
            <p><span className="font-semibold">Category:</span> {cat.name}</p>
            <p><span className="font-semibold">Price:</span> ${cat.price}</p>
            <p><span className="font-semibold">Date:</span> {new Date(event.date).toLocaleDateString()}</p>
          </div>
          <Link to="/dashboard/tickets"
            className="block w-full py-3 bg-[#1a2e4a] text-white rounded-xl font-bold text-sm hover:bg-[#243d60] transition-colors">
            View My Tickets
          </Link>
          <Link to="/events" className="block mt-3 text-sm text-blue-600 hover:underline">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2e]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/events" className="text-white font-bold text-xl tracking-tight">EventHub</Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-300 hover:text-white text-sm font-medium">Home</Link>
            <Link to="/events" className="text-white text-sm font-medium">Events</Link>
          </div>
          <Link to="/dashboard" className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Back */}
          <button onClick={() => navigate(`/events/${id}`)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </button>

          {/* Progress steps */}
          <div className="flex items-center gap-0 mb-8">
            {['Event Details', 'Payment', 'Confirmed'].map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-emerald-500 text-white' :
                    i === 1 ? 'bg-[#1a2e4a] text-white' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {i === 0 ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${i === 1 ? 'text-slate-900' : 'text-slate-400'}`}>{step}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-3 ${i === 0 ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Order summary */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="font-bold text-slate-900">Order Summary</h3>

                {event.bannerImage && (
                  <img src={event.bannerImage} alt={event.name}
                    className="w-full h-28 object-cover rounded-xl" />
                )}

                <div>
                  <p className="font-bold text-slate-900 text-base">{event.name}</p>
                  <div className="mt-2 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {event.time && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {event.time}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Category</span>
                    <span className="font-semibold text-slate-900">{cat.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Quantity</span>
                    <span className="font-semibold text-slate-900">1</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 mt-1">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-[#1a2e4a] text-base">${cat.price}</span>
                  </div>
                </div>

                {deadline && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Book before {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900 mb-4">Payment Details</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Test card: 4242 4242 4242 4242 · Any future date · Any CVC
                </p>
                {clientSecret ? (
                  <Elements stripe={stripePromise}>
                    <CheckoutForm
                      clientSecret={clientSecret}
                      ticketId={ticketId}
                      total={cat.price}
                      onCancel={() => navigate(`/events/${id}`)}
                      onSuccess={() => setSuccess(true)}
                    />
                  </Elements>
                ) : (
                  <div className="flex justify-center py-8"><LoadingSpinner /></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
