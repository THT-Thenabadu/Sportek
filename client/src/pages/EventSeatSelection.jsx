import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import useAuthStore from '../store/useAuthStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft, Info } from 'lucide-react';

export default function EventSeatSelection() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [event, setEvent] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatStatus, setSeatStatus] = useState({ bookedSeats: [], lockedSeats: [] });

  // selectedSeats: { [seatId]: { row, seat, seatId, category, price } }
  const [selectedSeats, setSelectedSeats] = useState({});

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

  const handleSeatClick = async (row, seatNum, seatId) => {
    const cat = rowCategoryMap[row];
    if (!cat) return;
    if (bookedSet.has(seatId)) return; // already booked
    const lockedBy = lockedMap[seatId];
    if (lockedBy && lockedBy !== myUserId) return; // locked by someone else

    if (selectedSeats[seatId]) {
      // Deselect — unlock
      const next = { ...selectedSeats };
      delete next[seatId];
      setSelectedSeats(next);
      api.post(`/seats/${eventId}/unlock`, { seatId }).catch(() => {});
    } else {
      // Select — lock
      try {
        await api.post(`/seats/${eventId}/lock`, { seatId });
        setSelectedSeats(prev => ({
          ...prev,
          [seatId]: { row, seat: seatNum, seatId, category: cat.name, price: cat.price }
        }));
        // Refresh status
        fetchSeatStatus();
      } catch (err) {
        alert(err.response?.data?.message || 'Could not lock seat');
      }
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

  const CAT_COLORS = [
    { bg: 'bg-blue-50',    border: 'border-blue-200',   label: 'bg-blue-100 text-blue-800'   },
    { bg: 'bg-purple-50',  border: 'border-purple-200', label: 'bg-purple-100 text-purple-800'},
    { bg: 'bg-amber-50',   border: 'border-amber-200',  label: 'bg-amber-100 text-amber-800'  },
    { bg: 'bg-rose-50',    border: 'border-rose-200',   label: 'bg-rose-100 text-rose-800'    },
    { bg: 'bg-teal-50',    border: 'border-teal-200',   label: 'bg-teal-100 text-teal-800'    },
  ];

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

      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        {/* Back */}
        <button onClick={() => navigate(`/events/${eventId}`)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Event
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
          <p className="text-slate-500 text-sm mt-1">Select your seats below</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white rounded-xl border border-slate-200 p-4">
          {[
            { color: 'bg-emerald-400 border-emerald-500', label: 'Selected (you)' },
            { color: 'bg-slate-800 border-slate-900',     label: 'Booked'         },
            { color: 'bg-yellow-400 border-yellow-500',   label: 'Locked (5 min)' },
            { color: 'bg-white border-slate-300',         label: 'Available'      },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 text-sm text-slate-600">
              <div className={`w-6 h-6 rounded-full border-2 ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Venue layout image */}
        {venue?.seatLayoutImage && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Venue Layout</p>
            </div>
            <img src={venue.seatLayoutImage} alt="Venue layout"
              className="w-full max-h-64 object-contain p-4" />
          </div>
        )}

        {/* Stage indicator */}
        {seatRows.length > 0 && (
          <div className="w-full bg-[#1a2e4a] text-white text-xs font-bold text-center py-3 rounded-xl mb-6 tracking-widest uppercase">
            Stage / Field
          </div>
        )}

        {/* Seat map — per category */}
        {catRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No seat layout available for this event.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {catRows.map(({ cat, rows }, ci) => {
              if (rows.length === 0) return null;
              const colors = CAT_COLORS[ci % CAT_COLORS.length];
              return (
                <div key={cat.name} className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-5`}>
                  {/* Category header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.label}`}>
                        {cat.name}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">${cat.price} / seat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {Object.values(selectedSeats).filter(s => s.category === cat.name).length} selected
                      </span>
                      {Object.values(selectedSeats).some(s => s.category === cat.name) && (
                        <button
                          onClick={() => {
                            // Unlock and deselect all seats in this category
                            const toRemove = Object.values(selectedSeats).filter(s => s.category === cat.name);
                            toRemove.forEach(s => {
                              api.post(`/seats/${eventId}/unlock`, { seatId: s.seatId }).catch(() => {});
                            });
                            setSelectedSeats(prev => {
                              const next = { ...prev };
                              toRemove.forEach(s => delete next[s.seatId]);
                              return next;
                            });
                            fetchSeatStatus();
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 hover:border-red-400 px-2 py-0.5 rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-3">
                    {rows.map(row => (
                      <div key={row.rowLabel} className="flex items-center gap-3">
                        {/* Row label */}
                        <span className="w-8 text-xs font-bold text-slate-600 text-center shrink-0">
                          {row.rowLabel}
                        </span>
                        {/* Seats */}
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: row.seatCount }, (_, si) => {
                            const seatNum = si + 1;
                            const seatId  = `${row.rowLabel}${seatNum}`;
                            const isBooked   = bookedSet.has(seatId);
                            const lockedBy   = lockedMap[seatId];
                            const isLockedByMe = lockedBy === myUserId;
                            const isLockedByOther = lockedBy && lockedBy !== myUserId;
                            const isSelected = !!selectedSeats[seatId];

                            let cls = 'w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ';
                            if (isBooked) {
                              cls += 'bg-slate-800 border-slate-900 text-white cursor-not-allowed';
                            } else if (isLockedByOther) {
                              cls += 'bg-yellow-400 border-yellow-500 text-yellow-900 cursor-not-allowed';
                            } else if (isSelected || isLockedByMe) {
                              cls += 'bg-emerald-400 border-emerald-500 text-white cursor-pointer scale-110 shadow-md';
                            } else {
                              cls += 'bg-white border-slate-300 text-slate-500 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50';
                            }

                            return (
                              <button
                                key={seatId}
                                title={`${row.rowLabel}${seatNum}${isBooked ? ' (Booked)' : isLockedByOther ? ' (Locked)' : ''}`}
                                disabled={isBooked || isLockedByOther}
                                onClick={() => handleSeatClick(row.rowLabel, seatNum, seatId)}
                                className={cls}
                              >
                                {seatNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {totalSeats > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Booking Summary</h3>

            <div className="space-y-3 mb-4">
              {Object.entries(summary).map(([catName, data]) => (
                <div key={catName} className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{catName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Seats: {data.seats.join(', ')}
                    </p>
                    <p className="text-xs text-slate-500">{data.seats.length} × ${data.price}</p>
                  </div>
                  <p className="font-bold text-slate-900">${(data.seats.length * data.price).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between py-3 border-t-2 border-slate-200 mb-5">
              <div>
                <p className="font-bold text-slate-900">Total</p>
                <p className="text-xs text-slate-500">{totalSeats} seat{totalSeats !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-2xl font-bold text-[#1a2e4a]">${totalAmount.toFixed(2)}</p>
            </div>

            <button
              onClick={handleProceed}
              className="w-full py-4 bg-[#1a2e4a] hover:bg-[#243d60] text-white font-bold text-base rounded-xl transition-colors"
            >
              Proceed to Payment →
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              Seats are held for 5 minutes. Complete payment to confirm.
            </p>
          </div>
        )}

        {totalSeats === 0 && seatRows.length > 0 && (
          <div className="mt-6 text-center text-slate-400 text-sm py-4">
            Click on available seats to select them
          </div>
        )}
      </div>
    </div>
  );
}
