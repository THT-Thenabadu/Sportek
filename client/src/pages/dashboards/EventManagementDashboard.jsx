import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CreateVenueModal from '../../components/ui/CreateVenueModal';
import CreateEventModal from '../../components/ui/CreateEventModal';
import {
  CalendarDays, MapPin, Ticket, BookOpen, LogOut,
  Plus, Trash2, Edit2, Users, TrendingUp, Building2
} from 'lucide-react';

const STATUS_BADGE = {
  live:      { variant: 'success',     label: 'Live'     },
  draft:     { variant: 'warning',     label: 'Draft'    },
  expired:   { variant: 'destructive', label: 'Expired'  },
  cancelled: { variant: 'destructive', label: 'Cancelled'},
};

function EventsSection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchEvents = () => {
    setLoading(true);
    api.get('/events').then(r => setEvents(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchEvents(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    setDeleting(id);
    try { await api.delete(`/events/${id}`); setEvents(ev => ev.filter(e => e._id !== id)); }
    catch { alert('Failed to delete'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Events</h2>
          <p className="text-slate-500 text-sm mt-1">Create and manage all platform events</p>
        </div>
        <Button onClick={() => setModal('create')}>
          <Plus className="w-4 h-4 mr-2" /> Create Event
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No events yet. Create your first event.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map(e => {
            const sb = STATUS_BADGE[e.status] || STATUS_BADGE.draft;
            return (
              <Card key={e._id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  {e.bannerImage ? (
                    <img src={e.bannerImage} alt={e.name} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-slate-100 flex items-center justify-center">
                      <CalendarDays className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={sb.variant}>{sb.label}</Badge>
                  </div>
                  {e.eventType && (
                    <div className="absolute top-2 left-2">
                      <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full capitalize">{e.eventType}</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-slate-900 text-base">{e.name}</h3>
                  {e.description && <p className="text-slate-500 text-xs line-clamp-2">{e.description}</p>}
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                      {new Date(e.date).toLocaleDateString()} at {e.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {e.location || (e.venueId?.name ? `${e.venueId.name}, ${e.venueId.city}` : '—')}
                    </div>
                    {e.bookingDeadline && (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <Ticket className="w-3 h-3 shrink-0" />
                        Deadline: {new Date(e.bookingDeadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {e.ticketCategories?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {e.ticketCategories.map((c, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {c.name} ${c.price}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setModal(e)}>
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" isLoading={deleting === e._id} onClick={() => handleDelete(e._id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modal === 'create' && <CreateEventModal onClose={() => setModal(null)} onSaved={fetchEvents} />}
      {modal && modal !== 'create' && <CreateEventModal event={modal} onClose={() => setModal(null)} onSaved={fetchEvents} />}
    </div>
  );
}

// ─── Venues Section ───────────────────────────────────────────────────────────
function VenuesSection() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | venue object
  const [deleting, setDeleting] = useState(null);

  const fetchVenues = () => {
    setLoading(true);
    api.get('/venues').then(r => setVenues(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleSave = async (payload, id) => {
    if (id) {
      await api.put(`/venues/${id}`, payload);
    } else {
      await api.post('/venues', payload);
    }
    fetchVenues();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this venue?')) return;
    setDeleting(id);
    try { await api.delete(`/venues/${id}`); setVenues(v => v.filter(x => x._id !== id)); }
    catch { alert('Failed to delete venue'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Venues</h2>
          <p className="text-slate-500 text-sm mt-1">Manage event venues with seat layouts</p>
        </div>
        <Button onClick={() => setModal('create')}>
          <Plus className="w-4 h-4 mr-2" /> Create Venue
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No venues yet.</p>
          <p className="text-slate-400 text-sm mt-1">Click "Create Venue" to add your first venue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {venues.map(v => (
            <Card key={v._id} className="overflow-hidden hover:shadow-md transition-shadow">
              {v.seatLayoutImage ? (
                <img src={v.seatLayoutImage} alt={v.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-slate-300" />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{v.name}</h3>
                  <Badge variant={v.locationType === 'indoor' ? 'default' : 'success'} className="shrink-0 text-xs capitalize">
                    {v.locationType}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    {v.venueType}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    {v.city} — {v.address}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    Capacity: {v.totalCapacity.toLocaleString()}
                  </div>
                  {v.seatRows?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-slate-400 shrink-0" />
                      {v.seatRows.length} rows · {v.seatRows.reduce((s, r) => s + r.seatCount, 0)} seats mapped
                    </div>
                  )}
                </div>

                {v.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{v.description}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setModal(v)}>
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1"
                    isLoading={deleting === v._id} onClick={() => handleDelete(v._id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal === 'create' && (
        <CreateVenueModal onClose={() => setModal(null)} onSaved={handleSave} />
      )}
      {modal && modal !== 'create' && (
        <CreateVenueModal venue={modal} onClose={() => setModal(null)} onSaved={handleSave} />
      )}
    </div>
  );
}

// ─── Ticket Inventory Section ─────────────────────────────────────────────────
function TicketInventorySection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch events, then sync soldQuantity for each from paid tickets
    api.get('/events').then(async r => {
      const evs = r.data;
      // Sync each event's inventory in parallel (fire-and-forget, then re-fetch)
      const liveIds = evs.filter(e => e.status === 'live' || e.status === 'expired').map(e => e._id);
      await Promise.allSettled(liveIds.map(id => api.get(`/tickets/admin/inventory/${id}`)));
      // Re-fetch events with updated soldQuantity
      return api.get('/events');
    }).then(r => setEvents(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Ticket Inventory</h2>
        <p className="text-slate-500 text-sm mt-1">Category-wise ticket sales and revenue per event</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border">
          <Ticket className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No events to show inventory for.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {events.map(e => {
            const cats         = e.ticketCategories || [];
            const eventTotal   = cats.reduce((s, c) => s + (c.totalQuantity || 0), 0);
            const eventSold    = cats.reduce((s, c) => s + (c.soldQuantity  || 0), 0);
            const eventRevenue = cats.reduce((s, c) => s + ((c.soldQuantity || 0) * (c.price || 0)), 0);
            const remaining    = eventTotal - eventSold;
            const soldPct      = eventTotal > 0 ? Math.round((eventSold / eventTotal) * 100) : 0;
            const sb           = STATUS_BADGE[e.status] || STATUS_BADGE.draft;

            return (
              <Card key={e._id} className="overflow-hidden">
                {/* Event header */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b flex-wrap gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {e.bannerImage && (
                      <img src={e.bannerImage} alt={e.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm">{e.name}</h3>
                        <Badge variant={sb.variant} className="text-xs shrink-0">{sb.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(e.date).toLocaleDateString()} · {e.location || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="text-base font-bold text-blue-600">${eventRevenue.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Sold</p>
                      <p className="text-base font-bold text-emerald-600">{eventSold}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Remaining</p>
                      <p className={`text-base font-bold ${remaining === 0 ? 'text-red-600' : 'text-slate-700'}`}>{remaining}</p>
                    </div>
                  </div>
                </div>

                {/* Overall progress bar */}
                <div className="px-5 pt-3 pb-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{soldPct}% sold</span>
                    <span>{eventSold} / {eventTotal} tickets</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${soldPct === 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${soldPct}%` }} />
                  </div>
                </div>

                {/* Category breakdown */}
                {cats.length > 0 ? (
                  <div className="px-5 py-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 font-semibold border-b">
                            <th className="pb-2 text-left">Category</th>
                            <th className="pb-2 text-right">Price</th>
                            <th className="pb-2 text-right">Total</th>
                            <th className="pb-2 text-right">Sold</th>
                            <th className="pb-2 text-right">Remaining</th>
                            <th className="pb-2 text-right">Revenue</th>
                            <th className="pb-2 pl-4">Sales %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {cats.map((c, ci) => {
                            const catSold  = c.soldQuantity  || 0;
                            const catTotal = c.totalQuantity || 0;
                            const catRem   = catTotal - catSold;
                            const catRev   = catSold * (c.price || 0);
                            const catPct   = catTotal > 0 ? Math.round((catSold / catTotal) * 100) : 0;
                            return (
                              <tr key={ci} className="hover:bg-slate-50/60">
                                <td className="py-2.5 pr-4 font-semibold text-slate-800">{c.name || `Category ${ci + 1}`}</td>
                                <td className="py-2.5 text-right text-slate-600">${c.price}</td>
                                <td className="py-2.5 text-right text-slate-600">{catTotal}</td>
                                <td className="py-2.5 text-right font-semibold text-emerald-600">{catSold}</td>
                                <td className="py-2.5 text-right">
                                  <span className={catRem === 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                                    {catRem === 0 ? 'Sold Out' : catRem}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-semibold text-blue-600">${catRev.toFixed(2)}</td>
                                <td className="py-2.5 pl-4 w-32">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${catPct === 100 ? 'bg-red-400' : 'bg-emerald-400'}`}
                                        style={{ width: `${catPct}%` }} />
                                    </div>
                                    <span className="text-xs text-slate-400 w-8 text-right">{catPct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="px-5 py-4 text-sm text-slate-400">No ticket categories defined for this event.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Ticket Bookings Section ──────────────────────────────────────────────────
function TicketBookingsSection() {
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [eventFilter, setEventFilter] = useState('');   // event _id or ''

  useEffect(() => {
    Promise.all([
      api.get('/tickets/admin/all'),
      api.get('/events'),
    ]).then(([tRes, eRes]) => {
      setTickets(tRes.data);
      setEvents(eRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter(t => {
    return !eventFilter || t.eventId?._id === eventFilter;
  });

  // Summary stats for filtered set — removed per request

  const STATUS_VARIANT = {
    active:   'success',
    used:     'default',
    cancelled:'destructive',
    refunded: 'warning',
  };

  const PAYMENT_VARIANT = {
    paid:     'success',
    pending:  'warning',
    failed:   'destructive',
    refunded: 'warning',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Ticket Bookings</h2>
        <p className="text-slate-500 text-sm mt-1">All ticket purchases across all events</p>
      </div>

      {/* Filter by event name */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-end gap-3">
          <div className="min-w-64">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Filter by Event</label>
            <select
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
            >
              <option value="">All Events</option>
              {events.map(e => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No bookings found.</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
              <tr>
                {['Booking ID', 'Customer', 'Email', 'Event', 'Category', 'Qty', 'Price', 'Total', 'Payment', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 whitespace-nowrap text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => {
                const qty   = t.quantity || 1;
                const total = qty * (t.price || 0);
                const cat   = t.category || t.tier || 'General';
                return (
                  <tr key={t._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      #{t._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {t.customerId?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {t.customerId?.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-36 truncate">
                      {t.eventId?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {cat}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{qty}</td>
                    <td className="px-4 py-3 text-slate-600">${t.price}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">${total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={PAYMENT_VARIANT[t.paymentStatus] || 'success'}>
                        {t.paymentStatus || 'paid'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[t.status] || 'default'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'events',    label: 'Events',           icon: CalendarDays },
  { id: 'venues',    label: 'Venues',           icon: Building2    },
  { id: 'inventory', label: 'Ticket Inventory', icon: TrendingUp   },
  { id: 'bookings',  label: 'Ticket Bookings',  icon: BookOpen     },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function EventManagementDashboard() {
  const [activeTab, setActiveTab] = useState('events');
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Dark sidebar */}
      <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed top-0 left-0 z-10">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
              <span className="text-slate-900 font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold">SPORTEK</span>
          </div>
        </div>

        {/* Panel header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-base font-bold">Event Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">Admin Hub</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Management
          </div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Back to admin + logout */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="w-full text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800 transition-colors text-left"
          >
            ← Back to Admin Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="p-8">
          {activeTab === 'events'    && <EventsSection />}
          {activeTab === 'venues'    && <VenuesSection />}
          {activeTab === 'inventory' && <TicketInventorySection />}
          {activeTab === 'bookings'  && <TicketBookingsSection />}
        </div>
      </main>
    </div>
  );
}
