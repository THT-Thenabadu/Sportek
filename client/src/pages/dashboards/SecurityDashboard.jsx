import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { CheckCircle, XCircle, User, Calendar, Clock, MapPin, Loader2, QrCode, FileText, Send, Search, Ticket, ClipboardCheck, AlertCircle } from 'lucide-react';

function SecurityScanner() {
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyResult, setPasskeyResult] = useState(null);

  const verifyPasskey = async () => {
    try {
      const res = await api.get(`/bookings/verify-passkey/${passkeyInput.toUpperCase()}`);
      setPasskeyResult({ success: true, booking: res.data });
      setBookingDetails(res.data);
      
      try {
        await api.patch(`/bookings/${res.data._id}/attendance`, { status: 'confirmed' });
        setBookingDetails({ ...res.data, attendanceStatus: 'confirmed' });
        setPasskeyResult({ success: true, booking: { ...res.data, attendanceStatus: 'confirmed' } });
      } catch (err) {
        console.error('Auto attendance update failed:', err);
      }
    } catch (err) {
      setPasskeyResult({ success: false, message: err.response?.data?.message || 'Invalid passkey' });
    }
  };
  const [bookingDetails, setBookingDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);

  const handleScanSuccess = async (text) => {
    setErrorMsg('');
    setLoadingBooking(true);
    setBookingDetails(null);
    try {
      let bookingId = text;
      try {
        const payload = JSON.parse(text);
        if (payload.bookingId) bookingId = payload.bookingId;
      } catch (e) { }
      const res = await api.get(`/bookings/${bookingId}`);
      setBookingDetails(res.data);
      
      try {
        await api.patch(`/bookings/${bookingId}/attendance`, { status: 'confirmed' });
        setBookingDetails({ ...res.data, attendanceStatus: 'confirmed' });
      } catch (err) {
        console.error('Auto attendance scan update failed:', err);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid or unknown booking QR code');
      if (scannerRef.current) scannerRef.current.resume();
    } finally {
      setLoadingBooking(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initScanner = () => {
      if (!isMounted) return;
      if (scannerRef.current) return;
      const scanner = new Html5QrcodeScanner('qr-reader', {
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        fps: 25,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }, false);
      scannerRef.current = scanner;
      scanner.render(
        async (decodedText) => {
          scanner.pause(true);
          handleScanSuccess(decodedText);
        },
        (err) => { }
      );
    };
    setTimeout(initScanner, 100);
    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.clear()
          .catch(e => console.warn('Failed to clear scanner on unmount', e))
          .finally(() => { scannerRef.current = null; });
      }
    };
  }, []);

  const updateAttendance = async (status) => {
    if (!bookingDetails) return;
    try {
      await api.patch(`/bookings/${bookingDetails._id}/attendance`, { status });
      setBookingDetails({ ...bookingDetails, attendanceStatus: status });
    } catch (err) {
      alert('Error updating attendance: ' + (err.response?.data?.message || err.message));
    }
  };

  const isBookingExpired = () => {
    if (!bookingDetails?.date || !bookingDetails?.timeSlot?.end) return false;
    const datePart = bookingDetails.date.split('T')[0];
    const endDateTimeStr = `${datePart}T${bookingDetails.timeSlot.end}:00`;
    const endDateTime = new Date(endDateTimeStr);
    return endDateTime < new Date();
  };

  const handleScanAnother = () => {
    setBookingDetails(null);
    setErrorMsg('');
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().catch(e => console.warn(e))
          .finally(() => { scannerRef.current = null; });
      } catch (err) {
        console.warn('Sync error clearing scanner', err);
        scannerRef.current = null;
      }
    }
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        fps: 25,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }, false);
      scannerRef.current = scanner;
      scanner.render(
        async (decodedText) => {
          scanner.pause(true);
          handleScanSuccess(decodedText);
        },
        (err) => { }
      );
    }, 500);
  };

  const attendanceBadge = (status) => {
    switch (status) {
      case 'confirmed': return <Badge variant="success" className="ml-2">Present</Badge>;
      case 'noShow': return <Badge variant="destructive" className="ml-2">No Show</Badge>;
      default: return <Badge variant="warning" className="ml-2">Pending Arrival</Badge>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-100 rounded-lg">
          <QrCode className="w-8 h-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Security Scanner</h1>
          <p className="text-slate-500">Scan customer QR codes for entry validation.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="overflow-hidden shadow-md h-full">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Live Camera Feed</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div
              id="qr-reader"
              className={`w-full border-none ${bookingDetails ? 'hidden' : 'block'}`}
              style={{ border: 'none' }}
            ></div>
            {loadingBooking && (
              <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-2" />
                <p>Verifying booking...</p>
              </div>
            )}
            {errorMsg && !bookingDetails && (
              <div className="m-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
                <XCircle className="w-6 h-6 shrink-0" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md min-h-[400px] flex flex-col items-center justify-center bg-slate-50/50">
          {!bookingDetails && !loadingBooking && (
            <div className="text-center p-8 text-slate-400">
              <QrCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Point camera at a booking QR code<br />to display details automatically.</p>
            </div>
          )}
          {bookingDetails && (
            <div className="w-full h-full flex flex-col bg-white rounded-xl">
              <div className={`p-4 border-b text-white rounded-t-xl text-center font-semibold tracking-wide flex justify-center items-center gap-2 ${bookingDetails.status === 'cancelled' ? 'bg-red-500' : 'bg-emerald-600'}`}>
                <CheckCircle className="w-5 h-5" />
                {bookingDetails.status === 'cancelled' ? 'Booking Cancelled!' : 'Valid Booking'}
              </div>
              <div className="p-6 space-y-4 flex-1">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Customer</p>
                  <div className="flex items-center gap-2 text-slate-800 font-medium text-lg">
                    <User className="w-5 h-5 text-slate-400" />
                    {bookingDetails.customerId?.name || 'Unknown User'}
                  </div>
                </div>
                <div className="h-px bg-slate-100 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Date</p>
                    <div className="flex items-center gap-2 text-slate-800">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(bookingDetails.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Time Slot</p>
                    <div className="flex items-center gap-2 text-slate-800">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {bookingDetails.timeSlot.start} - {bookingDetails.timeSlot.end}
                    </div>
                  </div>
                </div>
                <div className="h-px bg-slate-100 w-full" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Facility</p>
                  <div className="flex items-center gap-2 text-slate-800">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{bookingDetails.propertyId?.name || 'Local Facility'}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mr-2">Status:</span>
                  {attendanceBadge(bookingDetails.attendanceStatus)}
                </div>

                {bookingDetails.paymentMethod === 'onsite' && bookingDetails.status === 'pending_onsite' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-amber-800">ON-SITE PAYMENT</p>
                      <span className="text-lg font-bold text-amber-700">
                        ${(() => {
                          try {
                            const qr = JSON.parse(bookingDetails.qrCodeData);
                            return qr.amountDue || bookingDetails.totalAmount || '?';
                          } catch { return bookingDetails.totalAmount || '?'; }
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700">Has the customer paid this amount?</p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                        onClick={async () => {
                          try {
                            await api.patch(`/bookings/${bookingDetails._id}/mark-paid`);
                            setBookingDetails({ ...bookingDetails, status: 'booked' });
                          } catch (err) {
                            alert('Failed: ' + (err.response?.data?.message || err.message));
                          }
                        }}
                      >
                        ✓ Payment Received
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-sm border-amber-300 text-amber-700"
                        onClick={() => {
                          setBookingDetails({ ...bookingDetails, attendanceStatus: 'pending' });
                        }}
                      >
                        ⏳ Still Pending
                      </Button>
                    </div>
                  </div>
                )}
                {bookingDetails.paymentMethod === 'onsite' && bookingDetails.status === 'booked' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-medium text-center">
                    ✓ Payment Confirmed
                  </div>
                )}
              </div>
              {isBookingExpired() ? (
                <div className="p-5 border-t space-y-3 bg-slate-50 rounded-b-xl">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium text-center">
                    This booking has expired. The time slot for this booking has already passed.
                  </div>
                  <Button className="w-full" variant="outline" onClick={handleScanAnother}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan Another
                  </Button>
                </div>
              ) : (
                <div className="p-5 border-t space-y-3 bg-slate-50 rounded-b-xl">
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => updateAttendance('confirmed')}
                      disabled={bookingDetails.attendanceStatus === 'confirmed' || bookingDetails.status === 'cancelled'}
                    >
                      Mark Present
                    </Button>
                    <Button
                      className="flex-1"
                      variant="danger"
                      onClick={() => updateAttendance('noShow')}
                      disabled={bookingDetails.attendanceStatus === 'noShow' || bookingDetails.status === 'cancelled'}
                    >
                      No Show
                    </Button>
                  </div>
                  <Button className="w-full" variant="outline" onClick={handleScanAnother}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan Next Customer
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
      
      <div className="max-w-3xl mx-auto mt-6">
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Passkey Verification</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 mb-3">Enter customer passkey to verify booking without scanning QR</p>
            <div className="flex gap-3">
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. A3X9KL"
                value={passkeyInput}
                onChange={e => {
                  setPasskeyInput(e.target.value.toUpperCase());
                  setPasskeyResult(null);
                }}
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button onClick={verifyPasskey} disabled={passkeyInput.length < 6}>
                Verify
              </Button>
            </div>
            {passkeyResult && (
              <div className={`mt-4 p-4 rounded-xl border ${passkeyResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                {passkeyResult.success ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-emerald-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Valid Booking
                    </p>
                    <p className="text-slate-700">Customer: <strong>{passkeyResult.booking.customerId?.name}</strong></p>
                    <p className="text-slate-700">Facility: <strong>{passkeyResult.booking.propertyId?.name}</strong></p>
                    <p className="text-slate-700">Date: <strong>{new Date(passkeyResult.booking.date).toLocaleDateString()}</strong></p>
                    <p className="text-slate-700">Time: <strong>{passkeyResult.booking.timeSlot?.start} – {passkeyResult.booking.timeSlot?.end}</strong></p>
                  </div>
                ) : (
                  <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> {passkeyResult.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DailyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setSendSuccess(false);
    try {
      const res = await api.get(`/bookings/daily-report?date=${today}`);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch daily report');
    } finally {
      setLoading(false);
    }
  };

  const sendReport = async () => {
    if (!report || !report.bookings.length) return;
    const firstBooking = report.bookings.find(b => b.propertyId?.ownerId);
    if (!firstBooking) {
      alert('No property owner found to send report to.');
      return;
    }
    setSending(true);
    try {
      await api.post('/bookings/daily-report/send', {
        date: report.date,
        total: report.total,
        confirmed: report.confirmed,
        noShow: report.noShow,
        pending: report.pending,
        propertyName: firstBooking.propertyId?.name || 'Facility',
        ownerId: firstBooking.propertyId?.ownerId
      });
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send report');
    } finally {
      setSending(false);
    }
  };

  const attendanceBadge = (status) => {
    if (status === 'confirmed') return <Badge variant="success">Present</Badge>;
    if (status === 'noShow') return <Badge variant="destructive">No Show</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  const downloadPDF = () => {
    if (!report) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sportek Daily Report - ${report.date}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
            h1 { color: #1d4ed8; margin-bottom: 5px; }
            .subtitle { color: #64748b; margin-bottom: 20px; }
            .stats { display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
            .stat { padding: 12px 20px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; min-width: 80px; }
            .stat .num { font-size: 24px; font-weight: bold; }
            .stat .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f1f5f9; padding: 10px 12px; text-align: left; border: 1px solid #e2e8f0; font-size: 12px; }
            td { padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
            .confirmed { color: #059669; font-weight: 600; }
            .noshow { color: #dc2626; font-weight: 600; }
            .pending { color: #d97706; font-weight: 600; }
            .onsite { background: #fef3c7; padding: 2px 8px; border-radius: 20px; font-size: 11px; color: #92400e; }
          </style>
        </head>
        <body>
          <h1>Sportek Daily Report</h1>
          <p class="subtitle">Generated: ${new Date().toLocaleString()} · Date: ${report.date}</p>
          <div class="stats">
            <div class="stat"><div class="num">${report.total}</div><div class="label">Total</div></div>
            <div class="stat"><div class="num" style="color:#059669">${report.confirmed}</div><div class="label">Confirmed</div></div>
            <div class="stat"><div class="num" style="color:#dc2626">${report.noShow}</div><div class="label">No Shows</div></div>
            <div class="stat"><div class="num" style="color:#d97706">${report.pending}</div><div class="label">Pending</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Time Slot</th>
                <th>Payment</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              ${report.bookings.map(b => `
                <tr>
                  <td>${b.customerId?.name || 'Unknown'}</td>
                  <td>${b.timeSlot?.start} – ${b.timeSlot?.end}</td>
                  <td>${b.paymentMethod === 'onsite'
                    ? `<span class="onsite">${b.status === 'booked' ? 'Paid On-Site' : 'Pay On Arrival'}</span>`
                    : 'Online'}</td>
                  <td class="${b.attendanceStatus === 'confirmed' ? 'confirmed' : b.attendanceStatus === 'noShow' ? 'noshow' : 'pending'}">${b.attendanceStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 pb-10">
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Daily Report — {today}
            </CardTitle>
            <Button onClick={fetchReport} isLoading={loading} disabled={loading}>
              Generate Daily Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          {report && (
            <div className="space-y-5" id="daily-report-content">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Bookings', value: report.total, color: 'text-slate-800' },
                  { label: 'Confirmed', value: report.confirmed, color: 'text-emerald-600' },
                  { label: 'No Shows', value: report.noShow, color: 'text-red-600' },
                  { label: 'Pending', value: report.pending, color: 'text-amber-600' },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-50 border rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 font-semibold uppercase mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              {report.bookings.length === 0 ? (
                <p className="text-center text-slate-500 py-4 text-sm">No bookings for today.</p>
              ) : (
                <div className="space-y-2">
                  {report.bookings.map(b => (
                    <div key={b._id} className="flex items-center justify-between p-3 bg-white border rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-medium text-slate-800">{b.customerId?.name || 'Unknown'}</span>
                          <span className="text-slate-400 mx-2">·</span>
                          <span className="text-slate-500">{b.timeSlot?.start} – {b.timeSlot?.end}</span>
                          {b.paymentMethod === 'onsite' && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              {b.status === 'booked' ? 'Paid On-Site' : 'Pay On Arrival'}
                            </span>
                          )}
                        </div>
                      </div>
                      {attendanceBadge(b.attendanceStatus)}
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4 flex justify-end gap-3 flex-wrap">
                <Button variant="outline" onClick={downloadPDF} disabled={!report}>
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => { setReport(null); setSendSuccess(false); }}>
                  Reset Report
                </Button>
                {sendSuccess ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 px-4 py-2 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    Report sent to property owner
                  </div>
                ) : (
                  <Button onClick={sendReport} isLoading={sending} disabled={sending || !report || report.total === 0}>
                    <Send className="w-4 h-4 mr-2" />
                    Send to Property Owner
                  </Button>
                )}
              </div>
            </div>
          )}
          {!report && !loading && !error && (
            <p className="text-center text-slate-400 py-8 text-sm">
              Click "Generate Daily Report" to view today's booking summary.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityAvailability() {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name_az');

  useEffect(() => {
    const ownerId = user?.associatedOwner || user?._id;
    console.log('SecurityAvailability useEffect called. User:', user);
    console.log('Calling Availability API URL:', `/properties/owner/${ownerId}/availability`);

    if (ownerId) {
      api.get(`/properties/owner/${ownerId}/availability`)
        .then(res => {
          setProperties(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        })
        .catch(err => {
          setError(err.response?.data?.message || 'Could not load availability data.');
          setLoading(false);
        });
    } else {
      setError('No associated property owner found for this officer.');
      setLoading(false);
    }
  }, [user]);

  const getFilteredAndSorted = () => {
    let result = properties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterStatus === 'available') {
      result = result.filter(p => p.isAvailable);
    } else if (filterStatus === 'not_available') {
      result = result.filter(p => !p.isAvailable);
    }

    return result.sort((a, b) => {
      if (sortBy === 'name_az') return a.name.localeCompare(b.name);
      if (sortBy === 'name_za') return b.name.localeCompare(a.name);
      return 0;
    });
  };

  const processedProperties = getFilteredAndSorted();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Facility Availability</h2>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="not_available">Not Available</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="name_az">Sort by Name A-Z</option>
            <option value="name_za">Sort by Name Z-A</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : processedProperties.length === 0 ? (
        <p className="text-center text-slate-500 py-12 bg-slate-50 border rounded-xl text-sm">
          No facilities found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {processedProperties.map(p => (
            <Card key={p._id} className="hover:shadow-md transition-shadow overflow-hidden bg-white">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b pb-3">
                <CardTitle className="text-base font-bold text-slate-900 truncate">
                  {p.name}
                </CardTitle>
                <Badge
                  variant={p.isAvailable ? 'success' : 'destructive'}
                  className="shrink-0"
                >
                  {p.isAvailable ? 'Available' : 'Not Available'}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <p className="text-slate-600 flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Sport Type:</span> {p.sportType}
                </p>
                <p className="text-slate-600 flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Location:</span> {p.location?.address || '—'}
                </p>
                <p className="text-slate-600 flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Available Hours:</span> {p.availableHours?.start} – {p.availableHours?.end}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UpcomingBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('date_newest');
  
  const [selectedQR, setSelectedQR] = useState(null);

  useEffect(() => {
    api.get('/bookings/upcoming-security')
      .then(res => {
        setBookings(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load upcoming bookings.');
        setLoading(false);
      });
  }, []);

  const getFilteredAndSorted = () => {
    let result = bookings.filter(b => {
      const customerName = b.customerId?.name || '';
      const propertyName = b.propertyId?.name || '';
      const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            propertyName.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesDate = true;
      if (b.date) {
        const bookingDate = new Date(b.date);
        bookingDate.setHours(0, 0, 0, 0);

        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (bookingDate < from) matchesDate = false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(0, 0, 0, 0);
          if (bookingDate > to) matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    });

    return result.sort((a, b) => {
      if (sortBy === 'date_newest') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_oldest') return new Date(a.date) - new Date(b.date);
      return 0;
    });
  };

  const processedBookings = getFilteredAndSorted();

  const renderQRModal = () => {
    if (!selectedQR) return null;
    const encoded = encodeURIComponent(selectedQR);
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Manual Verification QR</h3>
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm mb-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`}
              alt="Manual Verification"
              width={200}
              height={200}
            />
          </div>
          <Button variant="outline" onClick={() => setSelectedQR(null)}>Close</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderQRModal()}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Upcoming Bookings</h2>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search by customer/facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="date_newest">Date: Newest First</option>
            <option value="date_oldest">Date: Oldest First</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : processedBookings.length === 0 ? (
        <p className="text-center text-slate-500 py-12 bg-slate-50 border rounded-xl text-sm">
          No upcoming bookings match criteria.
        </p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
              <tr>
                {['Customer Name', 'Property Name', 'Date', 'Time Slot', 'Payment Method', 'Total Amount', 'Booking Status', 'Attendance Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedBookings.map(b => (
                <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.customerId?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-slate-600">{b.propertyId?.name || 'Unknown Facility'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.date ? new Date(b.date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.timeSlot?.start} – {b.timeSlot?.end}</td>
                  <td className="px-4 py-3 capitalize text-slate-500">{b.paymentMethod}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">${b.totalAmount?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.status === 'booked' ? 'success' : 'warning'}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="warning">{b.attendanceStatus}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedQR(b.qrCodeData || b._id)}
                    >
                      View QR
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CurrentBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('date_newest');

  useEffect(() => {
    api.get('/bookings/current-security')
      .then(res => {
        setBookings(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load current bookings.');
        setLoading(false);
      });
  }, []);

  const getFilteredAndSorted = () => {
    let result = bookings.filter(b => {
      const customerName = b.customerId?.name || '';
      const propertyName = b.propertyId?.name || '';
      const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            propertyName.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesDate = true;
      if (b.date) {
        const bookingDate = new Date(b.date);
        bookingDate.setHours(0, 0, 0, 0);

        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (bookingDate < from) matchesDate = false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(0, 0, 0, 0);
          if (bookingDate > to) matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    });

    return result.sort((a, b) => {
      if (sortBy === 'date_newest') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_oldest') return new Date(a.date) - new Date(b.date);
      return 0;
    });
  };

  const processedBookings = getFilteredAndSorted();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Current Bookings</h2>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search by customer/facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="date_newest">Date: Newest First</option>
            <option value="date_oldest">Date: Oldest First</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : processedBookings.length === 0 ? (
        <p className="text-center text-slate-500 py-12 bg-slate-50 border rounded-xl text-sm">
          No processed bookings match criteria.
        </p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
              <tr>
                {['Customer Name', 'Property Name', 'Date', 'Time Slot', 'Payment Method', 'Total Amount', 'Attendance Status'].map(h => (
                  <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedBookings.map(b => (
                <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.customerId?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-slate-600">{b.propertyId?.name || 'Unknown Facility'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.date ? new Date(b.date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.timeSlot?.start} – {b.timeSlot?.end}</td>
                  <td className="px-4 py-3 capitalize text-slate-500">{b.paymentMethod}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">${b.totalAmount?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.attendanceStatus === 'confirmed' ? 'success' : 'destructive'}>
                      {b.attendanceStatus}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EntryLog() {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [log, setLog] = useState([]);
  const [visitorName, setVisitorName] = useState('');
  const [visitorType, setVisitorType] = useState('Member');
  const [facility, setFacility] = useState('');
  const [formEntryTime, setFormEntryTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter States
  const [filterSearch, setFilterSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const ownerId = user?.associatedOwner || user?._id;
    if (ownerId) {
      setLoading(true);
      api.get(`/properties/owner/${ownerId}/availability`)
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : [];
          setProperties(data);
          if (data.length > 0) {
            setFacility(data[0].name);
          }
          setLoading(false);
        })
        .catch(err => {
          setError('Could not load properties.');
          setLoading(false);
        });
    }
  }, [user]);

  const handleAddVisitor = (e) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    setFormEntryTime(timeStr);
    
    const newEntry = {
      id: Date.now(),
      name: visitorName,
      type: visitorType,
      facility: facility,
      entryTime: timeStr,
      exitTime: null,
      date: new Date().toISOString().split('T')[0]
    };
    
    setLog(prev => [newEntry, ...prev]);
    setVisitorName('');
  };

  const handleLogExit = (id) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    setLog(prev => prev.map(item => item.id === id ? { ...item, exitTime: timeStr } : item));
  };

  const clearLog = () => {
    setLog([]);
  };

  const getBadgeVariant = (type) => {
    if (type === 'Member') return 'default';
    if (type === 'Visitor') return 'success';
    if (type === 'Service') return 'danger';
    return 'outline';
  };

  const getFilteredAndSortedLog = () => {
    let result = [...log];
    
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.facility.toLowerCase().includes(q)
      );
    }
    
    if (fromDate) {
      result = result.filter(item => item.date >= fromDate);
    }
    if (toDate) {
      result = result.filter(item => item.date <= toDate);
    }
    
    if (filterType !== 'All') {
      result = result.filter(item => item.type === filterType);
    }
    
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.id - a.id;
      } else {
        return a.id - b.id;
      }
    });
    
    return result;
  };

  const filteredLog = getFilteredAndSortedLog();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-primary-100 rounded-lg">
          <FileText className="w-8 h-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entry Log</h1>
          <p className="text-slate-500">Track and log physical visitor accesses safely.</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <Card className="shadow-md bg-slate-50/50 border border-slate-200">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Search</label>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Name or facility..."
              className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
            >
              <option value="All">All</option>
              <option value="Member">Member</option>
              <option value="Visitor">Visitor</option>
              <option value="Service">Service</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Sort By</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
            >
              <option value="newest">Entry Time: Newest First</option>
              <option value="oldest">Entry Time: Oldest First</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Add Visitor Form */}
      <Card className="shadow-md">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">Add Visitor</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAddVisitor}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Visitor Name</label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm transition-all"
                  placeholder="Full Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                <select
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm transition-all"
                >
                  <option value="Member">Member</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Service">Service</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Facility</label>
                <select
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm transition-all"
                >
                  {properties.map(p => (
                    <option key={p._id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Entry Time</label>
                <input
                  type="text"
                  readOnly
                  value={formEntryTime}
                  placeholder="Auto-populated"
                  className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-mono shadow-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={loading || properties.length === 0}>
                + Add Visitor
              </Button>
            </div>
          </form>
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Visitor Records Table */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-row justify-between items-center bg-slate-50 border-b">
          <CardTitle className="text-lg">Visitor Entry Records</CardTitle>
          {filteredLog.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearLog} className="text-red-600 border-red-200 hover:bg-red-50">
              Clear Log
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {filteredLog.length === 0 ? (
            <p className="text-center text-slate-500 py-12 bg-slate-50/50 text-sm">No visitors found matching filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b font-semibold">
                  <tr>
                    {['Name', 'Type', 'Facility', 'Entry Time', 'Exit Time'].map(h => (
                      <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLog.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getBadgeVariant(item.type)}>{item.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.facility}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{item.entryTime}</td>
                      <td className="px-4 py-3">
                        {item.exitTime ? (
                          <span className="font-mono text-slate-500">{item.exitTime}</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleLogExit(item.id)} className="py-1 h-auto text-xs border-slate-300 text-slate-700 hover:bg-slate-50">
                            Log Exit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecurityDashboard({ defaultTab = 'scanner' }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [quickFilter, setQuickFilter] = useState('');

  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  const quickFilterSections = [
    { id: 'availability', label: 'Availability' },
    { id: 'upcoming', label: 'Upcoming Bookings' },
    { id: 'current', label: 'Current Bookings' },
    { id: 'entry-log', label: 'Entry Log' },
    { id: 'report', label: 'Reports' },
  ];

  const handleQuickFilterClick = (sectionId) => {
    navigate(`/dashboard/${sectionId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>

      {/* Content Area */}
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome, Security Officer</h2>
          <p className="text-slate-500">Sports Property Security Management</p>
        </div>

        {/* Quick Filter */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Quick Filter
              </label>
              {quickFilter && (
                <button
                  onClick={() => setQuickFilter('')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. booking, entry, report..."
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-4" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Find section</p>
          </CardContent>
        </Card>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickFilterSections
            .filter((section) =>
              quickFilter
                ? section.label.toLowerCase().includes(quickFilter.toLowerCase())
                : true
            )
            .map((section) => (
              <Card
                key={section.id}
                className="hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={() => handleQuickFilterClick(section.id)}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">{section.label}</h3>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}

// Export individual page components for routing
export function SecurityScanPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>
      <SecurityScanner />
    </div>
  );
}

export function SecurityAvailabilityPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>
      <SecurityAvailability />
    </div>
  );
}

export function SecurityUpcomingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>
      <UpcomingBookings />
    </div>
  );
}

export function SecurityCurrentPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>
      <CurrentBookings />
    </div>
  );
}

export function SecurityEntryLogPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>
      <EntryLog />
    </div>
  );
}

export function SecurityReportPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>
      <DailyReport />
    </div>
  );
}

export function SecurityBookingDetailsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_newest');
  
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  useEffect(() => {
    // Fetch all bookings for the property
    api.get('/bookings/all-security')
      .then(res => {
        setBookings(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load bookings.');
        setLoading(false);
      });
  }, []);

  const getFilteredAndSorted = () => {
    let result = bookings.filter(b => {
      const customerName = b.customerId?.name || '';
      const propertyName = b.propertyId?.name || '';
      const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            propertyName.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (filterStatus !== 'all') {
        matchesStatus = b.status === filterStatus;
      }

      return matchesSearch && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sortBy === 'date_newest') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_oldest') return new Date(a.date) - new Date(b.date);
      return 0;
    });
  };

  const processedBookings = getFilteredAndSorted();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 -mx-8 -mt-8 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
          <p className="text-sm text-slate-500">Security Demo Owner</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hi, {user?.name || 'Security Demo Owner'}!</span>
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900">All Booking Details</h2>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Search by customer/facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="booked">Booked</option>
              <option value="pending_onsite">Pending Onsite</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="date_newest">Date: Newest First</option>
              <option value="date_oldest">Date: Oldest First</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : processedBookings.length === 0 ? (
          <p className="text-center text-slate-500 py-12 bg-slate-50 border rounded-xl text-sm">
            No bookings found matching criteria.
          </p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
                <tr>
                  {['Customer Name', 'Property Name', 'Date', 'Time Slot', 'Payment Method', 'Total Amount', 'Booking Status', 'Attendance Status'].map(h => (
                    <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedBookings.map(b => (
                  <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.customerId?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-slate-600">{b.propertyId?.name || 'Unknown Facility'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.date ? new Date(b.date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.timeSlot?.start} – {b.timeSlot?.end}</td>
                    <td className="px-4 py-3 capitalize text-slate-500">{b.paymentMethod}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">${b.totalAmount?.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        b.status === 'booked' ? 'success' : 
                        b.status === 'cancelled' ? 'destructive' : 
                        'warning'
                      }>
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        b.attendanceStatus === 'confirmed' ? 'success' : 
                        b.attendanceStatus === 'noShow' ? 'destructive' : 
                        'warning'
                      }>
                        {b.attendanceStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}