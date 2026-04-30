import React, { useEffect, useState } from 'react';

import api from '../../lib/axios';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal'; // Using the standard or making a simple one
import { CalendarDays, Clock, DollarSign, ShieldCheck, Ticket, MapPin } from 'lucide-react';

export function CustomerBookings() {

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modifyingBooking, setModifyingBooking] = useState(null);
  const [modDate, setModDate] = useState('');
  const [modTime, setModTime] = useState('');
  const [modTimeEnd, setModTimeEnd] = useState('');
  const [modReason, setModReason] = useState('');
  const [modError, setModError] = useState('');

  const fetchBookings = () => {
    api.get('/bookings/my-bookings')
      .then(res => {
        setBookings(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[CustomerBookings] fetch error:', err);
        setError(err.response?.data?.message || 'Could not load bookings. Please try again.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const statusConfig = (status) => {
    const map = {
      held: { variant: 'warning', label: 'Held (Pending Payment)' },
      blocked: { variant: 'success', label: 'Confirmed' },
      booked: { variant: 'success', label: 'Confirmed' },
      completed: { variant: 'success', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      pending: { variant: 'warning', label: 'Pending Payment' },
      pending_onsite: { variant: 'warning', label: 'Pay On Arrival' },
    };
    return map[status] || { variant: 'outline', label: status };
  };

  // Safe QR renderer — wraps in try/catch so a bad qrCodeData string can't crash the list
  const renderQR = (qrCodeData) => {
    const encoded = encodeURIComponent(qrCodeData);
    return (
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encoded}`}
        alt="Entry QR Code"
        width={90}
        height={90}
        className="rounded"
      />
    );
  };

  const handleModifySubmit = async (e) => {
    e.preventDefault();

    setModError('');

    // Validations
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const selectedDateStr = selected.toISOString().split('T')[0];

    if (selectedDateStr < todayStr) {
      setModError('Requested date cannot be in the past.');
      return;
    }

    // If requesting for today, ensure time hasn't passed
    if (selectedDateStr === todayStr) {
      const [h, m] = modTime.split(':').map(Number);
      if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
        setModError('Requested time has already passed for today.');
        return;
      }
    }

    if (modTime && modTimeEnd) {
      if (modTimeEnd <= modTime) {
        setModError('End time must be after start time.');
        return;
      }
    }

    try {
      await api.post(`/bookings/${modifyingBooking._id}/request-modification`, {
        requestedDate: modDate,
        requestedTimeStart: modTime,
        requestedTimeEnd: modTimeEnd,
        reason: modReason
      });
      setModifyingBooking(null);
      fetchBookings();
    } catch (err) {
      setModError(err.response?.data?.message || 'Failed to submit modification request.');
    }
  };

  return (
    <div className="space-y-6">
      {modifyingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
             <h2 className="text-xl font-bold mb-4">Request Booking Change</h2>
             <form onSubmit={handleModifySubmit} className="space-y-4">
               {modError && (
                 <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                   {modError}
                 </div>
               )}
               <Input label="New Date" type="date" required value={modDate} onChange={e => setModDate(e.target.value)} />
               <div className="grid grid-cols-2 gap-4">
                 <Input label="New Start Time" placeholder="e.g. 14:00" required value={modTime} onChange={e => setModTime(e.target.value)} />
                 <Input label="New End Time" placeholder="e.g. 15:00" required value={modTimeEnd} onChange={e => setModTimeEnd(e.target.value)} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea rows={2} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500" value={modReason} onChange={e => setModReason(e.target.value)} />
               </div>
               <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setModifyingBooking(null)}>Cancel</Button>
                  <Button type="submit">Submit Request</Button>
               </div>
             </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
        <span className="text-sm text-slate-400">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 && !error ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No bookings yet</h3>
          <p className="text-slate-400 text-sm max-w-xs">
            Your confirmed bookings will appear here once you complete a payment.
          </p>
        </div>
      ) : (
        /* Bookings grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map(b => {
            const cfg = statusConfig(b.status);
            return (
              <Card key={b._id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50 border-b">
                  <CardTitle className="text-base font-semibold text-slate-900 truncate mr-2">
                    {b.propertyId?.name || 'Sports Facility'}
                  </CardTitle>
                  <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                </CardHeader>

                {/* Body */}
                <CardContent className="pt-4 flex items-start justify-between gap-4">
                  {/* Booking details */}
                  <div className="space-y-2 text-sm flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{b.date ? new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{b.timeSlot?.start ?? '?'} – {b.timeSlot?.end ?? '?'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">${Number(b.totalAmount ?? 0).toFixed(2)}</span>
                    </div>
                    {b.attendanceStatus && b.attendanceStatus !== 'pending' && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <ShieldCheck className="w-4 h-4 text-slateink-400 shrink-0" />
                        <span className="capitalize">{b.attendanceStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* QR Code — only rendered when qrCodeData is a non-empty string */}
                  <div className="shrink-0">
                    {b.qrCodeData && typeof b.qrCodeData === 'string' && b.qrCodeData.length > 0 ? (
                      <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col items-center">
                        {b.paymentMethod === 'onsite' && b.status === 'pending_onsite' && (
                          <div className="text-xs text-center text-amber-700 font-semibold bg-amber-50 rounded px-2 py-1 mb-1">
                            On-Site Payment
                          </div>
                        )}
                        {renderQR(b.qrCodeData)}
                        <p className="text-xs text-slate-400 text-center mt-1 mb-2">Entry QR</p>
                        <button
                          onClick={async () => {
                            const encoded = encodeURIComponent(b._id);
                            const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
                            try {
                              const response = await fetch(url);
                              const blob = await response.blob();
                              const link = document.createElement('a');
                              link.href = URL.createObjectURL(blob);
                              link.download = `booking-qr-${b._id}.png`;
                              link.click();
                              URL.revokeObjectURL(link.href);
                            } catch (err) {
                              console.error('Failed to download QR:', err);
                            }
                          }}
                          className="text-[10px] text-blue-600 underline hover:text-blue-800 font-medium"
                        >
                          Download QR
                        </button>
                      </div>
                    ) : (
                      <div className="w-[106px] h-[106px] bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center p-2">
                        <CalendarDays className="w-6 h-6 text-slate-300 mb-1" />
                        <span className="text-xs text-slate-400 leading-tight">QR generated after payment</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="px-4 py-3 border-t border-slate-100 flex flex-col gap-2">
                  {b.modificationRequest && b.modificationRequest.requestedDate && (
                    <div className={`text-xs px-3 py-2 rounded-lg flex items-center justify-between ${
                      b.modificationRequest.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      b.modificationRequest.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                      'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      <div className="flex flex-col">
                        <span className="font-bold capitalize">Change Request {b.modificationRequest.status}</span>
                        <span className="opacity-80">
                          To: {new Date(b.modificationRequest.requestedDate).toLocaleDateString()} at {b.modificationRequest.requestedTimeSlot?.start} - {b.modificationRequest.requestedTimeSlot?.end || '?'}
                        </span>
                      </div>
                    </div>
                  )}

                  {(cfg.label === 'Confirmed' || cfg.label === 'Pay On Arrival') && 
                   (!b.modificationRequest?.requestedDate || b.modificationRequest?.status === 'rejected') && (
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => {
                         setModifyingBooking(b);
                         setModDate(b.date ? b.date.split('T')[0] : '');
                         setModTime(b.timeSlot?.start || '');
                         setModTimeEnd(b.timeSlot?.end || '');
                         setModReason('');
                      }}>
                        {b.modificationRequest?.status === 'rejected' ? 'Try Another Change' : 'Request Change'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CustomerTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    api.get('/tickets/my-tickets')
      .then(res => {
        setTickets(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load tickets.');
        setLoading(false);
      });
  }, []);

  const tierColor = (tier) => {
    if (tier === 'Gold') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (tier === 'Silver') return 'text-slate-600 bg-slate-50 border-slate-200';
    if (tier === 'Bronze') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-primary-600 bg-primary-50 border-primary-200';
  };

  if (selectedTicket) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Back to My Tickets
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
          <div className={`p-6 border-b ${tierColor(selectedTicket.tier)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest opacity-70">{selectedTicket.tier} Tier</span>
              <span className="text-xs font-mono opacity-60">#{selectedTicket._id.slice(-8).toUpperCase()}</span>
            </div>
            <h2 className="text-2xl font-bold">{selectedTicket.eventId?.name || 'Event'}</h2>
          </div>
          <div className="p-6 space-y-4 text-sm text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-400">Date</span>
              <span className="font-medium">{selectedTicket.eventId?.date ? new Date(selectedTicket.eventId.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time</span>
              <span className="font-medium">{selectedTicket.eventId?.time || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Location</span>
              <span className="font-medium">{selectedTicket.eventId?.location || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tier</span>
              <span className="font-medium">{selectedTicket.tier}</span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="text-slate-400">Amount Paid</span>
              <span className="font-bold text-slate-900 text-base">${Number(selectedTicket.price).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`font-semibold capitalize ${selectedTicket.status === 'active' ? 'text-green-600' : 'text-slate-400'}`}>{selectedTicket.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Purchased</span>
              <span className="font-medium">{new Date(selectedTicket.purchasedAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="rounded-lg bg-slate-50 border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
              Present this receipt at the event entrance
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">My Tickets</h1>
        <span className="text-sm text-slate-400">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
      </div>
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No tickets yet</h3>
          <p className="text-slate-400 text-sm max-w-xs">Browse upcoming events and grab your tickets!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map(t => (
            <button
              key={t._id}
              onClick={() => setSelectedTicket(t)}
              className="text-left w-full rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-primary-300 transition-all p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-base leading-tight">{t.eventId?.name || 'Event'}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${tierColor(t.tier)}`}>{t.tier}</span>
              </div>
              <div className="text-sm text-slate-500 space-y-1">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.eventId?.date ? new Date(t.eventId.date).toLocaleDateString() : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.eventId?.location || '—'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-mono">#{t._id.slice(-6).toUpperCase()}</span>
                <span className="font-bold text-slate-800">${Number(t.price).toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerReviews() {
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api.get('/bookings/my-bookings')
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : [];
        setCompletedBookings(arr.filter(b => b.status === 'completed'));
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load completed bookings.');
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (b) => {
    const rating = ratings[b._id] || 0;
    const comment = comments[b._id] || '';
    if (rating === 0) {
      setError('Please select a rating before submitting.');
      return;
    }
    setSubmitting(prev => ({ ...prev, [b._id]: true }));
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/reviews', {
        bookingId: b._id,
        propertyId: b.propertyId?._id,
        rating,
        comment
      });
      setSuccessMsg('Review submitted successfully!');
      setCompletedBookings(prev => prev.filter(booking => booking._id !== b._id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(prev => ({ ...prev, [b._id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">My Reviews</h1>
        <span className="text-sm text-slate-400">{completedBookings.length} pending review{completedBookings.length !== 1 ? 's' : ''}</span>
      </div>
      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {successMsg && <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{successMsg}</div>}
      {loading ? (
        <div className="flex justify-center py-16">
           <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : completedBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">★</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No pending reviews</h3>
          <p className="text-slate-400 text-sm max-w-xs">You have no completed bookings to review right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {completedBookings.map(b => (
            <Card key={b._id}>
              <CardHeader className="bg-slate-50 border-b pb-3">
                <CardTitle className="text-base font-semibold">{b.propertyId?.name || 'Property'}</CardTitle>
                <div className="text-sm text-slate-500">
                  {b.date ? new Date(b.date).toLocaleDateString() : '—'}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setRatings(prev => ({ ...prev, [b._id]: star }))}
                      className={`cursor-pointer text-2xl ${
                        (ratings[b._id] || 0) >= star ? 'text-yellow-400' : 'text-slate-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="Write your comment..."
                  value={comments[b._id] || ''}
                  onChange={e => setComments(prev => ({ ...prev, [b._id]: e.target.value }))}
                />
                <Button 
                  onClick={() => handleSubmit(b)} 
                  disabled={submitting[b._id]}
                  className="w-full"
                >
                  {submitting[b._id] ? 'Submitting...' : 'Submit Review'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerComplaints() {
  const [properties, setProperties] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingComps, setLoadingComps] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    propertyId: '',
    subject: '',
    description: ''
  });

  useEffect(() => {
    api.get('/properties')
      .then(res => {
        setProperties(Array.isArray(res.data) ? res.data : (res.data?.properties || []));
        setLoadingProps(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingProps(false);
      });

    fetchComplaints();
  }, []);

  const fetchComplaints = () => {
    setLoadingComps(true);
    api.get('/complaints/my-complaints')
      .then(res => {
        setComplaints(Array.isArray(res.data) ? res.data : []);
        setLoadingComps(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingComps(false);
      });
  };

  const handleSubmit = async () => {
    if (!formData.propertyId || !formData.subject || !formData.description) {
      setError('All fields are required.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/complaints', formData);
      setSuccess('Complaint submitted successfully.');
      setFormData({ propertyId: '', subject: '', description: '' });
      fetchComplaints();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusMap = {
    pending: { variant: 'warning', label: 'Pending' },
    resolved: { variant: 'success', label: 'Resolved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Complaints</h1>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle>Submit a New Complaint</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Property</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.propertyId}
              onChange={e => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
            >
              <option value="">-- Choose a Property --</option>
              {properties.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Subject"
            placeholder="Brief subject of your complaint"
            value={formData.subject}
            onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={4}
              placeholder="Provide details about your complaint..."
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting || loadingProps}>
            {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Past Complaints</h2>
        {loadingComps ? (
           <div className="flex justify-center py-8">
             <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
           </div>
        ) : complaints.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm text-slate-500">
            You have no past complaints.
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map(c => {
              const st = statusMap[c.status] || { variant: 'outline', label: c.status };
              return (
                <Card key={c._id}>
                  <CardHeader className="flex flex-row items-center justify-between py-3 bg-slate-50 border-b">
                    <div>
                      <CardTitle className="text-base">{c.subject}</CardTitle>
                      <p className="text-xs text-slate-500">{c.propertyId?.name || 'Property'} • {new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function OwnerApplication() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    nicOrPassport: '',
    address: '',
    bankDetails: '',
    propertyDescription: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 1) return formData.businessName.trim() && formData.nicOrPassport.trim();
    if (step === 2) return formData.address.trim() && formData.bankDetails.trim();
    if (step === 3) return formData.propertyDescription.trim().length >= 20;
    return false;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/applications', formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mt-8">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Application Submitted!</h2>
          <p className="text-green-700 text-sm max-w-sm mx-auto">
            Your application has been submitted and is under review. Our team will verify your details and get back to you within 2–3 business days.
          </p>
        </div>
      </div>
    );
  }

  const stepLabels = ['Business Identity', 'Location & Banking', 'Property Details'];

  return (
    <div className="max-w-2xl mt-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Become a Property Owner</h1>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${i + 1 < step ? 'bg-primary-600 text-white' :
                  i + 1 === step ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                    'bg-slate-200 text-slate-500'}`}>
                {i + 1 < step ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium hidden sm:block ${i + 1 === step ? 'text-primary-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="relative h-1.5 bg-slate-200 rounded-full mt-1">
          <div
            className="absolute top-0 left-0 h-full bg-primary-600 rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>

      <Card className="border-slate-200">
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          {/* Step 1 — Business Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Business Identity</h2>
                <p className="text-sm text-slate-500 mt-1">Tell us about your business and verify your identity.</p>
              </div>
              <Input
                label="Business / Trading Name"
                placeholder="e.g. Elite Sports Centre"
                required
                value={formData.businessName}
                onChange={e => update('businessName', e.target.value)}
              />
              <Input
                label="NIC Number or Passport Number"
                placeholder="e.g. 199023456789 or A12345678"
                required
                value={formData.nicOrPassport}
                onChange={e => update('nicOrPassport', e.target.value)}
              />
            </div>
          )}

          {/* Step 2 — Location & Banking */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Location & Banking</h2>
                <p className="text-sm text-slate-500 mt-1">Where is your property located and how should we pay you?</p>
              </div>
              <Input
                label="Business Address"
                placeholder="e.g. 42 Stadium Road, Colombo 03"
                required
                value={formData.address}
                onChange={e => update('address', e.target.value)}
              />
              <Input
                label="Bank Account Details"
                placeholder="e.g. Bank name, Account No, Branch"
                required
                value={formData.bankDetails}
                onChange={e => update('bankDetails', e.target.value)}
              />
            </div>
          )}

          {/* Step 3 — Property Description */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Property Details</h2>
                <p className="text-sm text-slate-500 mt-1">Describe the sports facility you want to list (min. 20 characters).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Description</label>
                <textarea
                  rows={5}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Describe your sports facility — type of sport, amenities, capacity, facilities available..."
                  value={formData.propertyDescription}
                  onChange={e => update('propertyDescription', e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">{formData.propertyDescription.length} / 20 min characters</p>
              </div>
              {/* Review Summary */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm space-y-1">
                <p className="font-semibold text-slate-700 mb-2">Review your details:</p>
                <p><span className="text-slate-500">Business:</span> {formData.businessName}</p>
                <p><span className="text-slate-500">NIC/Passport:</span> {formData.nicOrPassport}</p>
                <p><span className="text-slate-500">Address:</span> {formData.address}</p>
                <p><span className="text-slate-500">Bank:</span> {formData.bankDetails}</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)}>← Back</Button>
            ) : <div />}

            {step < totalSteps ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                Continue →
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit Application'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
