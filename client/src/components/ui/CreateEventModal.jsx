import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Upload, ChevronDown } from 'lucide-react';
import Button from './Button';
import api from '../../lib/axios';

const EVENT_TYPES = ['music', 'drama', 'sport', 'other'];

const LABEL = 'block text-sm font-semibold text-slate-700 mb-1';
const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800';
const SECTION = 'bg-white rounded-xl border border-slate-200 p-5 space-y-4';

const uploadImage = async (file) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: data }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Upload failed');
  return json.secure_url;
};

export default function CreateEventModal({ event, onClose, onSaved }) {
  const isEdit = !!event;
  const bannerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(event?.bannerImage || '');
  const [indoorVenues, setIndoorVenues] = useState([]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [basic, setBasic] = useState({
    name:        event?.name        || '',
    description: event?.description || '',
    eventType:   event?.eventType   || 'sport',
  });

  const [dateTime, setDateTime] = useState({
    date: event?.date ? new Date(event.date).toISOString().split('T')[0] : '',
    time: event?.time || '',
  });

  const [venue, setVenue] = useState({
    venueType: event?.venueType || 'outdoor',
    venueId:   event?.venueId?._id || event?.venueId || '',
    location:  event?.location || '',
  });

  const [ops, setOps] = useState({
    organizerName:   event?.organizerName   || '',
    bookingDeadline: event?.bookingDeadline
      ? new Date(event.bookingDeadline).toISOString().split('T')[0]
      : '',
  });

  // ticketCategories: [{ name, price, totalQuantity, rows: [] }]
  const [categories, setCategories] = useState(
    event?.ticketCategories?.length
      ? event.ticketCategories.map(c => ({ ...c, rows: c.rows || [] }))
      : [{ name: '', price: '', totalQuantity: '', rows: [] }]
  );

  // Fetch indoor venues
  useEffect(() => {
    api.get('/venues').then(r => {
      setIndoorVenues(r.data.filter(v => v.locationType === 'indoor'));
    }).catch(() => {});
  }, []);

  // Selected indoor venue object
  const selectedVenue = indoorVenues.find(v => v._id === venue.venueId);

  // ── Category helpers ────────────────────────────────────────────────────────
  const addCategory = () =>
    setCategories([...categories, { name: '', price: '', totalQuantity: '', rows: [] }]);

  const removeCategory = (i) =>
    setCategories(categories.filter((_, idx) => idx !== i));

  const updateCategory = (i, field, val) => {
    const updated = [...categories];
    updated[i][field] = val;
    setCategories(updated);
  };

  const toggleRow = (catIdx, rowLabel) => {
    const updated = [...categories];
    const rows = updated[catIdx].rows || [];
    updated[catIdx].rows = rows.includes(rowLabel)
      ? rows.filter(r => r !== rowLabel)
      : [...rows, rowLabel];
    setCategories(updated);
  };

  // ── Banner ──────────────────────────────────────────────────────────────────
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handlePublish = async (status) => {
    if (!basic.name || !dateTime.date || !dateTime.time || !ops.bookingDeadline) {
      alert('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      let bannerImage = event?.bannerImage || '';
      if (bannerFile) bannerImage = await uploadImage(bannerFile);

      const payload = {
        ...basic,
        ...dateTime,
        venueType:       venue.venueType,
        venueId:         venue.venueType === 'indoor' ? venue.venueId || null : null,
        location:        venue.venueType === 'outdoor'
          ? venue.location
          : (selectedVenue ? `${selectedVenue.name}, ${selectedVenue.city}` : ''),
        organizerName:   ops.organizerName,
        bookingDeadline: ops.bookingDeadline,
        bannerImage,
        ticketCategories: categories.map(c => ({
          ...c,
          price:         Number(c.price),
          totalQuantity: Number(c.totalQuantity),
        })),
        status,
      };

      if (isEdit) {
        await api.put(`/events/${event._id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white rounded-t-2xl border-b shrink-0">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── 1. Basic Event Info ── */}
          <div className={SECTION}>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
              Basic Event Info
            </h3>

            <div>
              <label className={LABEL}>Event Name <span className="text-red-500">*</span></label>
              <input className={INPUT} placeholder="e.g. National Cricket Championship"
                value={basic.name} onChange={e => setBasic({ ...basic, name: e.target.value })} />
            </div>

            <div>
              <label className={LABEL}>Description</label>
              <textarea rows={3} className={INPUT + ' resize-none'}
                placeholder="Describe the event..."
                value={basic.description}
                onChange={e => setBasic({ ...basic, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Event Type <span className="text-red-500">*</span></label>
                <select className={INPUT} value={basic.eventType}
                  onChange={e => setBasic({ ...basic, eventType: e.target.value })}>
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Banner Image</label>
                <div
                  onClick={() => bannerRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-slate-500 transition-colors"
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="banner" className="h-16 mx-auto rounded object-cover" />
                  ) : (
                    <div className="text-slate-400 text-xs">
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      Click to upload
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
              </div>
            </div>
          </div>

          {/* ── 2. Date & Time ── */}
          <div className={SECTION}>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
              Date & Time
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Event Date <span className="text-red-500">*</span></label>
                <input type="date" className={INPUT}
                  value={dateTime.date} onChange={e => setDateTime({ ...dateTime, date: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Event Time <span className="text-red-500">*</span></label>
                <input type="time" className={INPUT}
                  value={dateTime.time} onChange={e => setDateTime({ ...dateTime, time: e.target.value })} />
              </div>
            </div>
          </div>

          {/* ── 3. Venue Details ── */}
          <div className={SECTION}>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
              Venue Details
            </h3>

            <div>
              <label className={LABEL}>Venue Type <span className="text-red-500">*</span></label>
              <div className="flex gap-3">
                {['indoor', 'outdoor'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setVenue({ ...venue, venueType: t, venueId: '', location: '' })}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${
                      venue.venueType === t
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {venue.venueType === 'indoor' ? (
              <div>
                <label className={LABEL}>Select Indoor Venue</label>
                {indoorVenues.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No indoor venues found. Create one in the Venues section first.
                  </p>
                ) : (
                  <select className={INPUT} value={venue.venueId}
                    onChange={e => setVenue({ ...venue, venueId: e.target.value })}>
                    <option value="">— Select a venue —</option>
                    {indoorVenues.map(v => (
                      <option key={v._id} value={v._id}>{v.name} — {v.city} ({v.totalCapacity} cap)</option>
                    ))}
                  </select>
                )}
                {selectedVenue && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border text-sm text-slate-600">
                    <p className="font-semibold text-slate-800">{selectedVenue.name}</p>
                    <p>{selectedVenue.address}, {selectedVenue.city}</p>
                    <p>Capacity: {selectedVenue.totalCapacity} · Rows: {selectedVenue.seatRows?.map(r => r.rowLabel).join(', ')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className={LABEL}>Location / Venue Name</label>
                <input className={INPUT} placeholder="e.g. Colombo National Stadium"
                  value={venue.location}
                  onChange={e => setVenue({ ...venue, location: e.target.value })} />
              </div>
            )}
          </div>

          {/* ── 4. Operations & Deadlines ── */}
          <div className={SECTION}>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
              Operations & Deadlines
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Organizer Name</label>
                <input className={INPUT} placeholder="e.g. Sports Ministry"
                  value={ops.organizerName}
                  onChange={e => setOps({ ...ops, organizerName: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Booking Deadline <span className="text-red-500">*</span></label>
                <input type="date" className={INPUT}
                  value={ops.bookingDeadline}
                  onChange={e => setOps({ ...ops, bookingDeadline: e.target.value })} />
              </div>
            </div>
          </div>

          {/* ── 5. Ticket Categories ── */}
          <div className={SECTION}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-900 text-white rounded-full text-xs flex items-center justify-center font-bold">5</span>
                Ticket Categories
              </h3>
              <Button size="sm" variant="outline" onClick={addCategory}>
                <Plus className="w-3 h-3 mr-1" /> Add Category
              </Button>
            </div>

            <div className="space-y-4">
              {categories.map((cat, ci) => (
                <div key={ci} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Category {ci + 1}</span>
                    {categories.length > 1 && (
                      <button onClick={() => removeCategory(ci)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Category Name</label>
                      <input className={INPUT} placeholder="e.g. VIP"
                        value={cat.name} onChange={e => updateCategory(ci, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Price ($)</label>
                      <input type="number" min="0" className={INPUT}
                        value={cat.price} onChange={e => updateCategory(ci, 'price', e.target.value)} />
                    </div>
                    {venue.venueType === 'outdoor' && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Total Seats</label>
                        <input type="number" min="1" className={INPUT}
                          value={cat.totalQuantity}
                          onChange={e => updateCategory(ci, 'totalQuantity', e.target.value)} />
                      </div>
                    )}
                  </div>

                  {/* Indoor: assign rows to this category */}
                  {venue.venueType === 'indoor' && selectedVenue?.seatRows?.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Assign Rows to this Category</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedVenue.seatRows.map(row => {
                          const assignedToThis = cat.rows?.includes(row.rowLabel);
                          // Find if another category owns this row
                          const takenByIdx = categories.findIndex(
                            (c, idx) => idx !== ci && c.rows?.includes(row.rowLabel)
                          );
                          const takenBy = takenByIdx !== -1 ? categories[takenByIdx] : null;
                          const disabled = !!takenBy;

                          return (
                            <button key={row.rowLabel} type="button"
                              disabled={disabled}
                              onClick={() => !disabled && toggleRow(ci, row.rowLabel)}
                              title={takenBy ? `Assigned to "${takenBy.name || `Category ${takenByIdx + 1}`}"` : ''}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                assignedToThis
                                  ? 'bg-slate-900 border-slate-900 text-white'
                                  : disabled
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                                  : 'bg-white border-slate-300 text-slate-600 hover:border-slate-700 cursor-pointer'
                              }`}>
                              Row {row.rowLabel} ({row.seatCount})
                              {takenBy && (
                                <span className="ml-1 text-[9px] font-normal normal-case no-underline">
                                  — {takenBy.name || `Cat ${takenByIdx + 1}`}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {cat.rows?.length > 0 && (
                        <p className="text-xs text-emerald-600 font-medium mt-2">
                          ✓ {cat.rows.reduce((s, r) => {
                            const row = selectedVenue.seatRows.find(sr => sr.rowLabel === r);
                            return s + (row?.seatCount || 0);
                          }, 0)} seats assigned ({cat.rows.join(', ')})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer — Publish / Discard */}
        <div className="px-6 py-4 bg-white rounded-b-2xl border-t flex items-center justify-between shrink-0">
          <button onClick={onClose} disabled={loading}
            className="text-sm text-slate-500 hover:text-red-600 font-medium transition-colors">
            Discard
          </button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handlePublish('draft')} isLoading={loading}>
              Save as Draft
            </Button>
            <Button onClick={() => handlePublish('live')} isLoading={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Publish Event Live
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
