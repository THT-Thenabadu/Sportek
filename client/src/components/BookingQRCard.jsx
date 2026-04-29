import React, { useRef, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Button from './ui/Button';
import QRCode from 'qrcode';

function BookingQRCard({ booking }) {
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // The data encoded in the QR — just the booking ID string for reliable scanning
  const qrPayload = booking._id?.toString() || '';
  const bookingToken = booking.bookingToken || '------';

  useEffect(() => {
    if (!qrPayload) return;
    QRCode.toDataURL(qrPayload, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    }).then(url => setQrDataUrl(url)).catch(console.error);
  }, [qrPayload]);

  const downloadQRCode = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1e293b',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `Booking-${bookingToken}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 max-h-[80vh] overflow-y-auto py-4">
      <div
        ref={cardRef}
        style={{
          width: '360px',
          backgroundColor: '#1e293b',
          padding: '16px',
          borderRadius: '12px'
        }}
      >
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              Booking Confirmed!
            </h1>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ padding: '8px', border: '2px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
                : <div style={{ width: '160px', height: '160px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading...</div>
              }
            </div>
          </div>

          {/* Token */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>
              {bookingToken}
            </p>
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
              Show this code at the entrance
            </p>
          </div>

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '2px solid #e2e8f0' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>FACILITY</p>
              <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600', margin: 0 }}>{booking.propertyId?.name || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>DATE</p>
              <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                {booking.date ? new Date(booking.date).toISOString().split('T')[0] : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>TIME</p>
              <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                {booking.timeSlot?.start || 'N/A'} – {booking.timeSlot?.end || 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>PAYMENT</p>
              <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600', margin: 0, textTransform: 'capitalize' }}>
                {booking.paymentMethod || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={downloadQRCode} className="flex items-center gap-2 px-6 py-3" style={{ backgroundColor: '#2563eb', color: '#fff' }}>
        <Download className="w-5 h-5" />
        Download QR Code
      </Button>
    </div>
  );
}

export default BookingQRCard;
