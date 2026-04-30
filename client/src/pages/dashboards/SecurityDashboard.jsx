import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserQRCodeReader } from '@zxing/browser';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { CheckCircle, XCircle, User, Calendar, Clock, MapPin, Loader2, QrCode, FileText, Send, Search, Ticket, ClipboardCheck, AlertCircle } from 'lucide-react';

function SecurityScanner() {
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenResult, setTokenResult] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState('error'); // 'error' | 'early'
  const [scanning, setScanning] = useState(true);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);

  const handleScanSuccess = useCallback(async (text) => {
    if (!scanning) return;
    setScanning(false);
    setErrorMsg('');
    setLoadingBooking(true);
    setBookingDetails(null);
    // Stop camera
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch (e) {}
      controlsRef.current = null;
    }
    try {
      const res = await api.post('/bookings/scan-qr', { qrData: text });
      setBookingDetails(res.data.booking);
    } catch (err) {
      const data = err.response?.data;
      const isEarly = data?.validFrom != null;
      setErrorType(isEarly ? 'early' : 'error');
      setErrorMsg(data?.message || 'Invalid or unknown booking QR code');
      // Restart scanner on error
      setScanning(true);
    } finally {
      setLoadingBooking(false);
    }
  }, [scanning]);

  useEffect(() => {
    if (!scanning) return;
    let stopped = false;
    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;

    BrowserQRCodeReader.listVideoInputDevices().then(devices => {
      if (stopped || !videoRef.current) return;
      const deviceId = devices.length > 0 ? devices[0].deviceId : undefined;
      reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (stopped) return;
        if (result) {
          handleScanSuccess(result.getText());
        }
      }).then(controls => {
        if (stopped) { try { controls.stop(); } catch(e){} return; }
        controlsRef.current = controls;
      }).catch(e => {
        if (!stopped) setErrorMsg('Camera access denied or unavailable.');
      });
    }).catch(() => {
      if (!stopped) setErrorMsg('Could not access camera devices.');
    });

    return () => {
      stopped = true;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch (e) {}
        controlsRef.current = null;
      }
    };
  }, [scanning, handleScanSuccess]);

  const handleScanAnother = () => {
    setBookingDetails(null);
    setErrorMsg('');
    setErrorType('error');
    setTokenInput('');
    setTokenResult(null);
    setScanning(true);
  };

  const verifyToken = async () => {
    setTokenResult(null);
    try {
      const res = await api.post('/bookings/checkin-token', { token: tokenInput.toUpperCase() });
      setTokenResult({ success: true, booking: res.data.booking });
      setBookingDetails(res.data.booking);
      setScanning(false);
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch (e) {}
        controlsRef.current = null;
      }
    } catch (err) {
      const data = err.response?.data;
      const isEarly = data?.validFrom != null;
      setTokenResult({ success: false, early: isEarly, message: data?.message || 'Invalid token' });
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Scan Pass / Check-In</h1>
        <p className="text-slate-500 text-sm mt-1">Verify Digital Tickets or manually enter access tokens to grant property access</p>
      </div>

      {/* Main layout: camera left, token right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Camera feed — large */}
        <div className="flex-1 min-w-0">
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: '420px' }}>
            {!bookingDetails ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ minHeight: '420px' }}
                  autoPlay
                  muted
                  playsInline
                />
                {/* Red corner bracket overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative" style={{ width: '260px', height: '260px' }}>
                    {/* dashed border box */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      border: '1px dashed rgba(239,68,68,0.4)',
                      borderRadius: '4px'
                    }} />
                    {/* Corner brackets */}
                    {[
                      { top: 0, left: 0, borderTop: '3px solid #ef4444', borderLeft: '3px solid #ef4444', borderRadius: '4px 0 0 0' },
                      { top: 0, right: 0, borderTop: '3px solid #ef4444', borderRight: '3px solid #ef4444', borderRadius: '0 4px 0 0' },
                      { bottom: 0, left: 0, borderBottom: '3px solid #ef4444', borderLeft: '3px solid #ef4444', borderRadius: '0 0 0 4px' },
                      { bottom: 0, right: 0, borderBottom: '3px solid #ef4444', borderRight: '3px solid #ef4444', borderRadius: '0 0 4px 0' },
                    ].map((style, i) => (
                      <div key={i} style={{ position: 'absolute', width: '28px', height: '28px', ...style }} />
                    ))}
                  </div>
                </div>
                {loadingBooking && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                    <p className="text-sm font-medium">Verifying booking...</p>
                  </div>
                )}
              </>
            ) : (
              /* Check-in success overlay */
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-white p-8">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-1">Access Granted</h2>
                <p className="text-slate-400 text-sm mb-6">{bookingDetails.customerId?.name}</p>
                <div className="w-full max-w-xs bg-slate-800 rounded-xl p-4 space-y-2 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Facility</span>
                    <span className="font-medium">{bookingDetails.propertyId?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date</span>
                    <span className="font-medium">{new Date(bookingDetails.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time</span>
                    <span className="font-medium">{bookingDetails.timeSlot?.start} – {bookingDetails.timeSlot?.end}</span>
                  </div>
                </div>
                <button
                  onClick={handleScanAnother}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Scan Next Customer
                </button>
              </div>
            )}

            {errorMsg && (
              <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-lg flex items-start gap-2 text-sm backdrop-blur-sm ${
                errorType === 'early'
                  ? 'bg-amber-500/90 text-white'
                  : 'bg-red-600/90 text-white'
              }`}>
                {errorType === 'early'
                  ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                }
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Token Entry — right side */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-900 mb-2">Manual Token Entry</h3>
            <p className="text-sm text-slate-500 mb-4">
              If the user's screen is too dark or the camera fails, enter the 6-character access token printed on their ticket.
            </p>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g.  A4X9B2"
              value={tokenInput}
              onChange={e => {
                setTokenInput(e.target.value.toUpperCase());
                setTokenResult(null);
              }}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-center text-lg font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-800 mb-3"
            />
            <button
              onClick={verifyToken}
              disabled={tokenInput.length < 6}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Verify Token
            </button>

            {tokenResult && (
              <div className={`mt-4 p-3 rounded-lg border text-sm ${
                tokenResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : tokenResult.early
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {tokenResult.success ? (
                  <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Checked In</p>
                    <p>{tokenResult.booking.customerId?.name}</p>
                    <p className="text-xs text-slate-500">{tokenResult.booking.timeSlot?.start} – {tokenResult.booking.timeSlot?.end}</p>
                  </div>
                ) : tokenResult.early ? (
                  <p className="flex items-start gap-1"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {tokenResult.message}</p>
                ) : (
                  <p className="flex items-center gap-1"><XCircle className="w-4 h-4" /> {tokenResult.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function DailyReport() {
  const today = new Date().toISOString().split('T')[0];
  const [reportType, setReportType] = useState('booking');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    if (reportType === 'entry') {
      // Read fresh from localStorage every time so latest entries are included
      const allEntries = (() => { try { return JSON.parse(localStorage.getItem('sportek_entry_log') || '[]'); } catch { return []; } })();
      const filtered = allEntries.filter(e => e.date >= fromDate && e.date <= toDate);
      setReport({ type: 'entry', from: fromDate, to: toDate, rows: filtered });
      return;
    }
    setLoading(true); setError(''); setReport(null); setSendSuccess(false);
    try {
      const res = await api.get(`/bookings/reports?type=${reportType}&from=${fromDate}&to=${toDate}`);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally { setLoading(false); }
  };

  const sendToOwner = async () => {
    if (!report) return;
    setSending(true);
    try {
      const summary = report.type === 'booking'
        ? `Total: ${report.total}, Confirmed: ${report.confirmed}, No-shows: ${report.noShow}, Revenue: $${report.revenue?.toFixed(2)}`
        : report.type === 'facility'
        ? `${report.rows?.length} facilities, Total bookings: ${report.total}, Revenue: $${report.revenue?.toFixed(2)}`
        : `${report.rows?.length} entry log records`;
      await api.post('/bookings/reports/send', { type: report.type, from: report.from, to: report.to, summary });
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send report');
    } finally { setSending(false); }
  };

  const downloadReport = () => {
    if (!report) return;
    const win = window.open('', '_blank');
    const typeLabel = report.type === 'booking' ? 'Booking Details Report'
      : report.type === 'facility' ? 'Facility Usage Report' : 'Entry Log Report';
    let tableHTML = '';
    if (report.type === 'booking') {
      tableHTML = '<table><thead><tr><th>Customer</th><th>Facility</th><th>Date</th><th>Time Slot</th><th>Payment</th><th>Amount</th><th>Status</th><th>Attendance</th></tr></thead><tbody>'
        + (report.rows||[]).map(b=>`<tr><td>${b.customerId?.name||'-'}</td><td>${b.propertyId?.name||'-'}</td><td>${b.date?new Date(b.date).toLocaleDateString():'-'}</td><td>${b.timeSlot?.start} - ${b.timeSlot?.end}</td><td>${b.paymentMethod}</td><td>$${b.totalAmount?.toFixed(2)}</td><td>${b.status}</td><td class="${b.attendanceStatus==='confirmed'?'confirmed':b.attendanceStatus==='noShow'?'noshow':'pending'}">${b.attendanceStatus}</td></tr>`).join('')
        + '</tbody></table>';
    } else if (report.type === 'facility') {
      tableHTML = '<table><thead><tr><th>Facility</th><th>Total Bookings</th><th>Confirmed</th><th>No Shows</th><th>Revenue</th></tr></thead><tbody>'
        + (report.rows||[]).map(r=>`<tr><td>${r.name}</td><td>${r.bookings}</td><td class="confirmed">${r.confirmed}</td><td class="noshow">${r.noShow}</td><td>$${r.revenue?.toFixed(2)}</td></tr>`).join('')
        + '</tbody></table>';
    } else {
      tableHTML = '<table><thead><tr><th>Name</th><th>NIC</th><th>Type</th><th>Facility</th><th>Date</th><th>Entry Time</th><th>Exit Time</th></tr></thead><tbody>'
        + (report.rows||[]).map(e=>`<tr><td>${e.name}</td><td>${e.nic||'-'}</td><td>${e.type}</td><td>${e.facility}</td><td>${e.date}</td><td>${e.entryTime}</td><td>${e.exitTime||'-'}</td></tr>`).join('')
        + '</tbody></table>';
    }
    const statsHTML = report.type === 'booking'
      ? `<div class="stats"><div class="stat"><div class="num">${report.total}</div><div class="lbl">Total</div></div><div class="stat"><div class="num" style="color:#059669">${report.confirmed}</div><div class="lbl">Confirmed</div></div><div class="stat"><div class="num" style="color:#dc2626">${report.noShow}</div><div class="lbl">No Shows</div></div><div class="stat"><div class="num" style="color:#d97706">${report.pending}</div><div class="lbl">Pending</div></div><div class="stat"><div class="num" style="color:#2563eb">$${report.revenue?.toFixed(2)}</div><div class="lbl">Revenue</div></div></div>`
      : report.type === 'facility'
      ? `<div class="stats"><div class="stat"><div class="num">${report.rows?.length}</div><div class="lbl">Facilities</div></div><div class="stat"><div class="num">${report.total}</div><div class="lbl">Bookings</div></div><div class="stat"><div class="num" style="color:#2563eb">$${report.revenue?.toFixed(2)}</div><div class="lbl">Revenue</div></div></div>`
      : `<div class="stats"><div class="stat"><div class="num">${report.rows?.length}</div><div class="lbl">Entries</div></div></div>`;
    win.document.write(`<html><head><title>Sportek ${typeLabel}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}h1{color:#1d4ed8;margin-bottom:4px}.sub{color:#64748b;margin-bottom:20px;font-size:13px}.stats{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}.stat{padding:10px 18px;border:1px solid #e2e8f0;border-radius:8px;text-align:center;min-width:80px}.stat .num{font-size:22px;font-weight:bold}.stat .lbl{font-size:10px;color:#64748b;text-transform:uppercase}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:9px 11px;text-align:left;border:1px solid #e2e8f0;font-size:11px}td{padding:9px 11px;border:1px solid #e2e8f0;font-size:12px}.confirmed{color:#059669;font-weight:600}.noshow{color:#dc2626;font-weight:600}.pending{color:#d97706;font-weight:600}</style></head><body><h1>Sportek - ${typeLabel}</h1><p class="sub">Period: ${report.from} to ${report.to} - Generated: ${new Date().toLocaleString()}</p>${statsHTML}${tableHTML}</body></html>`);
    win.document.close(); win.focus(); setTimeout(() => win.print(), 400);
  };

  const TYPES = [
    { key: 'booking',  label: 'Booking Details',  desc: 'All bookings with attendance & payment info' },
    { key: 'facility', label: 'Facility Usage',    desc: 'Per-facility booking counts and revenue' },
    { key: 'entry',    label: 'Entry Log',         desc: 'Manual visitor entry/exit records' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate, view, download and send reports to the property owner</p>
      </div>
      <Card>
        <CardContent className="p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Report Type</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TYPES.map(t => (
                <button key={t.key} onClick={() => { setReportType(t.key); setReport(null); setError(''); }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${reportType === t.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}>
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className={`text-xs mt-1 ${reportType === t.key ? 'text-slate-300' : 'text-slate-500'}`}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800" />
            </div>
            <Button onClick={generateReport} isLoading={loading} disabled={loading}>Generate Report</Button>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        </CardContent>
      </Card>
      {report && (
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">
                {TYPES.find(t => t.key === report.type)?.label} {report.from === report.to ? `- ${report.from}` : `- ${report.from} to ${report.to}`}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={downloadReport}>Download PDF</Button>
                {sendSuccess ? (
                  <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <CheckCircle className="w-4 h-4" /> Sent to owner
                  </div>
                ) : (
                  <Button size="sm" onClick={sendToOwner} isLoading={sending} disabled={sending}>
                    <Send className="w-4 h-4 mr-1" /> Send to Owner
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {report.type === 'booking' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[{label:'Total',value:report.total,color:'text-slate-800'},{label:'Confirmed',value:report.confirmed,color:'text-emerald-600'},{label:'No Shows',value:report.noShow,color:'text-red-600'},{label:'Pending',value:report.pending,color:'text-amber-600'},{label:'Revenue',value:`$${report.revenue?.toFixed(2)}`,color:'text-blue-600'}].map(s=>(
                    <div key={s.label} className="bg-slate-50 border rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 font-semibold uppercase mb-1">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {!report.rows?.length ? <p className="text-center text-slate-400 py-6 text-sm">No bookings in this period.</p> : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                        <tr>{['Customer','Facility','Date','Time','Payment','Amount','Status','Attendance'].map(h=><th key={h} className="px-3 py-2.5 whitespace-nowrap text-xs">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.rows.map(b=>(
                          <tr key={b._id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-medium text-slate-900">{b.customerId?.name||'-'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{b.propertyId?.name||'-'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{b.date?new Date(b.date).toLocaleDateString():'-'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{b.timeSlot?.start} - {b.timeSlot?.end}</td>
                            <td className="px-3 py-2.5 capitalize text-slate-500">{b.paymentMethod}</td>
                            <td className="px-3 py-2.5 font-semibold">${b.totalAmount?.toFixed(2)}</td>
                            <td className="px-3 py-2.5"><Badge variant={b.status==='active'?'success':'default'}>{b.status}</Badge></td>
                            <td className="px-3 py-2.5"><Badge variant={b.attendanceStatus==='confirmed'?'success':b.attendanceStatus==='noShow'?'destructive':'warning'}>{b.attendanceStatus}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {report.type === 'facility' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[{label:'Facilities',value:report.rows?.length,color:'text-slate-800'},{label:'Total Bookings',value:report.total,color:'text-slate-800'},{label:'Revenue',value:`$${report.revenue?.toFixed(2)}`,color:'text-blue-600'}].map(s=>(
                    <div key={s.label} className="bg-slate-50 border rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 font-semibold uppercase mb-1">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {!report.rows?.length ? <p className="text-center text-slate-400 py-6 text-sm">No data in this period.</p> : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                        <tr>{['Facility','Total Bookings','Confirmed','No Shows','Revenue'].map(h=><th key={h} className="px-3 py-2.5 whitespace-nowrap text-xs">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.rows.map((r,i)=>(
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-medium text-slate-900">{r.name}</td>
                            <td className="px-3 py-2.5">{r.bookings}</td>
                            <td className="px-3 py-2.5 text-emerald-600 font-semibold">{r.confirmed}</td>
                            <td className="px-3 py-2.5 text-red-600 font-semibold">{r.noShow}</td>
                            <td className="px-3 py-2.5 font-semibold text-blue-600">${r.revenue?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {report.type === 'entry' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border rounded-xl p-3 text-center w-32">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Total Entries</p>
                  <p className="text-xl font-bold text-slate-800">{report.rows?.length}</p>
                </div>
                {!report.rows?.length ? <p className="text-center text-slate-400 py-6 text-sm">No entry log records in this period.</p> : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                        <tr>{['Name','NIC','Type','Facility','Date','Entry Time','Exit Time'].map(h=><th key={h} className="px-3 py-2.5 whitespace-nowrap text-xs">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.rows.map((e,i)=>(
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-medium text-slate-900">{e.name}</td>
                            <td className="px-3 py-2.5 font-mono text-xs tracking-wider">{e.nic||'—'}</td>
                            <td className="px-3 py-2.5"><Badge variant="default">{e.type}</Badge></td>
                            <td className="px-3 py-2.5 text-slate-600">{e.facility}</td>
                            <td className="px-3 py-2.5">{e.date}</td>
                            <td className="px-3 py-2.5">{e.entryTime}</td>
                            <td className="px-3 py-2.5 text-slate-500">{e.exitTime||'—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
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

  const fetchAvailability = () => {
    setLoading(true);
    setError('');
    api.get('/properties/my-availability')
      .then(res => {
        setProperties(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load availability data.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAvailability();
    // Refresh every 60 seconds so availability stays current
    const interval = setInterval(fetchAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

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
  
  const availableCount = properties.filter(p => p.isAvailable).length;
  const notAvailableCount = properties.filter(p => !p.isAvailable).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Facilities</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{properties.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Available</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{availableCount}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Not Available</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{notAvailableCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Facility Availability</h2>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={fetchAvailability}>Refresh</Button>
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
            <option value="all">All Facilities</option>
            <option value="available">Available Only</option>
            <option value="not_available">Not Available Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="name_az">Name: A-Z</option>
            <option value="name_za">Name: Z-A</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : processedProperties.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">
              {searchQuery || filterStatus !== 'all' 
                ? 'No facilities match your filters.' 
                : 'No facilities found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedProperties.map(p => (
            <Card key={p._id} className="hover:shadow-lg transition-shadow overflow-hidden bg-white">
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
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1">Sport Type</p>
                    <p className="text-slate-600">{p.sportType}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1">Location</p>
                    <p className="text-slate-600">{p.location?.address || '—'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1">Available Hours</p>
                    <p className="text-slate-600">{p.availableHours?.start} – {p.availableHours?.end}</p>
                  </div>
                </div>
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
  const [endingId, setEndingId] = useState(null);

  const fetchBookings = () => {
    api.get('/bookings/current-security')
      .then(res => {
        setBookings(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load current bookings.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
    // Poll every 15 seconds to pick up new check-ins
    const interval = setInterval(fetchBookings, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleEndSession = async (bookingId) => {
    setEndingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/end-session`);
      setBookings(prev => prev.filter(b => b._id !== bookingId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end session');
    } finally {
      setEndingId(null);
    }
  };

  const processedBookings = bookings.filter(b => {
    const customerName = b.customerId?.name || '';
    const propertyName = b.propertyId?.name || '';
    return customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           propertyName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Current Bookings</h2>
          <p className="text-sm text-slate-500 mt-1">Customers currently checked in and active</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
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
          <Button variant="outline" size="sm" onClick={fetchBookings}>Refresh</Button>
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
        <div className="text-center py-12 bg-slate-50 border rounded-xl">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm">No active sessions right now.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
              <tr>
                {['Customer', 'Facility', 'Date', 'Time Slot', 'Payment', 'Amount', 'Status', 'Action'].map(h => (
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
                    <Badge variant="success">Active</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="danger"
                      isLoading={endingId === b._id}
                      disabled={endingId === b._id}
                      onClick={() => handleEndSession(b._id)}
                    >
                      End
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

function EntryLog() {
  const [properties, setProperties] = useState([]);

  // Persist log to localStorage so it survives navigation
  const STORAGE_KEY = 'sportek_entry_log';
  const [log, setLogState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  const setLog = (updater) => {
    setLogState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [visitorName, setVisitorName] = useState('');
  const [visitorNic, setVisitorNic] = useState('');
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
    setLoading(true);
    api.get('/properties/my-availability')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setProperties(data);
        if (data.length > 0) {
          setFacility(data[0].name);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load properties.');
        setLoading(false);
      });
  }, []);

  const handleAddVisitor = (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorNic.trim()) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    setFormEntryTime(timeStr);
    
    const newEntry = {
      id: Date.now(),
      name: visitorName,
      nic: visitorNic.toUpperCase(),
      type: visitorType,
      facility: facility,
      entryTime: timeStr,
      exitTime: null,
      date: new Date().toISOString().split('T')[0]
    };
    
    setLog(prev => [newEntry, ...prev]);
    setVisitorName('');
    setVisitorNic('');
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
        item.facility.toLowerCase().includes(q) ||
        (item.nic || '').toLowerCase().includes(q)
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Visitor Name <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">NIC Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={visitorNic}
                  onChange={(e) => setVisitorNic(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm transition-all"
                  placeholder="e.g. 991234567V"
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
                    {['Name', 'NIC', 'Type', 'Facility', 'Entry Time', 'Exit Time'].map(h => (
                      <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLog.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 text-xs tracking-wider">{item.nic || '—'}</td>
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