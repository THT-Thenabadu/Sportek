import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  ActivityIndicator, Image, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'qrcode';

// ── Status color map ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  booked:         { bg: '#dcfce7', text: '#16a34a' },
  active:         { bg: '#dbeafe', text: '#1d4ed8' },
  pending_onsite: { bg: '#fef9c3', text: '#a16207' },
  completed:      { bg: '#f1f5f9', text: '#475569' },
  cancelled:      { bg: '#fee2e2', text: '#dc2626' },
};

export default function BookingQRCard({ booking, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  const qrValue = booking?._id?.toString() || booking?.qrCodeData || 'no-data';
  const bookingToken = booking?.bookingToken
    || booking?._id?.toString().slice(-6).toUpperCase()
    || '------';
  const facility = booking?.propertyId?.name || 'Facility';
  const date = booking?.date
    ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const time = booking?.timeSlot
    ? `${booking.timeSlot.start} – ${booking.timeSlot.end}`
    : '—';
  const status = booking?.status || 'booked';
  const statusColors = STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#475569' };
  const passkey = booking?.passkey;

  // Generate QR as PNG data URL
  useEffect(() => {
    if (!qrValue) return;
    QRCode.toDataURL(qrValue, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(url => setQrDataUrl(url))
      .catch(console.error);
  }, [qrValue]);

  // Download on web — build a full card as HTML canvas and save as PNG
  const handleDownload = async () => {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        // Draw the card onto a canvas and download as PNG
        const canvas = document.createElement('canvas');
        const W = 360, H = passkey ? 560 : 500;
        canvas.width = W * 2;
        canvas.height = H * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        // Background
        ctx.fillStyle = '#1e293b';
        roundRect(ctx, 0, 0, W, H, 16);
        ctx.fill();

        // Header
        ctx.fillStyle = '#0f172a';
        roundRect(ctx, 0, 0, W, 72, 16);
        ctx.fill();
        ctx.fillRect(0, 56, W, 16); // square bottom corners

        // Logo text
        ctx.fillStyle = '#1d4ed8';
        roundRect(ctx, 20, 16, 32, 32, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('S', 29, 37);
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('SPORTEK', 60, 37);

        // Confirmed text
        ctx.fillStyle = '#93c5fd';
        ctx.font = '12px sans-serif';
        ctx.fillText('Booking Confirmed!', 20, 60);

        // White QR area
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, 80, 84, 200, 200, 12);
        ctx.fill();

        // QR image
        const qrImg = new window.Image();
        qrImg.src = qrDataUrl;
        await new Promise(r => { qrImg.onload = r; });
        ctx.drawImage(qrImg, 88, 92, 184, 184);

        // Token
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bookingToken, W / 2, 318);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Show this code at the entrance', W / 2, 334);

        // Divider
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, 348); ctx.lineTo(W - 20, 348);
        ctx.stroke();

        // Details
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        const rows = [
          ['Facility', facility],
          ['Date', date],
          ['Time', time],
          ['Status', status.replace('_', ' ').toUpperCase()],
        ];
        rows.forEach(([label, val], i) => {
          const y = 372 + i * 26;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px sans-serif';
          ctx.fillText(label, 20, y);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(val, 100, y);
        });

        // Passkey
        if (passkey) {
          ctx.fillStyle = '#1d4ed8';
          roundRect(ctx, 20, H - 90, W - 40, 56, 10);
          ctx.fill();
          ctx.fillStyle = '#bfdbfe';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ENTRY PASSKEY', W / 2, H - 68);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px monospace';
          ctx.fillText(passkey, W / 2, H - 44);
        }

        // Footer
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Present this QR to the security officer on arrival', W / 2, H - 12);

        // Download
        const link = document.createElement('a');
        link.download = `Booking-${bookingToken}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (e) {
      console.log('Download error:', e.message);
      alert('Download failed. Please screenshot the QR code.');
    } finally {
      setDownloading(false);
    }
  };

  if (!booking) return null;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Card */}
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.logoRow}>
            <View style={styles.logoSquare}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={styles.logoText}>SPORTEK</Text>
          </View>
          <Text style={styles.confirmedText}>Booking Confirmed!</Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrWrapper}>
          {qrDataUrl ? (
            <Image
              source={{ uri: qrDataUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator color="#1d4ed8" />
            </View>
          )}
        </View>

        {/* Token */}
        <View style={styles.tokenBox}>
          <Text style={styles.tokenValue}>{bookingToken}</Text>
          <Text style={styles.tokenHint}>Show this code at the entrance</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Details */}
        <View style={styles.details}>
          <DetailRow label="Facility" value={facility} />
          <DetailRow label="Date" value={date} />
          <DetailRow label="Time" value={time} />
          <DetailRow label="Payment"
            value={booking.paymentMethod === 'onsite' ? 'Pay On-Site' : 'Online'} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Passkey */}
        {passkey && (
          <View style={styles.passkeyBox}>
            <Text style={styles.passkeyLabel}>ENTRY PASSKEY</Text>
            <Text style={styles.passkeyValue}>{passkey}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Present this QR code to the security officer on arrival
        </Text>
      </View>

      {/* Download button — web only */}
      {Platform.OS === 'web' && (
        <TouchableOpacity
          style={[styles.downloadBtn, (!qrDataUrl || downloading) && { opacity: 0.6 }]}
          onPress={handleDownload}
          disabled={!qrDataUrl || downloading}
        >
          {downloading
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.downloadBtnText}>Download QR Card</Text>
              </>
          }
        </TouchableOpacity>
      )}

      {Platform.OS !== 'web' && (
        <View style={styles.screenshotHint}>
          <Ionicons name="camera-outline" size={16} color="#64748b" />
          <Text style={styles.screenshotHintText}>
            Take a screenshot to save your QR card
          </Text>
        </View>
      )}

      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// Canvas rounded rect helper
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },

  card: {
    width: 320, backgroundColor: '#1e293b',
    borderRadius: 20, overflow: 'hidden', marginBottom: 16,
  },
  cardHeader: {
    backgroundColor: '#0f172a', padding: 20,
    alignItems: 'center', gap: 6,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoSquare: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: { fontSize: 18, fontWeight: '900', color: '#fff' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  confirmedText: { fontSize: 13, color: '#93c5fd', fontWeight: '600' },

  qrWrapper: {
    backgroundColor: '#fff', margin: 20, borderRadius: 16,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  qrImage: { width: 180, height: 180 },
  qrPlaceholder: {
    width: 180, height: 180,
    justifyContent: 'center', alignItems: 'center',
  },

  tokenBox: { alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  tokenValue: {
    fontSize: 30, fontWeight: '800', color: '#60a5fa',
    letterSpacing: 6,
  },
  tokenHint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  divider: { height: 1, backgroundColor: '#334155', marginHorizontal: 20, marginBottom: 16 },

  details: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 12, color: '#94a3b8', width: 68 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#e2e8f0', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '800' },

  passkeyBox: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#1d4ed8', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  passkeyLabel: { fontSize: 10, color: '#bfdbfe', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  passkeyValue: {
    fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 8,
  },

  footer: {
    fontSize: 11, color: '#64748b', textAlign: 'center',
    paddingHorizontal: 20, paddingBottom: 20,
  },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1d4ed8', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
    marginBottom: 10, width: 320,
  },
  downloadBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  screenshotHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  screenshotHintText: { fontSize: 12, color: '#64748b' },

  closeBtn: {
    paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: '#e2e8f0', width: 320, alignItems: 'center',
  },
  closeBtnText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
});
