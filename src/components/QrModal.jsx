import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import FlatmateAvatar from './Avatars';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function QrModal({
  isOpen,
  onClose,
  recipient
}) {
  if (!isOpen || !recipient) return null;

  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState(recipient.defaultAmount || '');

  const upiUrl = `upi://pay?pa=${recipient.upiId}&pn=${encodeURIComponent(
    recipient.name
  )}${amount ? `&am=${amount}` : ''}&cu=INR&tn=${encodeURIComponent('B202 Flat Share')}`;

  useEffect(() => {
    if (canvasRef.current && recipient.upiId) {
      QRCode.toCanvas(
        canvasRef.current,
        upiUrl,
        {
          width: 200,
          margin: 2,
          color: {
            dark: '#111827',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR error:', error);
        }
      );
    }
  }, [recipient, upiUrl]);

  const handleCopyUpi = () => {
    playHapticChime('click');
    navigator.clipboard.writeText(recipient.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPhonePe = () => {
    playHapticChime('success');
    const pa = recipient.upiId;
    const pn = encodeURIComponent(recipient.name);
    const am = amount ? `&am=${amount}` : '';
    const tn = encodeURIComponent('B202 Flat Share');

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (isAndroid) {
      // Direct Android package intent targeting PhonePe (prevents WhatsApp from intercepting)
      window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}#Intent;scheme=upi;package=com.phonepe.app;end`;
    } else {
      // iOS PhonePe custom scheme
      const iosPhonepe = `phonepe://upi/pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}`;
      const start = Date.now();
      window.location.href = iosPhonepe;

      // Fallback for older iOS PhonePe builds
      setTimeout(() => {
        if (Date.now() - start < 1500) {
          window.location.href = `phonepe://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}`;
        }
      }, 500);
    }
  };

  const handleOpenGPay = () => {
    playHapticChime('click');
    const pa = recipient.upiId;
    const pn = encodeURIComponent(recipient.name);
    const am = amount ? `&am=${amount}` : '';
    const tn = encodeURIComponent('B202 Flat Share');

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (isAndroid) {
      window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    } else {
      window.location.href = `gpay://upi/pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}`;
    }
  };

  const handleOpenPaytm = () => {
    playHapticChime('click');
    const pa = recipient.upiId;
    const pn = encodeURIComponent(recipient.name);
    const am = amount ? `&am=${amount}` : '';
    const tn = encodeURIComponent('B202 Flat Share');

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (isAndroid) {
      window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}#Intent;scheme=upi;package=net.one97.paytm;end`;
    } else {
      window.location.href = `paytmmp://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}`;
    }
  };

  const handleOpenOtherUpi = () => {
    playHapticChime('click');
    window.location.href = upiUrl;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab-bar" />

        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MaterialIcon name="qr_code_2" size={22} color="var(--ios-blue)" />
            <h2 className="sheet-title">Payment QR Code</h2>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          {/* Canvas Box */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '14px',
              borderRadius: '20px',
              border: '1px solid #ECEEF2',
              boxShadow: 'var(--shadow-flat)',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <canvas ref={canvasRef} style={{ borderRadius: '10px' }} />
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: 'var(--ios-text-secondary)',
                marginTop: '6px',
                letterSpacing: '0.8px'
              }}
            >
              SCAN WITH PHONEPE / GPAY / PAYTM
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <FlatmateAvatar id={recipient.id || 'owner'} size={32} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                {recipient.name}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                {recipient.roomBadge ? `${recipient.roomBadge} • Flat B-202` : recipient.title || 'Flat B-202'}
              </div>
            </div>
          </div>

          {/* Amount input */}
          <div
            className="ios-inset-box"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px' }}
          >
            <span style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>Amount (₹):</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 4500 or 9000"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ios-text-primary)',
                fontSize: '15px',
                fontWeight: 800,
                width: '110px',
                outline: 'none'
              }}
            />
          </div>

          {/* Copy Box */}
          <div
            onClick={handleCopyUpi}
            className="ios-inset-box"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                UPI ID
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ios-blue)', marginTop: '2px' }}>
                {recipient.upiId}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: copied ? 'var(--ios-green)' : 'var(--ios-text-secondary)', fontWeight: 700 }}>
              {copied ? (
                <>
                  <MaterialIcon name="check" size={15} color="var(--ios-green)" /> Copied
                </>
              ) : (
                <>
                  <MaterialIcon name="content_copy" size={15} /> Copy
                </>
              )}
            </div>
          </div>

          {/* Primary Action: Direct PhonePe Button */}
          <button
            type="button"
            onClick={handleOpenPhonePe}
            style={{
              width: '100%',
              backgroundColor: '#5f259f',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '14px',
              boxShadow: '0 4px 14px rgba(95, 37, 159, 0.35)',
              border: 'none',
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'transform 0.15s ease'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#FFFFFF"/>
              <path d="M13.8 7.2H9.8C8.8 7.2 8 8 8 9V14.5C8 15.3 8.7 16 9.5 16C10.3 16 11 15.3 11 14.5V13.2H13.8C15.2 13.2 16.3 12.1 16.3 10.7C16.3 9.3 15.2 7.2 13.8 7.2ZM13.6 11.5H11V8.9H13.6C14.1 8.9 14.6 9.3 14.6 9.8C14.6 10.3 14.1 11.5 13.6 11.5Z" fill="#5F259F"/>
            </svg>
            Pay with PhonePe
          </button>

          {/* Secondary Actions: GPay, Paytm, and Other UPI */}
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button
              type="button"
              onClick={handleOpenGPay}
              className="ios-btn ios-btn-secondary"
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: 700,
                padding: '8px 4px',
                justifyContent: 'center'
              }}
            >
              Google Pay
            </button>
            <button
              type="button"
              onClick={handleOpenPaytm}
              className="ios-btn ios-btn-secondary"
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: 700,
                padding: '8px 4px',
                justifyContent: 'center'
              }}
            >
              Paytm
            </button>
            <button
              type="button"
              onClick={handleOpenOtherUpi}
              className="ios-btn ios-btn-secondary"
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: 700,
                padding: '8px 4px',
                justifyContent: 'center'
              }}
            >
              Other UPI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
