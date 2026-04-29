import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import api from '../../lib/axios';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { CheckCircle, XCircle, User, Calendar, Clock, MapPin, Loader2, QrCode, FileText, Send } from 'lucide-react';

function SecurityScanner() {
  const [loadingBooking, setLoadingBooking] = useState(false);
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
            </div>
          )}
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

export default function SecurityDashboard() {
  return (
    <div>
      <SecurityScanner />
      <DailyReport />
    </div>
  );
}