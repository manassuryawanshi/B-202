import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import FlatmateAvatar from './Avatars';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function QrModal({
  isOpen,
  onClose,
  recipient,
  currentUser,
  onMarkBillPaid
}) {
  if (!isOpen || !recipient) return null;

  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState(recipient.defaultAmount || '');
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
  const [launchedAppName, setLaunchedAppName] = useState('');
  const [showConfirmPaidPrompt, setShowConfirmPaidPrompt] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [markPaidSuccess, setMarkPaidSuccess] = useState(false);

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

  // Listen for user returning to the app from PhonePe / GPay / Paytm
  useEffect(() => {
    const handleReturnToApp = () => {
      if (document.visibilityState === 'visible' && hasLaunchedApp && recipient?.billId) {
        setShowConfirmPaidPrompt(true);
      }
    };

    document.addEventListener('visibilitychange', handleReturnToApp);
    window.addEventListener('focus', handleReturnToApp);

    return () => {
      document.removeEventListener('visibilitychange', handleReturnToApp);
      window.removeEventListener('focus', handleReturnToApp);
    };
  }, [hasLaunchedApp, recipient?.billId]);

  const handleCopyUpi = () => {
    playHapticChime('click');
    navigator.clipboard.writeText(recipient.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPhonePe = () => {
    playHapticChime('success');
    setLaunchedAppName('PhonePe');
    setHasLaunchedApp(true);

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
    setLaunchedAppName('Google Pay');
    setHasLaunchedApp(true);

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
    setLaunchedAppName('Paytm');
    setHasLaunchedApp(true);

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
    setLaunchedAppName('UPI App');
    setHasLaunchedApp(true);
    window.location.href = upiUrl;
  };

  const handleConfirmPaid = async () => {
    if (!recipient?.billId || !currentUser?.id || !onMarkBillPaid) return;
    setIsMarkingPaid(true);
    playHapticChime('success');
    const finalAmount = Number(amount) || recipient.defaultAmount || 0;
    await onMarkBillPaid(recipient.billId, currentUser.id, finalAmount);
    setMarkPaidSuccess(true);
    setTimeout(() => {
      onClose();
    }, 900);
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

          {/* Return-from-app Auto-Payment Confirmation Prompt */}
          {showConfirmPaidPrompt && recipient?.billId && (
            <div
              style={{
                width: '100%',
                background: 'var(--ios-blue-light, #EFF6FF)',
                border: '1.5px solid var(--ios-blue)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'center',
                animation: 'fadeIn 0.25s ease'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                Payment Confirmation
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                Did your payment of <b>₹{amount || recipient.defaultAmount}</b> to <b>{recipient.name}</b> on {launchedAppName || 'UPI'} succeed?
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={handleConfirmPaid}
                  disabled={isMarkingPaid || markPaidSuccess}
                  className="ios-btn ios-btn-primary"
                  style={{ flex: 1, fontSize: '12.5px', fontWeight: 800, padding: '8px' }}
                >
                  {markPaidSuccess ? '✓ Paid!' : isMarkingPaid ? 'Updating...' : 'Yes, Mark as Paid'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmPaidPrompt(false)}
                  className="ios-btn ios-btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                >
                  Not Yet
                </button>
              </div>
            </div>
          )}

          {/* 4 LOGO BUTTONS IN ONE HORIZONTAL LINE */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              width: '100%',
              marginTop: '4px'
            }}
          >
            {/* 1. PhonePe */}
            <button
              type="button"
              onClick={handleOpenPhonePe}
              title="Pay with PhonePe"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 2px 8px 2px',
                borderRadius: '16px',
                border: '1.5px solid #5F259F',
                background: 'var(--ios-card, #FFFFFF)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(95, 37, 159, 0.15)',
                transition: 'transform 0.15s ease'
              }}
              className="clickable"
            >
              {/* PhonePe Official Logo */}
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="11" fill="#5F259F"/>
                <path d="M21 8.5H15C14.2 8.5 13.5 9.2 13.5 10V28C13.5 28.8 14.2 29.5 15 29.5C15.8 29.5 16.5 28.8 16.5 28V24H21C25.1 24 28.5 20.6 28.5 16.5C28.5 12.4 25.1 8.5 21 8.5ZM21 21H16.5V11.5H21C23.8 11.5 25.5 13.5 25.5 16.2C25.5 19 23.8 21 21 21Z" fill="#FFFFFF"/>
                <circle cx="27" cy="10" r="2.2" fill="#FFFFFF"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#5F259F' }}>
                PhonePe
              </span>
            </button>

            {/* 2. Google Pay (GPay) */}
            <button
              type="button"
              onClick={handleOpenGPay}
              title="Pay with Google Pay"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 2px 8px 2px',
                borderRadius: '16px',
                border: '1.5px solid var(--ios-card-border, #ECEEF2)',
                background: 'var(--ios-card, #FFFFFF)',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'transform 0.15s ease'
              }}
              className="clickable"
            >
              {/* Google Pay Official Logo */}
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="11" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.2"/>
                <path d="M20 17.5V22.5H25.4C24.9 24.1 23.6 25.7 20 25.7C16.7 25.7 14 23 14 19.7C14 16.4 16.7 13.7 20 13.7C21.9 13.7 23.3 14.5 24 15.2L26.6 12.6C24.9 11 22.7 10 20 10C14.7 10 10.4 14.3 10.4 19.7C10.4 25.1 14.7 29.4 20 29.4C25.8 29.4 29.2 25.2 29.2 20.1C29.2 19.2 29.1 18.4 28.9 17.5H20Z" fill="#4285F4"/>
                <path d="M12.4 16.3L15.8 18.9C16.7 16.3 18.6 14.5 21.2 13.9L20 10C16.5 11 13.7 13.3 12.4 16.3Z" fill="#EA4335"/>
                <path d="M20 29.4C22.8 29.4 25.2 28.4 26.9 26.8L23.6 23.9C22.6 24.6 21.4 25.2 20 25.2C17.3 25.2 15.1 23.4 14.2 20.9L10.7 23.5C12.3 26.7 15.8 29.4 20 29.4Z" fill="#34A853"/>
                <path d="M10.7 23.5C10.2 22.3 10 21 10 19.7C10 18.4 10.2 17.1 10.7 15.9L14.2 18.5C14.1 18.9 14 19.3 14 19.7C14 20.1 14.1 20.5 14.2 20.9L10.7 23.5Z" fill="#FBBC05"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                GPay
              </span>
            </button>

            {/* 3. Paytm */}
            <button
              type="button"
              onClick={handleOpenPaytm}
              title="Pay with Paytm"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 2px 8px 2px',
                borderRadius: '16px',
                border: '1.5px solid var(--ios-card-border, #ECEEF2)',
                background: 'var(--ios-card, #FFFFFF)',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'transform 0.15s ease'
              }}
              className="clickable"
            >
              {/* Paytm Official Logo */}
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="11" fill="#002970"/>
                <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="9" letterSpacing="0.3">Pay</text>
                <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="#00BAF2" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="9" letterSpacing="0.3">tm</text>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                Paytm
              </span>
            </button>

            {/* 4. Other / BHIM UPI */}
            <button
              type="button"
              onClick={handleOpenOtherUpi}
              title="Open other UPI App"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 2px 8px 2px',
                borderRadius: '16px',
                border: '1.5px solid var(--ios-card-border, #ECEEF2)',
                background: 'var(--ios-card, #FFFFFF)',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'transform 0.15s ease'
              }}
              className="clickable"
            >
              {/* NPCI UPI Arrows Logo */}
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="11" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.2"/>
                <path d="M15 13L22 20L15 27" stroke="#097939" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 13L28 20L21 27" stroke="#F15A24" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                Other UPI
              </span>
            </button>
          </div>

          {/* Optional Direct 1-Tap Manual "Mark as Paid" if opened for a bill */}
          {recipient?.billId && onMarkBillPaid && !showConfirmPaidPrompt && (
            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={isMarkingPaid || markPaidSuccess}
              className="ios-btn ios-btn-secondary"
              style={{
                width: '100%',
                marginTop: '4px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--ios-green)',
                background: 'rgba(52, 199, 89, 0.08)',
                border: '1px solid rgba(52, 199, 89, 0.25)'
              }}
            >
              {markPaidSuccess ? '✓ Share Marked as Paid!' : isMarkingPaid ? 'Updating...' : `✓ Mark My Share as Paid (₹${amount || recipient.defaultAmount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
