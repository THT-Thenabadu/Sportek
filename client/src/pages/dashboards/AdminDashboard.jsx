import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Users, UserPlus, CheckCircle, XCircle, Clock, ShieldCheck, Copy, Eye, EyeOff, Ticket, X, Star, MessageCircleWarning, Package } from 'lucide-react';
import Input from '../../components/ui/Input';

// ─── User Management Section ──────────────────────────────────────────────────
export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users')
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleBan = async (id, currentStatus) => {
    try {
      await api.patch(`/users/${id}/ban`, { isBanned: !currentStatus });
      setUsers(users.map(u => u._id === id ? { ...u, isBanned: !currentStatus } : u));
    } catch (err) {
      alert('Error updating user');
    }
  };

  const roleVariant = (role) => {
    if (role === 'admin' || role === 'superAdmin') return 'default';
    if (role === 'propertyOwner') return 'success';
    if (role === 'securityOfficer') return 'warning';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-slate-500 text-sm py-4 text-center">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.isBanned
                        ? <Badge variant="destructive">Banned</Badge>
                        : <Badge variant="success">Active</Badge>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant={u.isBanned ? 'outline' : 'danger'}
                        size="sm"
                        onClick={() => toggleBan(u._id, u.isBanned)}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Security Officer Credentials Banner ──────────────────────────────────────
function SecurityCreatedBanner({ creds, onDismiss }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied]             = useState('');

  const copy = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900 text-sm">Security Officer Account Created</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Share these credentials with the security staff. <strong>This password will only be shown once.</strong>
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-emerald-500 hover:text-emerald-700 transition-colors mt-0.5 shrink-0"
          title="Dismiss"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Credentials grid */}
      <div className="space-y-2">
        {/* Name */}
        <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-emerald-200">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Name</p>
            <p className="text-sm font-medium text-slate-800">{creds.name}</p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-emerald-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">Email</p>
            <p className="text-sm font-medium text-slate-800 font-mono truncate">{creds.email}</p>
          </div>
          <button
            onClick={() => copy(creds.email, 'email')}
            className="ml-3 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
            title="Copy email"
          >
            {copied === 'email' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Password */}
        {creds.password ? (
          <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-emerald-200">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">Password</p>
              <p className="text-sm font-medium text-slate-800 font-mono">
                {showPassword ? creds.password : '••••••••••••'}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <button
                onClick={() => setShowPassword(v => !v)}
                className="text-slate-400 hover:text-emerald-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => copy(creds.password, 'password')}
                className="text-slate-400 hover:text-emerald-600 transition-colors"
                title="Copy password"
              >
                {copied === 'password' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-lg px-4 py-2.5 border border-amber-200">
            <p className="text-xs text-amber-700">
              A security officer account already existed for this owner. Password is not available — the account was not recreated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Owner Applications Section ───────────────────────────────────────────────
export function AdminApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  // { appId, creds: { name, email, password } } - shown after approve
  const [newSecurityCreds, setNewSecurityCreds] = useState(null);

  useEffect(() => {
    api.get('/applications')
      .then(res => setApps(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDecision = async (id, action) => {
    setActionLoading(id);
    setNewSecurityCreds(null); // clear any previous banner
    try {
      const res = await api.patch(`/applications/${id}/${action}`);
      const { application: updatedApp, securityOfficer } = res.data;

      // Update local app list with returned application data
      setApps(prev =>
        prev.map(a => a._id === id ? { ...a, status: updatedApp.status } : a)
      );

      // If approval created a security officer, surface the credentials
      if (action === 'approve' && securityOfficer) {
        setNewSecurityCreds({ appId: id, creds: securityOfficer });
        // Auto-scroll to top of section so the banner is visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || 'Could not update application'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetCredentials = async (id) => {
    setActionLoading(id);
    setNewSecurityCreds(null);
    try {
      const res = await api.get(`/applications/${id}/security-credentials`);
      setNewSecurityCreds({ appId: id, creds: res.data });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || 'Could not reset credentials'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending:  { variant: 'warning',     icon: <Clock       className="w-3 h-3 mr-1" />, label: 'Pending'  },
      approved: { variant: 'success',     icon: <CheckCircle className="w-3 h-3 mr-1" />, label: 'Approved' },
      declined: { variant: 'destructive', icon: <XCircle     className="w-3 h-3 mr-1" />, label: 'Declined' },
    };
    const cfg = map[status] || map.pending;
    return (
      <Badge variant={cfg.variant} className="inline-flex items-center">
        {cfg.icon}{cfg.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary-600" />
          Owner Applications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security officer credentials banner — shown immediately after approval */}
        {newSecurityCreds && (
          <SecurityCreatedBanner
            creds={newSecurityCreds.creds}
            onDismiss={() => setNewSecurityCreds(null)}
          />
        )}

        {loading ? (
          <p className="text-slate-500 text-sm py-4 text-center">Loading applications…</p>
        ) : apps.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No applications found.</p>
        ) : (
          apps.map(a => (
            <div
              key={a._id}
              className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                {/* Applicant Info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800 text-base">{a.businessName}</h3>
                    {statusBadge(a.status)}
                  </div>
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{a.applicantId?.name}</span>
                    {' '}•{' '}
                    <span>{a.applicantId?.email}</span>
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-2">{a.propertyDescription}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs text-slate-500">
                    <span><span className="font-medium text-slate-600">Address:</span> {a.address}</span>
                    <span><span className="font-medium text-slate-600">NIC/Passport:</span> {a.nicOrPassport}</span>
                    <span><span className="font-medium text-slate-600">Bank Details:</span> {a.bankDetails}</span>
                    <span><span className="font-medium text-slate-600">Applied:</span> {new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  {/* Decline reason if present */}
                  {a.status === 'declined' && a.declineReason && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 rounded px-2 py-1 border border-red-100">
                      <span className="font-medium">Reason:</span> {a.declineReason}
                    </p>
                  )}
                </div>

                {/* Action Buttons — only while pending */}
                {a.status === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={actionLoading === a._id}
                      disabled={actionLoading !== null}
                      onClick={() => handleDecision(a._id, 'approve')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      isLoading={actionLoading === a._id}
                      disabled={actionLoading !== null}
                      onClick={() => handleDecision(a._id, 'decline')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}

                {/* Reset Credentials Buttons — for legacy owners */}
                {a.status === 'approved' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={actionLoading === a._id}
                      disabled={actionLoading !== null}
                      onClick={() => handleResetCredentials(a._id)}
                      title="Generates a new password for the security officer and shows it on the owner dashboard."
                    >
                      <ShieldCheck className="w-4 h-4 mr-1" />
                      Reset Security Credentials
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Events Management Section ───────────────────────────────────────────────
const uploadImageToCloudinary = async (file) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: data
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Cloudinary upload failed');
  return json.secure_url;
};

function CreateEventModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '', description: '', date: '', time: '', location: '',
    ticketTiers: [
      { tier: 'Gold', price: '', totalQuantity: '' },
      { tier: 'Silver', price: '', totalQuantity: '' },
      { tier: 'Bronze', price: '', totalQuantity: '' }
    ]
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const updateTier = (idx, field, value) => {
    const freshTiers = [...formData.ticketTiers];
    freshTiers[idx][field] = value;
    setFormData({ ...formData, ticketTiers: freshTiers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let bannerImage = '';
      if (imageFile) {
        bannerImage = await uploadImageToCloudinary(imageFile);
      }

      await api.post('/events', { ...formData, bannerImage });
      onCreated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-10 md:mt-0 p-6 relative h-auto max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 mb-4 shrink-0">Create New Event</h2>
        
        <div className="overflow-y-auto flex-1 pr-2">
          <form id="create-event-form" onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label="Event Name" required
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 max-h-24"
                rows="3"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                type="date" label="Date" required
                value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
              <Input 
                type="time" label="Time" required
                value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} 
              />
            </div>
            <Input 
              label="Location" required
              value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} 
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banner Image (Cloudinary)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setImageFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm">Ticket Tiers</h3>
              {formData.ticketTiers.map((t, idx) => (
                <div key={t.tier} className="flex gap-4 mb-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t.tier} Price ($)</label>
                    <input 
                       type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                       required min="0" value={t.price} onChange={e => updateTier(idx, 'price', Number(e.target.value))} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t.tier} Total Qty</label>
                    <input 
                       type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                       required min="0" value={t.totalQuantity} onChange={e => updateTier(idx, 'totalQuantity', Number(e.target.value))} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>

        <div className="pt-4 border-t mt-4 flex justify-end gap-3 shrink-0">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="create-event-form" isLoading={loading}>Create Event</Button>
        </div>
      </div>
    </div>
  );
}

export function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchEvents = () => {
    setLoading(true);
    api.get('/events')
      .then(res => setEvents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setDeleting(id);
    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter(e => e._id !== id));
    } catch (err) {
      alert('Failed to delete event');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary-600" />
          Events Management
        </CardTitle>
        <Button onClick={() => setShowModal(true)}>Create Event</Button>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <p className="text-center text-slate-500 py-4">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No events found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Event Name</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e._id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(e.date).toLocaleDateString()} {e.time}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.location}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{e.status}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={deleting === e._id}
                        onClick={() => handleDelete(e._id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {showModal && (
        <CreateEventModal onClose={() => setShowModal(false)} onCreated={fetchEvents} />
      )}
    </Card>
  );
}

// ─── Reviews Management Section ──────────────────────────────────────────────
export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reviews/admin')
      .then(res => setReviews(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalReviews = reviews.length;
  const avgRating = totalReviews ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) : 0;
  const fiveStars = reviews.filter(r => r.rating === 5).length;

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-slate-300'}>★</span>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Reviews</h3>
            <p className="text-3xl font-bold mt-2">{totalReviews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-sm font-semibold text-slate-500 uppercase">Average Rating</h3>
            <p className="text-3xl font-bold mt-2">{avgRating}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-sm font-semibold text-slate-500 uppercase">Five Star Reviews</h3>
            <p className="text-3xl font-bold mt-2">{fiveStars}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-4">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-center text-slate-500 py-4">No reviews found.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <Card key={r._id}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-slate-800">{r.propertyId?.name || 'Unknown Property'}</span>
                    <span className="text-sm text-slate-500 mx-2">•</span>
                    <span className="text-sm font-medium text-slate-700">{r.customerId?.name || 'Unknown User'}</span>
                    <span className="text-xs text-slate-400 ml-2">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-0.5 text-lg leading-none">{renderStars(r.rating)}</div>
                </div>
                {r.comment && <p className="text-slate-600 text-sm italic">"{r.comment}"</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Complaints Management Section ───────────────────────────────────────────
function ComplaintCard({ complaint, onStatusUpdate, onWarnOwner }) {
  const [warningMsg, setWarningMsg] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [warningSuccess, setWarningSuccess] = useState(false);
  
  const isClosed = complaint.status === 'resolved' || complaint.status === 'dismissed';

  const handleResolve = async () => {
    setActionLoading(true);
    await onStatusUpdate(complaint._id, 'resolved');
    setActionLoading(false);
  };

  const handleWarn = async () => {
    if (!warningMsg.trim()) return;
    setActionLoading(true);
    await onWarnOwner(complaint._id, warningMsg);
    setWarningMsg('');
    setShowWarning(false);
    setWarningSuccess(true);
    setTimeout(() => setWarningSuccess(false), 3000);
    setActionLoading(false);
  };

  let badgeVariant = 'default';
  if (complaint.status === 'open') badgeVariant = 'outline';
  else if (complaint.status === 'under_review') badgeVariant = 'warning';
  else if (complaint.status === 'resolved') badgeVariant = 'success';
  else if (complaint.status === 'dismissed') badgeVariant = 'outline';

  const truncatedDesc = complaint.description.length > 120 
    ? complaint.description.substring(0, 120) + '...' 
    : complaint.description;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-slate-900">{complaint.subject}</h3>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-700">{complaint.customerId?.name}</span> against <span className="font-medium text-slate-700">{complaint.propertyId?.name}</span>
              <span className="ml-2">— {new Date(complaint.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
          {complaint.status === 'open' ? (
            <Badge variant="outline" className="text-blue-600 border-blue-600 capitalize">Open</Badge>
          ) : (
            <Badge variant={badgeVariant} className="capitalize">{complaint.status.replace('_', ' ')}</Badge>
          )}
        </div>

        <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
          {truncatedDesc}
        </div>

        <div className="border-t pt-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-end">
          
          <div className="flex-shrink-0 w-full sm:w-auto">
            {warningSuccess ? (
              <div className="text-sm text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded">
                Warning sent
              </div>
            ) : showWarning ? (
              <div className="flex flex-col gap-2 w-full">
                <textarea 
                  placeholder="Warning message for owner" 
                  value={warningMsg} 
                  onChange={e => setWarningMsg(e.target.value)}
                  className="border border-slate-300 rounded text-sm p-2 w-full min-w-[250px] focus:ring-primary-500 bg-white resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowWarning(false)}>Cancel</Button>
                  <Button size="sm" variant="danger" onClick={handleWarn} isLoading={actionLoading} disabled={actionLoading || !warningMsg.trim()}>Send Warning</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowWarning(true)} disabled={isClosed}>
                Warn Owner
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/complaints')
      .then(res => setComplaints(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await api.patch(`/complaints/${id}/status`, { status });
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status: res.data.complaint ? res.data.complaint.status : status } : c));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleWarnOwner = async (id, message) => {
    try {
      const res = await api.post(`/complaints/${id}/warn`, { message });
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status: res.data.complaint.status } : c));
    } catch (err) {
      alert('Failed to warn owner');
    }
  };

  const filtered = filter === 'All' ? complaints : complaints.filter(c => c.status === filter.toLowerCase().replace(' ', '_'));

  return (
    <Card>
      <CardHeader className="bg-slate-50 border-b p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <MessageCircleWarning className="w-5 h-5 text-primary-600" />
            Complaints Directory
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {['All', 'Open', 'Under Review', 'Resolved'].map(f => (
              <button 
                key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${filter === f ? 'bg-primary-600 text-white font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <p className="text-center text-slate-500 py-4">Loading complaints...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-4 text-sm">No complaints found for this filter.</p>
        ) : (
          filtered.map(c => (
             <ComplaintCard key={c._id} complaint={c} onStatusUpdate={handleStatusUpdate} onWarnOwner={handleWarnOwner} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Admin Assets Section ────────────────────────────────────────────────────
export function AdminAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/assets/admin/all')
      .then(res => setAssets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  const filteredAssets = filter === 'All' ? assets : assets.filter(a => a.healthStatus === filter);

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center bg-slate-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" />
          Platform Assets
        </CardTitle>
        <div className="flex gap-2">
          {['All', 'good', 'fair', 'damaged', 'retired'].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-center text-slate-500 py-8 text-sm">Loading assets...</p>
        ) : filteredAssets.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">No assets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Asset Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Property Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Health Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Available</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Returned</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap text-right">Last Used Booking</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map(a => {
                  const damaged = a.healthStatus === 'damaged';
                  return (
                    <tr key={a._id} className={`border-b transition-colors ${damaged ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-slate-50/60'}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{a.name}</td>
                      <td className="px-4 py-3 text-slate-500">{a.assetType}</td>
                      <td className="px-4 py-3 text-slate-700">{a.property?.name || '—'}</td>
                      <td className="px-4 py-3">{healthBadge(a.healthStatus)}</td>
                      <td className="px-4 py-3 font-mono">{a.healthStatus === 'retired' ? '—' : a.availableQuantity}</td>
                      <td className="px-4 py-3">
                        {a.isReturned
                          ? <span className="text-emerald-600 font-semibold text-xs">✓ Yes</span>
                          : <span className="text-amber-600 font-semibold text-xs">⏳ No</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-500 truncate max-w-[120px]" title={a.lastUsedBooking || ''}>{a.lastUsedBooking || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Combined Admin Dashboard (tabbed view) ────────────────────────────────────
const TABS = [
  { id: 'users',        label: 'User Management',    icon: Users    },
  { id: 'applications', label: 'Owner Applications', icon: UserPlus },
  { id: 'events',       label: 'Events Management',  icon: Ticket   },
  { id: 'assets',       label: 'Assets',             icon: Package  },
  { id: 'reviews',      label: 'Reviews',            icon: Star     },
  { id: 'complaints',   label: 'Complaints',         icon: MessageCircleWarning },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Admin Tabs">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                ].join(' ')}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'users'        && <AdminUsers />}
      {activeTab === 'applications' && <AdminApplications />}
      {activeTab === 'events'       && <AdminEvents />}
      {activeTab === 'assets'       && <AdminAssets />}
      {activeTab === 'reviews'      && <AdminReviews />}
      {activeTab === 'complaints'   && <AdminComplaints />}
    </div>
  );
}
