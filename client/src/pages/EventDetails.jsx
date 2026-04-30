import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft, CalendarX } from 'lucide-react';
// ─── Info card ────────────────────────────────────────────────────────────────
function InfoCard({ label, value }) {
  return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
      <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-slate-800 font-medium text-sm">{value || '—'}</p>
    </div>
  );
}

// ─── EventDetails page ────────────────────────────────────────────────────────
export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(r => setEvent(r.data))
      .catch(() => navigate('/events'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBookNow = async (cat) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (event.venueType === 'indoor' && event.venueId) {
      // Go to seat selection
      navigate(`/events/${id}/seats`);
    } else {
      // Outdoor — go directly to booking with category index
      const catIdx = cats.indexOf(cat);
      navigate(`/events/${id}/book/${catIdx}`);
    }
  };

  const handleSuccess = () => {
    alert('Payment successful! Your ticket is in your dashboard.');
    window.location.href = '/dashboard/tickets';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!event) return null;

  const cats = event.ticketCategories || [];
  const minPrice = cats.length ? Math.min(...cats.map(c => c.price)) : null;
  const isExpired = event.status === 'expired';
  const deadline = event.bookingDeadline ? new Date(event.bookingDeadline) : null;

  const TYPE_COLORS = {
    music: 'bg-purple-100 text-purple-700',
    drama: 'bg-pink-100 text-pink-700',
    sport: 'bg-emerald-100 text-emerald-700',
    other: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2e]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/events" className="text-white font-bold text-xl tracking-tight">EventHub</Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
            <Link to="/events" className="text-white text-sm font-medium">Events</Link>
            <a href="#" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Contact Us</a>
          </div>
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Login</Link>
                <Link to="/register" className="px-4 py-1.5 text-sm font-semibold border border-white/40 text-white rounded-full hover:bg-white/10 transition-colors">Register</Link>
              </>
            ) : (
              <Link to="/dashboard" className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">Dashboard</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero banner ── */}
      <div className="relative h-72 pt-16">
        {event.bannerImage
          ? <img src={event.bannerImage} alt={event.name} className="absolute inset-0 w-full h-full object-cover object-center" />
          : <div className="absolute inset-0 bg-[#0d1b2e]" />
        }
        <div className="absolute inset-0 bg-[#0d1b2e]/65" />
        <div className="relative z-10 h-full flex flex-col justify-end px-8 pb-8 max-w-7xl mx-auto">
          <button onClick={() => navigate('/events')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm mb-4 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </button>
          <h1 className="text-4xl font-bold text-white mb-3">{event.name}</h1>
          {event.eventType && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize w-fit ${TYPE_COLORS[event.eventType] || TYPE_COLORS.other}`}>
              {event.eventType}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left — About */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">About This Event</h2>
            {event.description && (
              <p className="text-slate-600 text-sm mb-6">{event.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard label="Date"
                value={new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
              <InfoCard label="Time" value={event.time} />
              <InfoCard label="Venue" value={event.location || (event.venueId?.name ? `${event.venueId.name}, ${event.venueId.city}` : null)} />
              <InfoCard label="Organizer" value={event.organizerName} />
              <InfoCard label="Price" value={minPrice !== null ? `From Rs. ${minPrice}` : 'Free'} />
              <InfoCard label="Booking Deadline"
                value={deadline ? deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
            </div>
          </div>

          {/* Right — Ticket panel */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-24">
              <h3 className="font-bold text-slate-900 text-base mb-4">Ticket Categories</h3>

              {isExpired ? (
                <div className="text-center py-6 text-slate-400">
                  <CalendarX className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">This event has ended</p>
                </div>
              ) : cats.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No tickets available.</p>
              ) : (
                <div>
                  {/* Category info rows — display only, no selection */}
                  <div className="space-y-3 mb-5">
                    {cats.map((cat, i) => {
                      const total     = cat.totalQuantity || 0;
                      const sold      = cat.soldQuantity  || 0;
                      const remaining = total > 0 ? total - sold : null;
                      const soldOut   = remaining !== null && remaining <= 0;
                      const pct       = total > 0 ? Math.round((remaining / total) * 100) : 100;

                      return (
                        <div key={i} className={`rounded-xl p-3 border border-slate-200 ${soldOut ? 'opacity-50' : ''}`}>
                          {/* Name + price */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                            <span className="font-bold text-[#1a2e4a] text-sm">${cat.price}</span>
                          </div>

                          {/* Availability text + % */}
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className={soldOut ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                              {soldOut
                                ? 'Sold out'
                                : remaining !== null
                                ? `${remaining} / ${total} available`
                                : 'Available'}
                            </span>
                            {total > 0 && !soldOut && (
                              <span className="text-emerald-600 font-semibold">{pct}%</span>
                            )}
                          </div>

                          {/* Progress bar */}
                          {total > 0 && (
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${soldOut ? 'bg-red-400' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          )}

                          <p className="text-xs text-slate-400 mt-1">{sold} tickets already booked</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Single Book Now button */}
                  <button
                    onClick={() => handleBookNow(cats[0])}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#1a2e4a] hover:bg-[#243d60] text-white transition-colors"
                  >
                    Book Now
                  </button>

                  {deadline && (
                    <p className="text-xs text-slate-400 text-center mt-2">
                      Book before {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-[#0d1b2e] text-white mt-16 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold text-lg mb-3">EventHub</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your gateway to extraordinary events. Discover, book, and experience the best happenings around you.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-300">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">All Events</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-300">Categories</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Music</li>
              <li>Drama</li>
              <li>Sport</li>
              <li>Other</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-300">Contact Info</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>info@eventhub.lk</li>
              <li>+94 11 234 5678</li>
              <li>Colombo, Sri Lanka</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-700 mt-10 pt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Sportek EventHub. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
