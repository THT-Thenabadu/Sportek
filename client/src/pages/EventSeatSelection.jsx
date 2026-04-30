import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft, Info, Clock, AlertTriangle, MapPin, CalendarDays } from 'lucide-react';

export default function EventSeatSelection() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  // Detect redirect back from payment page after hold expired
  const wasExpired = location.state?.expired === true;

  const [event, setEvent] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatStatus, setSeatStatus] = useState({ bookedSeats: [], lockedSeats: [] });

  // selectedSeats: { [seatId]: { row, seat, seatId, category, price } }
  const [selectedSeats, setSelectedSeats] = useState({});

  // 15-minute hold countdown (in seconds)
  const HOLD_DURATION = 15 * 60; // 15 minutes
  const [holdSecsLeft, setHoldSecsLeft] = useState(null);  // null = no active hold
  const holdTimerRef = useRef(null);
  const holdStartedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    Promise.all([
      api.get(`/events/${eventId}`),
    ]).then(([eRes]) => {
      const ev = eRes.data;
      setEvent(ev);
      if (ev.venueId) {
        return api.get(`/venues/${ev.venueId._id || ev.venueId}`).then(vRes => setVenue(vRes.data));
      }
    }).catch(() => navigate(`/events/${eventId}`))
      .finally(() => setLoading(false));
  }, [eventId, isAuthenticated]);

  // Poll seat status every 10s
  const fetchSeatStatus = useCallback(() => {
    api.get(`/seats/${eventId}/status`).then(r => setSeatStatus(r.data)).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    fetchSeatStatus();
    const interval = setInterval(fetchSeatStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchSeatStatus]);

  // Build a map for quick lookup
  const bookedSet = new Set(seatStatus.bookedSeats.map(s => s.seatId));
  const lockedMap = {}; // seatId -> userId
  seatStatus.lockedSeats.forEach(s => { lockedMap[s.seatId] = s.userId; });
  const myUserId = user?._id?.toString();

  // Find which category a row belongs to
  const rowCategoryMap = {};
  (event?.ticketCategories || []).forEach(cat => {
    (cat.rows || []).forEach(row => { rowCategoryMap[row] = cat; });
  });

  // Start or reset the 15-min hold countdown when the FIRST seat is selected
  const startHoldTimer = useCallback(() => {
    if (holdStartedRef.current) return; // already running
    holdStartedRef.current = true;
    const expiresAt = Date.now() + HOLD_DURATION * 1000;
    // Persist expiry so the payment page can resume the same countdown
    sessionStorage.setItem(`seat_hold_expires_${eventId}`, expiresAt.toString());
    setHoldSecsLeft(HOLD_DURATION);
    holdTimerRef.current = setInterval(() => {
      setHoldSecsLeft(prev => {
        if (prev <= 1) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
          holdStartedRef.current = false;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [HOLD_DURATION, eventId]);

  // Stop and reset the countdown (when all seats are deselected)
  const stopHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartedRef.current = false;
    sessionStorage.removeItem(`seat_hold_expires_${eventId}`);
    setHoldSecsLeft(null);
  }, [eventId]);

  // When hold hits 0, auto-unlock and clear all selected seats
  useEffect(() => {
    if (holdSecsLeft === 0) {
      // Unlock all seats on server
      api.post(`/seats/${eventId}/unlock`, {}).catch(() => {});
      sessionStorage.removeItem(`seat_hold_expires_${eventId}`);
      setSelectedSeats({});
      fetchSeatStatus();
      stopHoldTimer();
    }
  }, [holdSecsLeft, eventId, fetchSeatStatus, stopHoldTimer]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  const handleSeatClick = (row, seatNum, seatId) => {
    const cat = rowCategoryMap[row];
    if (!cat) return;
    if (bookedSet.has(seatId)) return;
    const lockedBy = lockedMap[seatId];
    if (lockedBy && lockedBy !== myUserId) return;

    if (selectedSeats[seatId]) {
      // ─ Deselect: update state immediately (instant colour change), then fire-and-forget unlock
      const next = { ...selectedSeats };
      delete next[seatId];
      setSelectedSeats(next);
      api.post(`/seats/${eventId}/unlock`, { seatId }).catch(() => {});
      if (Object.keys(next).length === 0) stopHoldTimer();
      // No fetchSeatStatus here — avoids the re-render flicker from the network round-trip
    } else {
      // ─ Select: optimistic update first (instant colour change), then lock on server
      setSelectedSeats(prev => ({
        ...prev,
        [seatId]: { row, seat: seatNum, seatId, category: cat.name, price: cat.price }
      }));
      startHoldTimer();
      api.post(`/seats/${eventId}/lock`, { seatId }).catch(err => {
        // Roll back if server rejects the lock
        setSelectedSeats(prev => {
          const rb = { ...prev };
          delete rb[seatId];
          return rb;
        });
        const msg = err.response?.data?.message || 'Could not lock seat';
        alert(msg);
      });
    }
  };

  // Build summary grouped by category
  const summary = {};
  Object.values(selectedSeats).forEach(s => {
    if (!summary[s.category]) summary[s.category] = { seats: [], price: s.price };
    summary[s.category].seats.push(s.seatId);
  });
  const totalAmount = Object.values(selectedSeats).reduce((sum, s) => sum + s.price, 0);
  const totalSeats  = Object.keys(selectedSeats).length;

  const handleProceed = () => {
    if (totalSeats === 0) return;
    // Pass selected seats via sessionStorage to payment page
    sessionStorage.setItem(`event_seats_${eventId}`, JSON.stringify({
      seats: Object.values(selectedSeats),
      summary,
      totalAmount,
    }));
    navigate(`/events/${eventId}/payment`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!event) return null;

  const cats = event.ticketCategories || [];
  const seatRows = venue?.seatRows || [];

  // Group rows by category
  const catRows = cats.map(cat => ({
    cat,
    rows: seatRows.filter(r => (cat.rows || []).includes(r.rowLabel)),
  }));

  // Total open seats across all categories
  const totalOpenSeats = cats.reduce((sum, c) => sum + Math.max(0, (c.totalQuantity || 0) - (c.soldQuantity || 0)), 0);

  // ── Service charge helper ──
  const serviceCharge = totalAmount * 0.05;
  const grandTotal    = totalAmount + serviceCharge;
  const fmtLKR = (n) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-[#eef2f7]">

      {/* ── Navbar ── */}
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

      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">

        {/* ── Back link ── */}
        <button onClick={() => navigate(`/events/${eventId}`)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Event Details
        </button>

        {/* ── Event Header ── */}
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-500 flex items-center gap-1.5 mb-3">
            <Info className="w-3.5 h-3.5" /> Booking Process
          </p>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3 leading-tight">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
            {(event.location || event.venueId?.name) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                {event.location || `${event.venueId.name}, ${event.venueId.city}`}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              {new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* ── Expired hold notification ── */}
        {wasExpired && (
          <div className="mb-6 rounded-2xl border-2 border-red-400 bg-red-50 px-5 py-4 flex items-center gap-4 shadow-sm">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-sm text-red-700">Your 15-minute seat hold has expired.</p>
              <p className="text-xs mt-0.5 text-red-500">Your seats have been released. Please reselect your seats and complete payment within 15 minutes.</p>
            </div>
          </div>
        )}

        {/* ── 15-minute Hold Countdown Banner ── */}
        {holdSecsLeft !== null && (() => {
          const mins = Math.floor(holdSecsLeft / 60);
          const secs = holdSecsLeft % 60;
          const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
          const isUrgent  = holdSecsLeft <= 120;
          const isExpired = holdSecsLeft === 0;
          return (
            <div className={`mb-6 rounded-2xl border-2 px-5 py-4 flex items-center justify-between gap-4 shadow-sm ${
              isExpired  ? 'bg-red-100 border-red-400'
              : isUrgent ? 'bg-orange-50 border-orange-400 animate-pulse'
              : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-center gap-3">
                {isUrgent
                  ? <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${isExpired ? 'text-red-600' : 'text-orange-500'}`} />
                  : <Clock className="w-6 h-6 flex-shrink-0 text-amber-500" />
                }
                <div>
                  <p className={`font-bold text-sm ${isExpired ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-amber-800'}`}>
                    {isExpired ? 'Hold expired! Your seats have been released.'
                      : isUrgent ? 'Hurry! Your seats will be released soon.'
                      : 'Your seats are held — complete booking within 15 minutes'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-amber-600'}`}>
                    {isExpired ? 'Please reselect your seats to try again.'
                      : 'Other users cannot select your held seats during this time.'}
                  </p>
                </div>
              </div>
              {!isExpired && (
                <div className={`text-3xl font-black font-mono flex-shrink-0 ${isUrgent ? 'text-orange-600' : 'text-amber-600'}`}>
                  {timeStr}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Select Your Seats header ── */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900">Select Your Seats</h2>
          {totalOpenSeats > 0 && (
            <span className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
              {totalOpenSeats} seats open
            </span>
          )}
        </div>

        {/* ── Venue layout image ── */}
        {venue?.seatLayoutImage && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Venue Layout Map</p>
            </div>
            <img src={venue.seatLayoutImage} alt="Venue layout" className="w-full max-h-[500px] object-contain p-2" />
          </div>
        )}


        {/* ── No seats available ── */}
        {catRows.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400 mb-5">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No seat layout available for this event.</p>
          </div>
        )}

        {/* ── Seating Reference Legend ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
          <p className="text-xs font-bold tracking-widest uppercase text-slate-400 flex items-center gap-2 mb-4">
            <Info className="w-3.5 h-3.5" /> Seating Reference
          </p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Availability Status</p>
          <div className="flex flex-wrap gap-6">
            {[
              { cls: 'bg-[#1a2e4a] border-[#1a2e4a]', label: 'Selected' },
              { cls: 'bg-white border-slate-300',       label: 'Available' },
              { cls: 'bg-slate-200 border-slate-300',   label: 'Booked' },
              { cls: 'bg-yellow-100 border-yellow-400', label: 'Held (15 min)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2.5 text-sm text-slate-600">
                <div className={`w-8 h-8 rounded-lg border-2 ${l.cls}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Per-category seat selection cards ── */}
        {catRows.map(({ cat, rows }) => {
          if (rows.length === 0) return null;
          const remaining = Math.max(0, (cat.totalQuantity || 0) - (cat.soldQuantity || 0));
          const selectedInCat = Object.values(selectedSeats).filter(s => s.category === cat.name);

          return (
            <div key={cat.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
              {/* Category header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900">{cat.name}</h3>
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full font-semibold">Tickets</span>
                </div>
                {selectedInCat.length > 0 && (
                  <button
                    onClick={() => {
                      selectedInCat.forEach(s => api.post(`/seats/${eventId}/unlock`, { seatId: s.seatId }).catch(() => {}));
                      setSelectedSeats(prev => {
                        const next = { ...prev };
                        selectedInCat.forEach(s => delete next[s.seatId]);
                        if (Object.keys(next).length === 0) stopHoldTimer();
                        return next;
                      });
                      fetchSeatStatus();
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition-colors">
                    Clear {selectedInCat.length} selected
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-400 mb-5">
                LKR {cat.price.toLocaleString()} PER SEAT
                {cat.totalQuantity > 0 && (
                  <span className={remaining === 0 ? ' text-red-400 font-semibold' : ''}>
                    {' • '}{remaining === 0 ? 'Sold Out' : `${remaining} LEFT`}
                  </span>
                )}
              </p>

              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Available Seats</p>

              {/* All seats in this category (all rows together) */}
              <div className="flex flex-wrap gap-2">
                {rows.flatMap(row =>
                  Array.from({ length: row.seatCount }, (_, si) => {
                    const seatNum = si + 1;
                    const seatId  = `${row.rowLabel}${seatNum}`;
                    const isBooked        = bookedSet.has(seatId);
                    const lockedBy        = lockedMap[seatId];
                    const isLockedByMe    = lockedBy === myUserId;
                    const isLockedByOther = lockedBy && lockedBy !== myUserId;
                    const isSelected      = !!selectedSeats[seatId];

                    let cls = 'w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-all ';
                    if (isBooked)             cls += 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed';
                    else if (isLockedByOther) cls += 'bg-yellow-100 border-yellow-400 text-yellow-700 cursor-not-allowed';
                    else if (isSelected || isLockedByMe) cls += 'bg-black border-black text-white cursor-pointer scale-110 shadow-lg';
                    else cls += 'bg-white border-slate-300 text-slate-600 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 hover:scale-105';

                    return (
                      <button key={seatId}
                        title={`${seatId}${isBooked ? ' (Booked)' : isLockedByOther ? ' (Held)' : ''}`}
                        disabled={isBooked || isLockedByOther}
                        onClick={() => handleSeatClick(row.rowLabel, seatNum, seatId)}
                        className={cls}>
                        {seatId}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {/* ── Booking Summary Table ── */}
        {totalSeats > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-2">
            <h3 className="font-bold text-slate-900 text-lg mb-5">Booking Summary</h3>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="pb-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Seats</th>
                    <th className="pb-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Price</th>
                    <th className="pb-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary).map(([catName, data]) => (
                    <tr key={catName} className="border-b border-slate-100">
                      <td className="py-3.5 font-semibold text-slate-800">{catName}</td>
                      <td className="py-3.5 text-slate-500 text-xs">{data.seats.join(', ')}</td>
                      <td className="py-3.5 text-slate-500">
                        {fmtLKR(data.price)} × {data.seats.length}
                      </td>
                      <td className="py-3.5 text-right font-semibold text-slate-800">
                        {fmtLKR(data.seats.length * data.price)} LKR
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between items-center py-3 border-t border-slate-100 mt-1">
              <span className="font-semibold text-slate-700">Subtotal</span>
              <span className="font-semibold text-slate-800">{fmtLKR(totalAmount)} LKR</span>
            </div>

            {/* Service Charge */}
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400 text-sm">Service Charge (5%)</span>
              <span className="text-indigo-600 font-medium text-sm">{fmtLKR(serviceCharge)} LKR</span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-3.5 border-t-2 border-slate-200 mt-1">
              <span className="font-bold text-indigo-700 text-base">Total</span>
              <span className="font-black text-slate-900 text-lg">{fmtLKR(grandTotal)} LKR</span>
            </div>

            {/* Back / Continue buttons */}
            <div className="flex justify-center gap-4 mt-7">
              <button
                onClick={() => navigate(`/events/${eventId}`)}
                className="px-8 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleProceed}
                disabled={totalSeats === 0}
                className="px-8 py-2.5 bg-[#1a2e4a] hover:bg-[#243d60] text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 shadow-md">
                Continue →
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-3">
              Seats are held for 15 minutes. Complete payment to confirm your booking.
            </p>
          </div>
        )}

        {totalSeats === 0 && seatRows.length > 0 && (
          <p className="text-center text-slate-400 text-sm py-4 mt-2">
            Click on available seats to select them
          </p>
        )}

      </div>
    </div>
  );
}
