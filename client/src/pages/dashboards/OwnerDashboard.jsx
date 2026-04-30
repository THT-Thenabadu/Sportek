import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/axios';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { Copy, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

function AddPropertyModal({ onClose, onAdded }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    sportType: '',
    description: '',
    pricePerHour: '',
    locationAddress: '',
    availableStart: '06:00',
    availableEnd: '22:00',
    slotDurationMinutes: 60,
    imageUrl: '',
    institution: user?.institution || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        sportType: form.sportType,
        description: form.description,
        pricePerHour: Number(form.pricePerHour),
        location: { address: form.locationAddress },
        availableHours: { start: form.availableStart, end: form.availableEnd },
        slotDurationMinutes: Number(form.slotDurationMinutes),
        images: form.imageUrl ? [form.imageUrl] : [],
        institution: form.institution,
      };
      const res = await api.post('/properties', payload);
      onAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create property.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Add New Property</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
          <Input label="Property Name" required placeholder="e.g. Sunrise Football Ground" value={form.name} onChange={e => set('name', e.target.value)} />
          <Input label="Institution / Business Name" required placeholder="e.g. Elite Sports Centre" value={form.institution} onChange={e => set('institution', e.target.value)} />
          <Input label="Sport Type" required placeholder="e.g. Football, Tennis, Cricket" value={form.sportType} onChange={e => set('sportType', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Describe the facility..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <Input label="Price Per Hour ($)" type="number" required min="1" placeholder="e.g. 50" value={form.pricePerHour} onChange={e => set('pricePerHour', e.target.value)} />
          <Input label="Address" required placeholder="e.g. 10 Sports Lane, Colombo 07" value={form.locationAddress} onChange={e => set('locationAddress', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Available From" type="time" required value={form.availableStart} onChange={e => set('availableStart', e.target.value)} />
            <Input label="Available Until" type="time" required value={form.availableEnd} onChange={e => set('availableEnd', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slot Duration (minutes)</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={form.slotDurationMinutes} onChange={e => set('slotDurationMinutes', e.target.value)}>
              {[30, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <Input label="Image URL (optional)" placeholder="https://..." value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
          <div className="flex justify-end gap-3 pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Add Property</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageSlotsModal({ property, onClose }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/bookings/slots/${property._id}`, { params: { date: selectedDate } });
      setSlots(res.data.slots || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch slots.');
    } finally {
      setLoading(false);
    }
  }, [property._id, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const toggleBlock = async (slot) => {
    try {
      if (slot.state === 'Blocked') {
        await api.patch(`/properties/${property._id}/unblock-slot`, { date: selectedDate, timeSlotStart: slot.start });
      } else {
        await api.patch(`/properties/${property._id}/block-slot`, { date: selectedDate, timeSlotStart: slot.start });
      }
      fetchSlots();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update slot status');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b mb-4">
          <h2 className="text-xl font-bold text-slate-900">Manage Slots - {property.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
          <input
            type="date"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {slots.map(s => {
              const isBooked = s.state === 'Booked';
              const isBlocked = s.state === 'Blocked';
              return (
                <button
                  key={s.start}
                  disabled={isBooked}
                  onClick={() => toggleBlock(s)}
                  className={`p-3 text-sm font-medium rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${isBooked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' :
                      isBlocked ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' :
                        'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    }`}
                >
                  <span>{s.start} - {s.end}</span>
                  <span className="text-xs opacity-75">{isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Available'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditPropertyModal({ property, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: property.name || '',
    sportType: property.sportType || '',
    description: property.description || '',
    pricePerHour: property.pricePerHour || '',
    locationAddress: property.location?.address || '',
    availableStart: property.availableHours?.start || '06:00',
    availableEnd: property.availableHours?.end || '22:00',
    slotDurationMinutes: property.slotDurationMinutes || 60,
    imageUrl: property.images && property.images.length > 0 ? property.images[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        sportType: form.sportType,
        description: form.description,
        pricePerHour: Number(form.pricePerHour),
        location: { address: form.locationAddress },
        availableHours: { start: form.availableStart, end: form.availableEnd },
        slotDurationMinutes: Number(form.slotDurationMinutes),
        images: form.imageUrl ? [form.imageUrl] : [],
      };
      const res = await api.put(`/properties/${property._id}`, payload);
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update property.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Edit Property</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
          <Input label="Property Name" required placeholder="e.g. Sunrise Football Ground" value={form.name} onChange={e => set('name', e.target.value)} />
          <Input label="Sport Type" required placeholder="e.g. Football, Tennis, Cricket" value={form.sportType} onChange={e => set('sportType', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Describe the facility..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <Input label="Price Per Hour ($)" type="number" required min="1" placeholder="e.g. 50" value={form.pricePerHour} onChange={e => set('pricePerHour', e.target.value)} />
          <Input label="Address" required placeholder="e.g. 10 Sports Lane, Colombo 07" value={form.locationAddress} onChange={e => set('locationAddress', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Available From" type="time" required value={form.availableStart} onChange={e => set('availableStart', e.target.value)} />
            <Input label="Available Until" type="time" required value={form.availableEnd} onChange={e => set('availableEnd', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slot Duration (minutes)</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={form.slotDurationMinutes} onChange={e => set('slotDurationMinutes', e.target.value)}>
              {[30, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <Input label="Image URL (optional)" placeholder="https://..." value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
          <div className="flex justify-end gap-3 pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BundleAssetsModal({ property, onClose, onUpdated }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set(property.bundledAssets?.map(a => a._id || a) || []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/assets/property/${property._id}`)
      .then(res => setAssets(res.data))
      .catch(err => setError('Failed to load assets.'))
      .finally(() => setLoading(false));
  }, [property._id]);

  const toggleAsset = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/properties/${property._id}`, { bundledAssets: Array.from(selectedIds) });
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to bundle assets.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Bundle Assets</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-slate-600 mb-4">Select the assets you want to display on the <strong>{property.name}</strong> venue page.</p>
          {error && <div className="p-3 mb-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}

          {loading ? (
            <p className="text-center text-slate-500 py-4">Loading assets...</p>
          ) : assets.length === 0 ? (
            <p className="text-center text-slate-500 py-4 border rounded-lg bg-slate-50">No assets found for this property.</p>
          ) : (
            <div className="space-y-2">
              {assets.map(a => (
                <label key={a._id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selectedIds.has(a._id)} onChange={() => toggleAsset(a._id)} className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500" />
                  <div className="flex-1 flex items-center gap-3">
                    {a.image ? (
                      <img src={a.image} alt={a.name} className="w-10 h-10 object-cover rounded-lg bg-slate-100 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs shrink-0 border">No Img</div>
                    )}
                    <div>
                      <p className="font-medium text-sm text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-500">{a.assetType} • Qty: {a.quantity}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-6 border-t shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={saving}>Save Bundle</Button>
        </div>
      </div>
    </div>
  );
}

export function OwnerProperties() {
  const [properties, setProperties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [slotProperty, setSlotProperty] = useState(null);
  const [bundleProperty, setBundleProperty] = useState(null);
  const [securityCreds, setSecurityCreds] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    api.get('/properties/my-properties').then(res => setProperties(res.data)).catch(console.error);

    // Fetch owner application to check for new security officer credentials
    api.get('/applications/my-application').then(res => {
      const app = res.data;
      if (app && app.securityTempPassword && !app.credentialsDismissed) {
        setSecurityCreds({
          email: app.securityEmail,
          password: app.securityTempPassword
        });
      }
    }).catch(() => { /* not all owners have this, suppress errors */ });
  }, []);

  const handleAdded = (newProp) => {
    setProperties(prev => [newProp, ...prev]);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    });
  };

  const dismissSecurityCreds = async () => {
    try {
      await api.patch('/applications/my-application/dismiss-credentials');
      setSecurityCreds(null);
    } catch (err) {
      alert('Failed to dismiss credentials');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this property? This cannot be undone')) {
      try {
        await api.delete(`/properties/${id}`);
        setProperties(prev => prev.filter(p => p._id !== id));
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete property');
      }
    }
  };

  return (
    <>
      {securityCreds && (
        <Card className="mb-6 bg-blue-50 border-blue-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-blue-100 bg-white rounded-t-xl">
            <CardTitle className="text-blue-900 text-lg flex items-center gap-2">
              <CheckCircle className="text-blue-600 w-5 h-5" />
              Your Security Officer account has been created
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800 mb-4">
              Give these credentials to your security staff. For security, please copy and save them now.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-5">
              <div className="flex-1 bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Security Login Email</p>
                  <p className="font-mono text-sm font-medium text-slate-900">{securityCreds.email}</p>
                </div>
                <button onClick={() => copyToClipboard(securityCreds.email, 'email')} className="text-slate-400 hover:text-blue-600 transition-colors p-2">
                  {copiedField === 'email' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex-1 bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Temporary Password</p>
                  <p className="font-mono text-sm font-medium text-slate-900">
                    {showPassword ? securityCreds.password : '••••••••••••'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-blue-600 transition-colors p-2">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => copyToClipboard(securityCreds.password, 'password')} className="text-slate-400 hover:text-blue-600 transition-colors p-2">
                    {copiedField === 'password' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={dismissSecurityCreds} variant="outline" className="bg-white hover:bg-slate-50 text-blue-700 border-blue-200">
                I have saved these credentials
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showModal && <AddPropertyModal onClose={() => setShowModal(false)} onAdded={handleAdded} />}
      {editingProperty && (
        <EditPropertyModal
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onUpdated={(updated) => {
            setProperties(prev => prev.map(p => p._id === updated._id ? updated : p));
          }}
        />
      )}
      {slotProperty && (
        <ManageSlotsModal
          property={slotProperty}
          onClose={() => setSlotProperty(null)}
        />
      )}
      {bundleProperty && (
        <BundleAssetsModal
          property={bundleProperty}
          onClose={() => setBundleProperty(null)}
          onUpdated={(updated) => {
            setProperties(prev => prev.map(p => p._id === updated._id ? updated : p));
          }}
        />
      )}
      <Card>
        <CardHeader className="flex justify-between flex-row items-center">
          <CardTitle>My Properties</CardTitle>
          <Button size="sm" onClick={() => setShowModal(true)}>+ Add Property</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {properties.length === 0 && <p className="text-slate-500 py-4 text-center">No properties yet. Add your first one!</p>}
          {properties.map(p => (
            <div key={p._id} className="border rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col md:flex-row">
              {p.images && p.images[0] ? (
                <div className="w-full md:w-48 h-32 md:h-auto shrink-0 border-b md:border-b-0 md:border-r border-slate-200">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full md:w-48 h-32 md:h-auto shrink-0 bg-slate-100 border-b md:border-b-0 md:border-r border-slate-200 flex items-center justify-center text-slate-400 text-sm font-medium">
                  No Image
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg">{p.name} <Badge variant={p.isActive ? 'success' : 'destructive'} className="ml-2">{p.isActive ? 'Active' : 'Deactivated'}</Badge></h3>
                  <p className="text-sm text-slate-500">{p.sportType} · {p.location?.address}</p>
                  <p className="text-sm font-semibold mt-1">${p.pricePerHour} / hour · {p.availableHours?.start} – {p.availableHours?.end}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setBundleProperty(p)}>Bundle Assets</Button>
                  <Button size="sm" variant="outline" className="border-primary-200 text-primary-700 hover:bg-primary-50" onClick={() => setSlotProperty(p)}>Manage Slots</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingProperty(p)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleDelete(p._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

// ── Add Asset Modal ──────────────────────────────────────────────────────────
function AddAssetModal({ propertyId, onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Equipment',
    assetType: '',
    quantity: 1,
    description: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let imageUrl = '';
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'SportekEvent');
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.secure_url) {
          imageUrl = uploadData.secure_url;
        } else {
          throw new Error('Image upload failed');
        }
      }

      const res = await api.post('/assets', {
        name: form.name,
        category: form.category,
        assetType: form.assetType,
        quantity: Number(form.quantity),
        description: form.description,
        notes: form.notes,
        image: imageUrl,
        property: propertyId,
        availableQuantity: Number(form.quantity),
      });
      onAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add asset.');
    } finally {
      setSaving(false);
    }
  };

  const selectCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Add New Asset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
          <Input label="Asset Name" required placeholder="e.g. Football, Tennis Net" value={form.name} onChange={e => set('name', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select className={selectCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {['Equipment', 'Facility Add-on', 'Safety/Misc'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Asset Type" required placeholder="e.g. Football, Tennis Racquet" value={form.assetType} onChange={e => set('assetType', e.target.value)} />
          <Input label="Quantity" type="number" required min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asset Image (Cloudinary)</label>
            <input type="file" accept="image/*" className="w-full text-sm border rounded-lg p-2 bg-slate-50" onChange={e => setFile(e.target.files[0])} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (for booking page)</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Describe the asset for customers..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes (optional)</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Any private notes about this asset..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Add Asset</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Asset Modal ─────────────────────────────────────────────────────────
function EditAssetModal({ asset, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: asset.name || '',
    category: asset.category || 'Equipment',
    assetType: asset.assetType || '',
    quantity: asset.quantity || 1,
    description: asset.description || '',
    notes: asset.notes || '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let imageUrl = asset.image;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'SportekEvent');
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.secure_url) {
          imageUrl = uploadData.secure_url;
        } else {
          throw new Error('Image upload failed');
        }
      }

      const res = await api.put(`/assets/${asset._id}`, {
        name: form.name,
        category: form.category,
        assetType: form.assetType,
        quantity: Number(form.quantity),
        description: form.description,
        notes: form.notes,
        image: imageUrl,
      });
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update asset.');
    } finally {
      setSaving(false);
    }
  };

  const selectCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Edit Asset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
          <Input label="Asset Name" required value={form.name} onChange={e => set('name', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select className={selectCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {['Equipment', 'Facility Add-on', 'Safety/Misc'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Asset Type" required value={form.assetType} onChange={e => set('assetType', e.target.value)} />
          <Input label="Total Quantity" type="number" required min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asset Image (Upload to replace)</label>
            {asset.image && !file && <img src={asset.image} alt={asset.name} className="h-16 rounded mb-2 border" />}
            <input type="file" accept="image/*" className="w-full text-sm border rounded-lg p-2 bg-slate-50" onChange={e => setFile(e.target.files[0])} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (for booking page)</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Update Health Modal ───────────────────────────────────────────────────────
function UpdateHealthModal({ asset, onClose, onUpdated }) {
  const [healthStatus, setHealthStatus] = useState(asset.healthStatus || 'good');
  const [notes, setNotes] = useState(asset.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/assets/${asset._id}/health`, { healthStatus, notes });
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update health status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-slate-900">Update Health — <span className="text-slate-500 font-medium">{asset.name}</span></h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Health Status</label>
            <select className={selectCls} value={healthStatus} onChange={e => setHealthStatus(e.target.value)}>
              {['good', 'fair', 'damaged', 'retired'].map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── OwnerAssets ───────────────────────────────────────────────────────────────
export function OwnerAssets() {
  const [assets, setAssets] = useState([]);
  const [propertyId, setPropertyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHealthAsset, setEditingHealthAsset] = useState(null);
  const [editingFullAsset, setEditingFullAsset] = useState(null);

  useEffect(() => {
    api.get('/properties/my-properties').then(async (propRes) => {
      if (propRes.data.length > 0) {
        const pid = propRes.data[0]._id;
        setPropertyId(pid);
        const res = await api.get(`/assets/property/${pid}`);
        setAssets(res.data);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleAdded = (newAsset) => setAssets(prev => [newAsset, ...prev]);
  const handleUpdated = (updatedAsset) => setAssets(prev => prev.map(a => a._id === updatedAsset._id ? updatedAsset : a));

  const healthBadge = (status) => {
    const map = {
      good: 'bg-emerald-100 text-emerald-700',
      fair: 'bg-amber-100 text-amber-700',
      damaged: 'bg-red-100 text-red-700',
      retired: 'bg-slate-100 text-slate-500',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || map.retired}`}>
        {status}
      </span>
    );
  };

  return (
    <>
      {showAddModal && propertyId && (
        <AddAssetModal propertyId={propertyId} onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
      )}
      {editingHealthAsset && (
        <UpdateHealthModal asset={editingHealthAsset} onClose={() => setEditingHealthAsset(null)} onUpdated={handleUpdated} />
      )}
      {editingFullAsset && (
        <EditAssetModal asset={editingFullAsset} onClose={() => setEditingFullAsset(null)} onUpdated={handleUpdated} />
      )}

      <Card>
        <CardHeader className="flex flex-row justify-between items-center bg-slate-50 border-b">
          <CardTitle>Asset Management</CardTitle>
          <Button size="sm" onClick={() => setShowAddModal(true)} disabled={!propertyId}>
            + Add Asset
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-slate-500 py-8 text-sm">Loading assets...</p>
          ) : assets.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">No assets yet. Add your first asset above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    {['Image', 'Name', 'Type', 'Category', 'Qty', 'Available', 'Health', 'Returned', 'Notes', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => {
                    const retired = a.healthStatus === 'retired';
                    return (
                      <tr key={a._id} className={`border-b transition-colors ${retired ? 'opacity-50 bg-slate-50' : 'bg-white hover:bg-slate-50/60'}`}>
                        <td className="px-4 py-3">
                          {a.image ? (
                            <img src={a.image} alt={a.name} className="w-10 h-10 object-cover rounded shadow-sm border" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 rounded border flex items-center justify-center text-slate-400 text-xs">No Img</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{a.name}</td>
                        <td className="px-4 py-3 text-slate-500">{a.assetType}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{a.category}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{a.quantity}</td>
                        <td className="px-4 py-3 text-center font-mono">
                          {retired ? <span className="text-slate-400">—</span> : (
                            <span className={a.availableQuantity === 0 ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                              {a.availableQuantity}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{healthBadge(a.healthStatus)}</td>
                        <td className="px-4 py-3 text-center">
                          {a.isReturned
                            ? <span className="text-emerald-600 font-semibold text-xs">✓ Yes</span>
                            : <span className="text-amber-600 font-semibold text-xs">⏳ No</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate" title={a.notes}>{a.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingFullAsset(a)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingHealthAsset(a)}>
                              Health
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}



export function OwnerWarnings() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedIds, setResolvedIds] = useState(new Set());

  const fetchWarnings = () => {
    api.get('/warnings/my-warnings')
      .then(res => setWarnings(res.data?.warnings || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWarnings();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/warnings/${id}/read`);
      setWarnings(prev => prev.map(w => w._id === id ? { ...w, isRead: true } : w));
    } catch (err) {
      alert('Failed to mark read');
    }
  };

  const markResolved = async (complaintId, warningId) => {
    try {
      await api.patch(`/complaints/${complaintId}/status`, { status: 'resolved' });
      setResolvedIds(prev => new Set([...prev, warningId]));
    } catch (err) {
      alert('Failed to resolve complaint');
    }
  };

  return (
    <Card>
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Dashboard Warnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {loading ? (
          <p className="text-center text-slate-500 py-4">Loading warnings...</p>
        ) : warnings.length === 0 ? (
          <p className="text-center text-slate-500 py-4">You have no warnings.</p>
        ) : (
          warnings.map(w => (
            <div key={w._id} className={`p-5 rounded-xl border bg-white shadow-sm flex items-start gap-4 transition-colors ${!w.isRead ? 'border-l-4 border-l-red-500 border-slate-200' : 'border-slate-200 opacity-80'}`}>
              <div className="flex-1">
                <p className={`text-base ${!w.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>{w.message}</p>
                <div className="text-sm mt-2 text-slate-500 flex flex-wrap gap-2 items-center">
                  <Badge variant="outline">{w.complaintId?.subject || 'General Notice'}</Badge>
                  <span>• {new Date(w.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                {!w.isRead && (
                  <Button size="sm" variant="outline" onClick={() => markAsRead(w._id)}>Mark as Read</Button>
                )}
                {resolvedIds.has(w._id) && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">Resolved</span>
                )}
                {w.complaintId && !resolvedIds.has(w._id) && (
                  <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => markResolved(w.complaintId._id, w._id)}>
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function OwnerRescheduleModal({ request, onClose, onApproved }) {
  const [selectedDate, setSelectedDate] = useState(request.requestedDate ? request.requestedDate.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(request.requestedTimeSlot || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!request) return;
    setLoadingSlots(true);
    setError('');
    api.get(`/bookings/slots/${request.propertyId._id}`, { params: { date: selectedDate } })
      .then(r => {
        const fetchedSlots = r.data.slots || r.data || [];
        setSlots(fetchedSlots.filter(s => s.state === 'Available' || (s.start === request.requestedTimeSlot?.start && selectedDate === (request.requestedDate ? request.requestedDate.split('T')[0] : ''))));
        setLoadingSlots(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load slots');
        setLoadingSlots(false);
      });
  }, [request, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return setError('Please select a time slot.');
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/reschedule/${request._id}/approve`, {
        newDate: selectedDate,
        newTimeSlot: selectedSlot
      });
      onApproved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reschedule.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between pb-4 border-b mb-4">
          <h2 className="text-xl font-bold text-slate-900">Reschedule Booking</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}

          {request.customerMessage && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
              <span className="font-semibold block mb-1">Customer Message:</span>
              "{request.customerMessage}"
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Available Slots</label>
            {loadingSlots ? (
              <div className="py-4 flex justify-center"><div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            ) : slots.length === 0 ? (
              <p className="text-slate-500 text-sm py-2">No available slots for this date.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {slots.map(s => (
                  <button
                    type="button"
                    key={s.start}
                    onClick={() => setSelectedSlot(s)}
                    className={`p-2 text-sm font-medium rounded-lg border transition-all ${selectedSlot && selectedSlot.start === s.start
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-primary-500 hover:text-primary-600'
                      }`}
                  >
                    {s.start} - {s.end}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={submitting} disabled={!selectedSlot}>Confirm & Approve</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OwnerRescheduleRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageModal, setMessageModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [ownerMessage, setOwnerMessage] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reschedule/owner');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reschedule requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id) => {
    setSubmittingAction(true);
    try {
      await api.patch(`/reschedule/${id}/approve`);
      alert('Request approved successfully.');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve request.');
      setSubmittingAction(false);
    }
  };

  const handleDecline = async (e) => {
    e.preventDefault();
    if (!messageModal) return;
    setSubmittingAction(true);
    try {
      await api.patch(`/reschedule/${messageModal._id}/decline`, { ownerMessage });
      alert('Request declined with message.');
      setMessageModal(null);
      setOwnerMessage('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Reschedule Requests</h1>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>}

      {requests.length === 0 ? (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm text-slate-500">
          No pending reschedule requests.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className="bg-slate-50 font-semibold text-slate-900">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Property</th>
                <th className="px-6 py-4">Current Slot</th>
                <th className="px-6 py-4">Requested Slot</th>
                <th className="px-6 py-4">Institution Match</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {requests.map(r => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{r.customerId?.name || 'Unknown Customer'}</div>
                    {r.customerMessage && (
                      <div className="text-xs text-slate-500 mt-1 italic truncate max-w-xs" title={r.customerMessage}>
                        Msg: "{r.customerMessage}"
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">{r.propertyId?.name || 'Property'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span>{r.currentDate ? new Date(r.currentDate).toLocaleDateString() : '—'}</span>
                      <span className="text-xs text-slate-500">{r.currentTimeSlot?.start} - {r.currentTimeSlot?.end}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col font-semibold text-primary-700">
                      <span>{r.requestedDate ? new Date(r.requestedDate).toLocaleDateString() : '—'}</span>
                      <span className="text-xs">{r.requestedTimeSlot?.start} - {r.requestedTimeSlot?.end}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {r.sameInstitution ? (
                      <Badge variant="success" className="bg-blue-50 text-blue-700 border-blue-200">Same Institution</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">No Match</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={submittingAction}
                        onClick={() => setRescheduleModal(r)}
                      >
                        Reschedule / Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submittingAction}
                        onClick={() => setMessageModal(r)}
                      >
                        Decline
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {messageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b mb-4">
              <h2 className="text-xl font-bold text-slate-900">Send Message / Decline</h2>
              <button onClick={() => { setMessageModal(null); setOwnerMessage(''); }} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleDecline} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message to Customer</label>
                <textarea
                  rows={3}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  value={ownerMessage}
                  onChange={e => setOwnerMessage(e.target.value)}
                  placeholder="Explain why the request is declined..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setMessageModal(null); setOwnerMessage(''); }}>Cancel</Button>
                <Button type="submit" isLoading={submittingAction}>Send & Decline</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rescheduleModal && (
        <OwnerRescheduleModal
          request={rescheduleModal}
          onClose={() => setRescheduleModal(null)}
          onApproved={() => { alert('Rescheduled successfully.'); fetchRequests(); }}
        />
      )}
    </div>
  );
}
