import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { Copy, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';

function AddPropertyModal({ onClose, onAdded }) {
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

export function OwnerProperties() {
  const [properties, setProperties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [securityCreds, setSecurityCreds] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    api.get('/properties').then(res => setProperties(res.data)).catch(console.error);
    
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
      <Card>
        <CardHeader className="flex justify-between flex-row items-center">
          <CardTitle>My Properties</CardTitle>
          <Button size="sm" onClick={() => setShowModal(true)}>+ Add Property</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {properties.length === 0 && <p className="text-slate-500 py-4 text-center">No properties yet. Add your first one!</p>}
          {properties.map(p => (
            <div key={p._id} className="p-4 border rounded-lg bg-white flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-bold text-lg">{p.name} <Badge variant={p.isActive ? 'success' : 'destructive'} className="ml-2">{p.isActive ? 'Active' : 'Deactivated'}</Badge></h3>
                <p className="text-sm text-slate-500">{p.sportType} · {p.location?.address}</p>
                <p className="text-sm font-semibold mt-1">${p.pricePerHour} / hour · {p.availableHours?.start} – {p.availableHours?.end}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Edit</Button>
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
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/assets', {
        name: form.name,
        category: form.category,
        assetType: form.assetType,
        quantity: Number(form.quantity),
        notes: form.notes,
        property: propertyId, // Explicitly include the property ID
        availableQuantity: Number(form.quantity),
      });
      onAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add asset.');
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
          <Input label="Asset Type" required placeholder="e.g. Football, Tennis Racquet, First Aid Kit" value={form.assetType} onChange={e => set('assetType', e.target.value)} />
          <Input label="Quantity" type="number" required min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Any notes about this asset..." value={form.notes} onChange={e => set('notes', e.target.value)} />
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
  const [editingAsset, setEditingAsset] = useState(null);

  useEffect(() => {
    api.get('/properties').then(async (propRes) => {
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
      {editingAsset && (
        <UpdateHealthModal asset={editingAsset} onClose={() => setEditingAsset(null)} onUpdated={handleUpdated} />
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
                    {['Name', 'Type', 'Category', 'Qty', 'Available', 'Health', 'Returned', 'Notes', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => {
                    const retired = a.healthStatus === 'retired';
                    return (
                      <tr key={a._id} className={`border-b transition-colors ${retired ? 'opacity-50 bg-slate-50' : 'bg-white hover:bg-slate-50/60'}`}>
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
                          <Button size="sm" variant="outline" onClick={() => setEditingAsset(a)}>
                            Update Health
                          </Button>
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

