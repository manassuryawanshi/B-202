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
  const [selectedPlatform, setSelectedPlatform] = useState('phonepe'); // 'phonepe' | 'gpay' | 'paytm' | 'upi'
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
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

  // Listen for user returning to the app from the external UPI payment app
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

  // Launch the selected platform app
  const handlePayNow = () => {
    playHapticChime('success');
    setHasLaunchedApp(true);

    const pa = recipient.upiId;
    const pn = encodeURIComponent(recipient.name);
    const am = amount ? `&am=${amount}` : '';
    const tn = encodeURIComponent('B202 Flat Share');

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (selectedPlatform === 'phonepe') {
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
    } else if (selectedPlatform === 'gpay') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      } else {
        window.location.href = `gpay://upi/pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}`;
      }
    } else if (selectedPlatform === 'paytm') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}#Intent;scheme=upi;package=net.one97.paytm;end`;
      } else {
        window.location.href = `paytmmp://pay?pa=${pa}&pn=${pn}${am}&cu=INR&tn=${tn}`;
      }
    } else {
      // Other generic UPI app
      window.location.href = upiUrl;
    }
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

  // Platform details for rendering
  const platforms = [
    {
      id: 'phonepe',
      name: 'PhonePe',
      logo: '/logos/phonepe-icon.svg',
      brandColor: '#5F259F',
      activeBorder: '#5F259F',
      activeBg: 'rgba(95, 37, 159, 0.08)'
    },
    {
      id: 'gpay',
      name: 'Google Pay',
      logo: '/logos/gpay-icon.svg',
      brandColor: '#1A73E8',
      activeBorder: '#1A73E8',
      activeBg: 'rgba(26, 115, 232, 0.08)'
    },
    {
      id: 'paytm',
      name: 'Paytm',
      logo: '/logos/paytm-icon.svg',
      brandColor: '#002970',
      activeBorder: '#00BAF2',
      activeBg: 'rgba(0, 186, 242, 0.08)'
    },
    {
      id: 'upi',
      name: 'Other UPI',
      logo: '/logos/upi-icon.svg',
      brandColor: '#097939',
      activeBorder: '#097939',
      activeBg: 'rgba(9, 121, 57, 0.08)'
    }
  ];

  const currentPlatform = platforms.find((p) => p.id === selectedPlatform) || platforms[0];

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
              SCAN WITH ANY UPI APP
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
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
                Did your payment of <b>₹{amount || recipient.defaultAmount}</b> to <b>{recipient.name}</b> on {currentPlatform.name} succeed?
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

          {/* Section Label */}
          <div style={{ width: '100%', textAlign: 'left', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', letterSpacing: '0.4px' }}>
              Select Payment Platform
            </span>
          </div>

          {/* 4 OFFICIAL LOGO BUTTONS IN ONE HORIZONTAL LINE */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              width: '100%'
            }}
          >
            {platforms.map((p) => {
              const isSelected = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playHapticChime('click');
                    setSelectedPlatform(p.id);
                  }}
                  title={`Select ${p.name}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 2px 8px 2px',
                    borderRadius: '16px',
                    border: isSelected
                      ? `2px solid ${p.activeBorder}`
                      : '1.5px solid var(--ios-card-border, #ECEEF2)',
                    background: isSelected ? p.activeBg : 'var(--ios-card, #FFFFFF)',
                    cursor: 'pointer',
                    boxShadow: isSelected
                      ? `0 2px 10px ${p.activeBg}`
                      : '0 1px 4px rgba(0,0,0,0.03)',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.18s ease',
                    position: 'relative'
                  }}
                  className="clickable"
                >
                  {/* Selected checkmark indicator pill */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-3px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: p.activeBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      <MaterialIcon name="check" size={11} color="#FFFFFF" />
                    </div>
                  )}

                  {/* Official SVG Logo */}
                  <img
                    src={p.logo}
                    alt={p.name}
                    style={{
                      width: '32px',
                      height: '32px',
                      objectFit: 'contain',
                      borderRadius: '10px'
                    }}
                  />

                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? p.brandColor : 'var(--ios-text-secondary)',
                      lineHeight: 1.1
                    }}
                  >
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* DEDICATED PAY NOW BUTTON */}
          <button
            type="button"
            onClick={handlePayNow}
            style={{
              width: '100%',
              backgroundColor: currentPlatform.brandColor,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '13px 18px',
              borderRadius: '16px',
              boxShadow: `0 4px 14px ${currentPlatform.activeBg.replace('0.08', '0.4')}`,
              border: 'none',
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'all 0.2s ease'
            }}
            className="clickable"
          >
            <MaterialIcon name="bolt" size={19} color="#FFFFFF" />
            <span>Pay {amount ? `₹${amount}` : 'Now'} with {currentPlatform.name}</span>
          </button>

          {/* Optional Direct 1-Tap Manual "Mark as Paid" if opened for a bill */}
          {recipient?.billId && onMarkBillPaid && !showConfirmPaidPrompt && (
            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={isMarkingPaid || markPaidSuccess}
              className="ios-btn ios-btn-secondary"
              style={{
                width: '100%',
                marginTop: '2px',
                fontSize: '12.5px',
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
