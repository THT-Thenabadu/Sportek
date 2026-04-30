import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft, CalendarDays, Clock, MapPin, User, Tag, CalendarCheck, Users, CalendarX, X } from 'lucide-react';

// ─── Info card ────────────────────────────────────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#eef2f7] border border-slate-200/80 rounded-2xl px-6 py-5 flex items-start gap-4">
      <div className="mt-1 shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className="text-slate-800 font-semibold text-[15px] leading-snug">{value || '—'}</p>
      </div>
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
<<<<<<< Updated upstream
    // Always go to seat selection — works for both indoor (seat map) and outdoor (category selection)
    navigate(`/events/${id}/seats`);
=======
    if (event.venueType === 'indoor' && event.venueId) {
      navigate(`/events/${id}/seats`);
    } else {
      const catIdx = cats.indexOf(cat);
      navigate(`/events/${id}/book/${catIdx}`);
    }
>>>>>>> Stashed changes
  };

  const handleSuccess = () => {
    alert('Payment successful! Your ticket is in your dashboard.');
    window.location.href = '/dashboard/tickets';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef2f7] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!event) return null;

  const cats        = event.ticketCategories || [];
  const minPrice    = cats.length ? Math.min(...cats.map(c => c.price)) : null;
  const isExpired   = event.status === 'expired';
  const deadline    = event.bookingDeadline ? new Date(event.bookingDeadline) : null;
  const totalBooked = cats.reduce((s, c) => s + (c.soldQuantity || 0), 0);

  return (
    <div className="min-h-screen bg-[#eef2f7]">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0d1b2e]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/events" className="text-white font-bold text-xl tracking-tight">EventHub</Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/"       className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
            <Link to="/events" className="text-white text-sm font-medium">Events</Link>
            <a href="#"        className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Contact Us</a>
          </div>
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link to="/login"    className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Login</Link>
                <Link to="/register" className="px-4 py-1.5 text-sm font-semibold border border-white/40 text-white rounded-full hover:bg-white/10 transition-colors">Register</Link>
              </>
            ) : (
              <Link to="/dashboard" className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">Dashboard</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero banner ── */}
      <div className="relative h-[440px] pt-16">
        {event.bannerImage
          ? <img src={event.bannerImage} alt={event.name} className="absolute inset-0 w-full h-full object-cover object-center" />
          : <div className="absolute inset-0 bg-[#0d1b2e]" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2e]/70 via-[#0d1b2e]/20 to-transparent" />

        {/* ✕ back button — top-centre */}
        <button
          onClick={() => navigate('/events')}
          className="absolute top-20 left-1/2 -translate-x-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors z-10"
          aria-label="Back to events">
          <X className="w-4 h-4" />
        </button>

        {/* Title + badge — bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-10 max-w-6xl mx-auto">
          <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg leading-tight">{event.name}</h1>
          {event.eventType && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize bg-white/20 backdrop-blur-sm text-white border border-white/30">
              {event.eventType}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Left — About + Info grid ── */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">About This Event</h2>
            {event.description && (
              <p className="text-[#3d5a8a] text-sm leading-relaxed mb-8">{event.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard icon={CalendarDays} label="Date"
                value={new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
              <InfoCard icon={Clock} label="Time" value={event.time} />
              <InfoCard icon={MapPin} label="Venue"
                value={event.location || (event.venueId?.name ? `${event.venueId.name}, ${event.venueId.city}` : null)} />
              <InfoCard icon={User} label="Organizer" value={event.organizerName} />
              <InfoCard icon={Tag} label="Starting Price"
                value={minPrice !== null ? `LKR ${minPrice.toLocaleString()}` : 'Free'} />
              <InfoCard icon={CalendarCheck} label="Booking Deadline"
                value={deadline ? deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
            </div>
          </div>

          {/* ── Right — Ticket panel ── */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-slate-900 text-lg mb-5">Ticket Categories</h3>

              {isExpired ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarX className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">This event has ended</p>
                </div>
              ) : cats.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No tickets available.</p>
              ) : (
                <>
                  {/* Category rows — with dividers */}
                  <div className="divide-y divide-slate-100 mb-5">
                    {cats.map((cat, i) => {
                      const total     = cat.totalQuantity || 0;
                      const sold      = cat.soldQuantity  || 0;
                      const remaining = total > 0 ? total - sold : null;
                      const soldOut   = remaining !== null && remaining <= 0;
                      const pct = total > 0 ? Math.round((remaining / total) * 100) : 100;

                      return (
                        <div key={i} className="py-4 first:pt-0">
                          {/* Name | Price */}
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                            <span className={`font-bold text-sm ${soldOut ? 'text-red-500' : 'text-[#1a2e4a]'}`}>
                              {soldOut ? 'Sold Out' : `LKR ${cat.price.toLocaleString()}`}
                            </span>
                          </div>

                          {/* Available count | % */}
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>
                              {soldOut
                                ? 'No tickets left'
                                : remaining !== null
                                  ? `${remaining} / ${total} available`
                                  : 'Available'}
                            </span>
                            {total > 0 && !soldOut && (
                              <span className="font-semibold text-slate-400">{pct}%</span>
                            )}
                          </div>

                          {/* Progress bar — full-width dark navy */}
                          {total > 0 && (
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${soldOut ? 'bg-red-400' : 'bg-[#1a2e4a]'}`}
                                style={{ width: `${soldOut ? 100 : Math.min(pct, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Total already booked */}
                  {totalBooked > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-5">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{totalBooked} tickets already booked</span>
                    </div>
                  )}

                  {/* Book Now */}
                  <button
                    onClick={() => handleBookNow(cats[0])}
                    className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#1a2e4a] hover:bg-[#243d60] text-white transition-colors shadow-md">
                    Book Now
                  </button>

                  {deadline && (
                    <p className="text-xs text-slate-400 text-center mt-2">
                      Book before {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </>
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
              <li><Link to="/"       className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">All Events</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-300">Categories</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Music</li><li>Drama</li><li>Sport</li><li>Other</li>
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
