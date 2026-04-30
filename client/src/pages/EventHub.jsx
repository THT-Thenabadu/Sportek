import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { Search, MapPin, Calendar, Clock, Ticket, X, ChevronRight } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ─── Stripe checkout form ─────────────────────────────────────────────────────
function CheckoutForm({ event, category, total, onCancel, onSuccess }) {
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
      // 1. Create Ticket & PaymentIntent
      const res = await api.post('/tickets/purchase', {
        eventId: event._id,
        category: category.name,
        tier: category.name,
      });
      const { ticketId, clientSecret } = res.data;

      // 2. Confirm Card Payment
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
      setErrorMsg(err.response?.data?.message || 'Payment failed.');
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
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} disabled={processing}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={processing || !stripe}
          className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {processing ? 'Processing…' : `Pay Rs. ${total}`}
        </button>
      </div>
    </form>
  );
}

// ─── Event type badge colours ─────────────────────────────────────────────────
const TYPE_COLORS = {
  music:  'bg-purple-100 text-purple-700',
  drama:  'bg-pink-100   text-pink-700',
  sport:  'bg-emerald-100 text-emerald-700',
  other:  'bg-slate-100  text-slate-600',
};

// ─── Single event card ────────────────────────────────────────────────────────
function EventCard({ event }) {
  const navigate = useNavigate();
  const isExpired = event.status === 'expired';
  const cats = event.ticketCategories || [];
  const minPrice = cats.length ? Math.min(...cats.map(c => c.price)) : null;

  return (
    <div
      onClick={() => navigate(`/events/${event._id}`)}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100 flex flex-col cursor-pointer ${isExpired ? 'opacity-60' : ''}`}
    >
      {/* Banner */}
      <div className="relative h-44 bg-slate-200 shrink-0">
        {event.bannerImage
          ? <img src={event.bannerImage} alt={event.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No Image</div>
        }
        <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
        {event.eventType && (
          <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TYPE_COLORS[event.eventType] || TYPE_COLORS.other}`}>
            {event.eventType}
          </span>
        )}
        {isExpired && (
          <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white">
            Expired
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-slate-900 text-lg leading-snug mb-2">{event.name}</h3>
        {event.description && (
          <p className="text-slate-500 text-sm line-clamp-2 mb-3">{event.description}</p>
        )}

        <div className="space-y-1.5 text-sm text-slate-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            {event.time && <span className="text-slate-400">· {event.time}</span>}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.organizerName && (
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">By {event.organizerName}</span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          {isExpired ? (
            <div className="w-full py-2.5 text-center text-sm font-semibold text-slate-400 bg-slate-100 rounded-xl">
              Event Ended
            </div>
          ) : cats.length > 0 ? (
            <div className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl text-center">
              {minPrice !== null ? `From Rs. ${minPrice}` : 'View Event'}
            </div>
          ) : (
            <div className="w-full py-2.5 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border">
              No tickets available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ticket purchase modal ────────────────────────────────────────────────────
function TicketModal({ event, onClose }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const cats = event.ticketCategories || [];

  const handleSelectCategory = async (cat) => {
    if (!user) { navigate('/login'); return; }
    setSelectedCat(cat);
    // Proceed directly to the CardElement form, no need to fetch clientSecret beforehand
  };

  const handleSuccess = () => {
    alert('Payment successful! Your ticket is in your dashboard.');
    window.location.href = '/dashboard/tickets';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{event.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date(event.date).toLocaleDateString()} · {event.location}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 ml-3 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!selectedCat ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 mb-3">Select a ticket category:</p>
              {cats.map((cat, i) => {
                const remaining = (cat.totalQuantity || 0) - (cat.soldQuantity || 0);
                const soldOut = remaining <= 0;
                return (
                  <button key={i} disabled={soldOut}
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                      soldOut
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                    }`}>
                    <div>
                      <p className="font-semibold text-slate-900">{cat.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {soldOut ? 'Sold Out' : `${remaining} remaining`}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-lg font-bold text-blue-600">Rs. {cat.price}</p>
                      {!soldOut && <ChevronRight className="w-4 h-4 text-slate-400 ml-auto mt-1" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { setSelectedCat(null); }}
                  className="text-sm text-blue-600 hover:underline">← Back</button>
                <span className="text-sm text-slate-500">
                  1× {selectedCat.name} — Rs. {selectedCat.price}
                </span>
              </div>
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  event={event}
                  category={selectedCat}
                  total={selectedCat.price} 
                  onCancel={onClose} 
                  onSuccess={handleSuccess} 
                />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main EventHub page ───────────────────────────────────────────────────────
export default function EventHub() {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeType, setActiveType] = useState('all');

  // Admin-configurable hero background image
  const DEFAULT_HERO = 'https://thumbs.dreamstime.com/b/concert-atmosphere-live-music-event-dark-energetic-vibe-vibrant-stage-lights-laser-beams-packed-crowd-audience-participation-381121402.jpg';
  const [heroBg, setHeroBg] = useState(DEFAULT_HERO);

  useEffect(() => {
    // Load hero image setting
    api.get('/settings/eventhub-hero')
      .then(r => { if (r.data.value) setHeroBg(r.data.value); })
      .catch(() => {}); // silently fall back to default
  }, []);

  useEffect(() => {
    api.get('/events')
      .then(r => setEvents(r.data.filter(e => e.status === 'live' || e.status === 'expired')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setActiveType('all');
  };

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.name.toLowerCase().includes(q) ||
      (e.location || '').toLowerCase().includes(q) ||
      (e.organizerName || '').toLowerCase().includes(q);
    const matchType = activeType === 'all' || e.eventType === activeType;
    return matchSearch && matchType;
  });

  const liveEvents    = filtered.filter(e => e.status === 'live');
  const expiredEvents = filtered.filter(e => e.status === 'expired');

  const EVENT_TYPES = ['all', 'music', 'drama', 'sport', 'other'];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2e]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/events" className="text-white font-bold text-xl tracking-tight">
            EventHub
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
            <Link to="/events" className="text-white text-sm font-medium">Events</Link>
            <a href="#contact" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Contact Us</a>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link to="/login"
                  className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register"
                  className="px-4 py-1.5 text-sm font-semibold bg-transparent border border-white/40 text-white rounded-full hover:bg-white/10 transition-colors">
                  Register
                </Link>
              </>
            ) : (
              <Link to="/dashboard"
                className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ height: '100vh' }} className="relative flex items-center justify-center overflow-hidden">
        {/* Background image — uses admin-configurable URL */}
        <img
          src={heroBg}
          alt="Event hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(13,27,46,0.60)' }} />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-[0.2em] mb-4">
            Discover Extraordinary Experiences
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
            Find Your Next<br />
            <span className="text-blue-300">Unforgettable Event</span>
          </h1>
          <p className="text-slate-300 text-base mb-10 max-w-xl mx-auto">
            Browse hundreds of events happening near you. From concerts to conferences, find the perfect experience.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch}
            className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 max-w-xl mx-auto shadow-xl">
            <Search className="w-5 h-5 text-slate-300 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Search events by name or venue..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
            />
            <button type="submit"
              className="ml-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-colors shrink-0">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ── Events section ── */}
      <section className="bg-slate-50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-10">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-[0.2em] mb-2">Explore</p>
            <h2 className="text-4xl font-bold text-slate-900">All Events</h2>
          </div>

          {/* Type filter pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {EVENT_TYPES.map(t => (
              <button key={t} onClick={() => setActiveType(t)}
                className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all border ${
                  activeType === t
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                }`}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>

          {/* Search result label */}
          {search && (
            <div className="flex items-center gap-3 mb-6">
              <p className="text-slate-600 text-sm">
                Showing results for <span className="font-semibold text-slate-900">"{search}"</span>
                {' '}— {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
              </p>
              <button onClick={() => { setSearch(''); setSearchInput(''); }}
                className="text-xs text-blue-600 hover:underline">Clear</button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">No events found.</p>
              {search && (
                <button onClick={() => { setSearch(''); setSearchInput(''); }}
                  className="mt-3 text-blue-600 text-sm hover:underline">Clear search</button>
              )}
            </div>
          ) : (
            <>
              {/* Live events */}
              {liveEvents.length > 0 && (
                <div className="mb-12">
                  {expiredEvents.length > 0 && (
                    <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
                      Upcoming & Live
                    </h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {liveEvents.map(e => (
                      <EventCard key={e._id} event={e} />
                    ))}
                  </div>
                </div>
              )}

              {/* Expired events */}
              {expiredEvents.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-500 mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 bg-slate-400 rounded-full inline-block" />
                    Past Events
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {expiredEvents.map(e => (
                      <EventCard key={e._id} event={e} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Contact section ── */}
      <section id="contact" className="bg-[#0d1b2e] text-white py-14 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-2">Contact Us</h3>
          <p className="text-slate-400 text-sm mb-6">Have questions about events or need support? Reach out to us.</p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-300">
            <span>📧 support@sportek.com</span>
            <span>📞 +94 11 234 5678</span>
            <span>📍 Colombo, Sri Lanka</span>
          </div>
          <p className="text-slate-600 text-xs mt-8">© {new Date().getFullYear()} Sportek EventHub. All rights reserved.</p>
        </div>
      </section>

      {/* no modal needed — cards navigate to /events/:id */}
    </div>
  );
}
