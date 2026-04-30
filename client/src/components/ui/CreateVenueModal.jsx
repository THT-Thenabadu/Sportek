import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import Button from './Button';

const VENUE_TYPES = ['Stadium', 'Arena', 'Hall', 'Court', 'Field', 'Gymnasium', 'Auditorium', 'Other'];

const SECTION_STYLES = 'bg-white rounded-xl border border-slate-200 p-5 space-y-4';
const LABEL = 'block text-sm font-semibold text-slate-700 mb-1';
const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800';

// Upload image to Cloudinary
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

// Generate seat structure from rows
function buildSeats(rows) {
  const seats = [];
  rows.forEach(row => {
    if (!row.rowLabel || !row.seatCount) return;
    for (let s = 1; s <= Number(row.seatCount); s++) {
      seats.push({ row: row.rowLabel, seat: s, id: `${row.rowLabel}${s}` });
    }
  });
  return seats;
}

export default function CreateVenueModal({ venue, onClose, onSaved }) {
  const isEdit = !!venue;
  const fileRef = useRef(null);

  const [step, setStep] = useState(1); // 1, 2, 3
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(venue?.seatLayoutImage || '');

  const [basic, setBasic] = useState({
    name:          venue?.name          || '',
    venueType:     venue?.venueType     || VENUE_TYPES[0],
    totalCapacity: venue?.totalCapacity || '',
    description:   venue?.description   || '',
  });

  const [location, setLocation] = useState({
    address:      venue?.address      || '',
    city:         venue?.city         || '',
    locationType: venue?.locationType || 'indoor',
  });

  const [rows, setRows] = useState(
    venue?.seatRows?.length
      ? venue.seatRows.map(r => ({ rowLabel: r.rowLabel, seatCount: r.seatCount }))
      : [{ rowLabel: 'A', seatCount: 10 }]
  );

  const seats = buildSeats(rows);

  const addRow = () => {
    const nextLabel = String.fromCharCode(65 + rows.length); // A, B, C...
    setRows([...rows, { rowLabel: nextLabel, seatCount: 10 }]);
  };

  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  const updateRow = (i, field, val) => {
    const updated = [...rows];
    updated[i][field] = field === 'seatCount' ? Number(val) : val;
    setRows(updated);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let seatLayoutImage = venue?.seatLayoutImage || '';
      if (imageFile) seatLayoutImage = await uploadImage(imageFile);

      const payload = {
        ...basic,
        totalCapacity: Number(basic.totalCapacity),
        ...location,
        seatLayoutImage: location.locationType === 'indoor' ? seatLayoutImage : '',
        seatRows: location.locationType === 'indoor' ? rows : [],
      };

      await onSaved(payload, isEdit ? venue._id : null);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to save venue');
    } finally {
      setLoading(false);
    }
  };

  const canNext1 = basic.name && basic.venueType && basic.totalCapacity;
  const canNext2 = location.address && location.city && location.locationType;

  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Location' },
    { num: 3, label: 'Seat Details' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white rounded-t-2xl border-b shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Venue' : 'Create New Venue'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-4 bg-white border-b shrink-0">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > s.num ? 'bg-emerald-500 text-white' :
                  step === s.num ? 'bg-slate-900 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`text-sm font-medium ${step === s.num ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${step > s.num ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div className={SECTION_STYLES}>
              <h3 className="font-bold text-slate-800">Basic Venue Information</h3>

              <div>
                <label className={LABEL}>Venue Name <span className="text-red-500">*</span></label>
                <input className={INPUT} placeholder="e.g. National Sports Arena"
                  value={basic.name} onChange={e => setBasic({ ...basic, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Venue Type <span className="text-red-500">*</span></label>
                  <select className={INPUT} value={basic.venueType}
                    onChange={e => setBasic({ ...basic, venueType: e.target.value })}>
                    {VENUE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Total Capacity <span className="text-red-500">*</span></label>
                  <input type="number" min="1" className={INPUT} placeholder="e.g. 5000"
                    value={basic.totalCapacity}
                    onChange={e => setBasic({ ...basic, totalCapacity: e.target.value })} />
                </div>
              </div>

              <div>
                <label className={LABEL}>Description</label>
                <textarea rows={3} className={INPUT + ' resize-none'} placeholder="Brief description of the venue..."
                  value={basic.description}
                  onChange={e => setBasic({ ...basic, description: e.target.value })} />
              </div>
            </div>
          )}

          {/* ── Step 2: Location ── */}
          {step === 2 && (
            <div className={SECTION_STYLES}>
              <h3 className="font-bold text-slate-800">Location Details</h3>

              <div>
                <label className={LABEL}>Address <span className="text-red-500">*</span></label>
                <input className={INPUT} placeholder="Street address"
                  value={location.address}
                  onChange={e => setLocation({ ...location, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>City <span className="text-red-500">*</span></label>
                  <input className={INPUT} placeholder="e.g. Colombo"
                    value={location.city}
                    onChange={e => setLocation({ ...location, city: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Venue Environment <span className="text-red-500">*</span></label>
                  <div className="flex gap-3 mt-1">
                    {['indoor', 'outdoor'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setLocation({ ...location, locationType: t })}
                        className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${
                          location.locationType === t
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Seat Details (indoor only) ── */}
          {step === 3 && (
            <>
              {location.locationType === 'outdoor' ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-500 font-medium">Seat layout is not applicable for outdoor venues.</p>
                  <p className="text-slate-400 text-sm mt-1">You can proceed to save.</p>
                </div>
              ) : (
                <>
                  {/* Layout image upload */}
                  <div className={SECTION_STYLES}>
                    <h3 className="font-bold text-slate-800">Seat Layout Map</h3>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-slate-500 transition-colors"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="layout" className="max-h-48 mx-auto rounded-lg object-contain" />
                      ) : (
                        <div className="text-slate-400">
                          <Upload className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">Click to upload seat layout image</p>
                          <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </div>

                  {/* Row assignment */}
                  <div className={SECTION_STYLES}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Seat Row Assignment</h3>
                      <Button size="sm" variant="outline" onClick={addRow}>
                        <Plus className="w-3 h-3 mr-1" /> Add Row
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {rows.map((row, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Row Label</label>
                            <input className={INPUT + ' font-mono uppercase'} maxLength={3}
                              value={row.rowLabel}
                              onChange={e => updateRow(i, 'rowLabel', e.target.value.toUpperCase())} />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Seats in Row</label>
                            <input type="number" min="1" max="100" className={INPUT}
                              value={row.seatCount}
                              onChange={e => updateRow(i, 'seatCount', e.target.value)} />
                          </div>
                          <button onClick={() => removeRow(i)}
                            className="mt-5 text-slate-400 hover:text-red-500 transition-colors"
                            disabled={rows.length === 1}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto-generated seat preview */}
                  {seats.length > 0 && (
                    <div className={SECTION_STYLES}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Seat Structure Preview</h3>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          {seats.length} seats total
                        </span>
                      </div>

                      {/* Stage indicator */}
                      <div className="w-full bg-slate-800 text-white text-xs font-semibold text-center py-2 rounded-lg tracking-widest">
                        STAGE / FIELD
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {rows.map((row, ri) => (
                          row.rowLabel && row.seatCount ? (
                            <div key={ri} className="flex items-center gap-2">
                              <span className="w-8 text-xs font-bold text-slate-600 text-center shrink-0">
                                {row.rowLabel}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {Array.from({ length: Number(row.seatCount) }, (_, si) => (
                                  <div
                                    key={si}
                                    title={`${row.rowLabel}${si + 1}`}
                                    className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-[9px] font-bold text-emerald-700 hover:bg-emerald-200 transition-colors cursor-default"
                                  >
                                    {si + 1}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white rounded-b-2xl border-t flex items-center justify-between shrink-0">
          <Button variant="outline" onClick={step === 1 ? onClose : () => setStep(s => s - 1)} disabled={loading}>
            {step === 1 ? 'Cancel' : '← Back'}
          </Button>
          <div className="flex gap-3">
            {step < 3 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 ? !canNext1 : !canNext2}
              >
                Next →
              </Button>
            ) : (
              <Button onClick={handleSubmit} isLoading={loading}>
                {isEdit ? 'Save Changes' : 'Create Venue'}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
