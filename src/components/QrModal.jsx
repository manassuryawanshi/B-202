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
  onMarkBillPaid,
  onUpdateMemberUpi
}) {
  if (!isOpen || !recipient) return null;

  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [amount, setAmount] = useState(recipient.defaultAmount || '');
  const [selectedPlatform, setSelectedPlatform] = useState('phonepe'); // 'phonepe' | 'gpay' | 'paytm' | 'upi'
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
  const [showConfirmPaidPrompt, setShowConfirmPaidPrompt] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [markPaidSuccess, setMarkPaidSuccess] = useState(false);

  // Normalize initial UPI handle: default @upi to @ybl
  const initialUpi = (recipient.upiId || '').replace(/@upi$/i, '@ybl');
  const [activeUpiId, setActiveUpiId] = useState(initialUpi);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [editUpiInput, setEditUpiInput] = useState(initialUpi);

  // Sync state whenever recipient prop changes
  useEffect(() => {
    if (recipient) {
      const raw = recipient.upiId || '';
      const norm = raw.replace(/@upi$/i, '@ybl');
      setActiveUpiId(norm);
      setEditUpiInput(norm);
      setAmount(recipient.defaultAmount || '');
      setCopied(false);
      setCopiedPhone(false);
      setShowConfirmPaidPrompt(false);
    }
  }, [recipient]);

  // Clean UPI URL for QR code
  const upiQrUrl = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(
    recipient.name || 'Flatmate'
  )}${amount ? `&am=${amount}` : ''}&cu=INR&tn=${encodeURIComponent('B202 Flat Share')}`;

  // Render QR code
  useEffect(() => {
    if (canvasRef.current && activeUpiId) {
      QRCode.toCanvas(
        canvasRef.current,
        upiQrUrl,
        {
          width: 185,
          margin: 1,
          color: {
            dark: '#111827',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR render error:', error);
        }
      );
    }
  }, [recipient, activeUpiId, upiQrUrl]);

  // Listen for user returning to the app from external payment app
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

  // URL to directly open the selected app
  const getAppLaunchUrl = (platform) => {
    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (platform === 'phonepe') {
      return isAndroid
        ? 'intent://#Intent;package=com.phonepe.app;end'
        : 'phonepe://';
    }
    if (platform === 'gpay') {
      return isAndroid
        ? 'intent://#Intent;package=com.google.android.apps.nbu.paisa.user;end'
        : 'gpay://';
    }
    if (platform === 'paytm') {
      return isAndroid
        ? 'intent://#Intent;package=net.one97.paytm;end'
        : 'paytmmp://';
    }
    return 'upi://';
  };

  const handlePayNow = () => {
    playHapticChime('success');
    setHasLaunchedApp(true);
    if (activeUpiId) {
      navigator.clipboard.writeText(activeUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyUpi = () => {
    playHapticChime('click');
    navigator.clipboard.writeText(activeUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPhone = () => {
    if (!recipient.phone) return;
    playHapticChime('click');
    navigator.clipboard.writeText(recipient.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSaveEditedUpi = () => {
    if (editUpiInput.trim()) {
      playHapticChime('success');
      const trimmed = editUpiInput.trim();
      setActiveUpiId(trimmed);
      setIsEditingUpi(false);
      if (recipient.id && onUpdateMemberUpi) {
        onUpdateMemberUpi(recipient.id, trimmed);
      }
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
    }, 800);
  };

  const platforms = [
    {
      id: 'phonepe',
      name: 'PhonePe',
      logo: '/logos/phonepe.svg',
      brandColor: '#5F259F',
      activeBorder: '#5F259F',
      activeBg: 'rgba(95, 37, 159, 0.08)'
    },
    {
      id: 'gpay',
      name: 'Google Pay',
      logo: '/logos/gpay.svg',
      brandColor: '#1A73E8',
      activeBorder: '#1A73E8',
      activeBg: 'rgba(26, 115, 232, 0.08)'
    },
    {
      id: 'paytm',
      name: 'Paytm',
      logo: '/logos/paytm.svg',
      brandColor: '#002970',
      activeBorder: '#00BAF2',
      activeBg: 'rgba(0, 186, 242, 0.08)'
    },
    {
      id: 'upi',
      name: 'UPI / Other',
      logo: '/logos/upi.svg',
      brandColor: '#097939',
      activeBorder: '#097939',
      activeBg: 'rgba(9, 121, 57, 0.08)'
    }
  ];

  const currentPlatform = platforms.find((p) => p.id === selectedPlatform) || platforms[0];
  const appUrl = getAppLaunchUrl(selectedPlatform);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="ios-card modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '430px',
          width: '95%',
          textAlign: 'center',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '18px 16px 20px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MaterialIcon name="qr_code_2" size={22} color="var(--ios-blue)" />
            <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ios-text-primary)' }}>
              {recipient.title ? `Pay for ${recipient.title}` : `Payment QR Code`}
            </h2>
          </div>
          <button
            type="button"
            className="ios-btn ios-btn-secondary ios-btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <MaterialIcon name="close" size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
          {/* QR CODE BOX ON TOP (Requested original layout) */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '18px',
              border: '1px solid var(--ios-card-border-soft, #ECEEF2)',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <canvas ref={canvasRef} style={{ borderRadius: '8px' }} />
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--ios-text-tertiary)',
                marginTop: '6px',
                letterSpacing: '0.6px'
              }}
            >
              SCAN WITH ANY UPI APP
            </div>
          </div>

          {/* Recipient Profile Info & Amount */}
          <div
            className="ios-inset-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FlatmateAvatar id={recipient.id || 'owner'} size={38} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  {recipient.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                  {recipient.roomBadge ? `${recipient.roomBadge} • Flat B-202` : recipient.title || 'Flat B-202'}
                </div>
              </div>
            </div>

            {/* Amount display */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                Amount
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ios-blue)' }}>
                ₹{amount || recipient.defaultAmount || '0'}
              </div>
            </div>
          </div>

          {/* Amount input row (editable) */}
          <div
            className="ios-inset-box"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', width: '100%' }}
          >
            <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>Amount (₹):</span>
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
                flex: 1,
                outline: 'none'
              }}
            />
          </div>

          {/* 1-LINE STEPS BANNER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--ios-text-secondary)',
              padding: '7px 10px',
              background: 'rgba(120, 120, 128, 0.08)',
              borderRadius: '10px',
              width: '100%',
              textAlign: 'center',
              lineHeight: 1.2
            }}
          >
            <span>1. Click Pay Now</span>
            <span style={{ color: 'var(--ios-blue)', fontWeight: 900 }}>→</span>
            <span>2. Pay on App</span>
            <span style={{ color: 'var(--ios-blue)', fontWeight: 900 }}>→</span>
            <span>3. Mark as Paid</span>
          </div>

          {/* Recipient UPI ID with inline Copy & Edit */}
          <div
            className="ios-inset-box"
            style={{ width: '100%', padding: '8px 12px' }}
          >
            {!isEditingUpi ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0, marginRight: '8px' }}>
                  <div style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                    UPI ID (VPA)
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-blue)', marginTop: '1px', wordBreak: 'break-all' }}>
                    {activeUpiId}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditUpiInput(activeUpiId);
                      setIsEditingUpi(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--ios-text-tertiary)', cursor: 'pointer', padding: '2px' }}
                    title="Edit UPI ID"
                  >
                    <MaterialIcon name="edit" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      color: copied ? 'var(--ios-green)' : 'var(--ios-text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <MaterialIcon name={copied ? 'check' : 'content_copy'} size={13} color={copied ? 'var(--ios-green)' : 'inherit'} />
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <input
                  type="text"
                  value={editUpiInput}
                  onChange={(e) => setEditUpiInput(e.target.value)}
                  placeholder="name@ybl or phone@okaxis"
                  style={{
                    background: '#fff',
                    border: '1px solid var(--ios-blue)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    flex: 1,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveEditedUpi}
                  className="ios-btn ios-btn-primary ios-btn-sm"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUpi(false)}
                  className="ios-btn ios-btn-secondary ios-btn-sm"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Subtle mobile number copy if recipient has phone */}
            {recipient.phone && !isEditingUpi && (
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--ios-border-subtle, rgba(0,0,0,0.05))', fontSize: '11px', color: 'var(--ios-text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Mobile: {recipient.displayPhone || recipient.phone}</span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copiedPhone ? 'var(--ios-green)' : 'var(--ios-blue)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {copiedPhone ? 'Copied' : 'Copy Phone'}
                </button>
              </div>
            )}
          </div>

          {/* Section label */}
          <div style={{ width: '100%', textAlign: 'left', marginTop: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', letterSpacing: '0.4px' }}>
              Select Payment App
            </span>
          </div>

          {/* 4 OFFICIAL LOGO BUTTONS IN ONE HORIZONTAL LINE */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
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
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '14px',
                    border: isSelected ? `2px solid ${p.activeBorder}` : '1px solid var(--ios-border)',
                    backgroundColor: isSelected ? p.activeBg : 'var(--ios-card-bg)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    outline: 'none'
                  }}
                  className="clickable"
                >
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: p.activeBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <MaterialIcon name="check" size={9} color="#FFFFFF" />
                    </div>
                  )}

                  <div
                    style={{
                      width: '100%',
                      height: '30px',
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                    }}
                  >
                    <img
                      src={p.logo}
                      alt={p.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '22px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? p.brandColor : 'var(--ios-text-secondary)',
                      lineHeight: 1
                    }}
                  >
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* DEDICATED PAY NOW BUTTON */}
          <a
            href={appUrl}
            onClick={handlePayNow}
            style={{
              textDecoration: 'none',
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
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'all 0.2s ease'
            }}
            className="clickable"
            id="btn-pay-now"
          >
            <MaterialIcon name="bolt" size={20} color="#FFFFFF" />
            <span>Pay {amount ? `₹${amount}` : 'Now'} with {currentPlatform.name}</span>
          </a>

          {/* Toast if UPI ID is copied */}
          {copied && (
            <div
              style={{
                width: '100%',
                background: 'rgba(52, 199, 89, 0.12)',
                border: '1px solid var(--ios-green)',
                borderRadius: '10px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--ios-green)'
              }}
            >
              <MaterialIcon name="check_circle" size={14} color="var(--ios-green)" />
              <span>UPI ID copied! Paste in {currentPlatform.name}</span>
            </div>
          )}

          {/* Return-from-app Auto-Payment Confirmation Prompt */}
          {showConfirmPaidPrompt && recipient?.billId && (
            <div
              style={{
                width: '100%',
                background: 'var(--ios-blue-light, #EFF6FF)',
                border: '1.5px solid var(--ios-blue)',
                borderRadius: '14px',
                padding: '10px 12px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MaterialIcon name="task_alt" size={18} color="var(--ios-blue)" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                  Completed payment in {currentPlatform.name}?
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleConfirmPaid}
                  disabled={isMarkingPaid || markPaidSuccess}
                  className="ios-btn ios-btn-primary ios-btn-sm"
                  style={{ flex: 1, padding: '7px 10px', fontSize: '12px', fontWeight: 700 }}
                >
                  {markPaidSuccess ? '✓ Saved!' : isMarkingPaid ? 'Updating...' : 'Yes, Mark as Paid'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmPaidPrompt(false)}
                  className="ios-btn ios-btn-secondary ios-btn-sm"
                  style={{ padding: '7px 10px', fontSize: '12px' }}
                >
                  Not Yet
                </button>
              </div>
            </div>
          )}

          {/* Bottom "Mark as Paid" action if opened for a bill */}
          {recipient?.billId && onMarkBillPaid && !showConfirmPaidPrompt && (
            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={isMarkingPaid || markPaidSuccess}
              className="ios-btn ios-btn-secondary"
              style={{
                width: '100%',
                marginTop: '2px',
                padding: '11px',
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
