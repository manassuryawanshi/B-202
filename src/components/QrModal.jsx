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
  )}${amount ? `&am=${amount}` : ''}&cu=INR`;

  // Render QR code
  useEffect(() => {
    if (canvasRef.current && activeUpiId) {
      QRCode.toCanvas(
        canvasRef.current,
        upiQrUrl,
        {
          width: 175,
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
    // Auto-copy UPI ID to clipboard so user has it ready in app
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
          maxWidth: '420px',
          width: '95%',
          textAlign: 'center',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '18px 16px 20px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ios-text-primary)' }}>
            {recipient.title ? `Pay for ${recipient.title}` : `Pay ${recipient.name}`}
          </h2>
          <button
            type="button"
            className="ios-btn ios-btn-secondary ios-btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <MaterialIcon name="close" size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          {/* Recipient Profile Info & Amount */}
          <div
            className="ios-inset-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FlatmateAvatar id={recipient.id || 'owner'} size={36} />
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
              <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--ios-blue)' }}>
                ₹{amount || recipient.defaultAmount || '0'}
              </div>
            </div>
          </div>

          {/* Amount input (editable) */}
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
                fontSize: '14.5px',
                fontWeight: 800,
                flex: 1,
                outline: 'none'
              }}
            />
          </div>

          {/* 1-LINE STEPS BANNER (Requested by user) */}
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

          {/* Horizontal Line of Official App Logos */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              width: '100%',
              marginTop: '2px'
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
                    borderRadius: '12px',
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
                      height: '28px',
                      background: '#FFFFFF',
                      borderRadius: '7px',
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
                        maxHeight: '20px',
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

          {/* PRIMARY BUTTON: OPEN SELECTED APP FOR PAYMENT */}
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
              padding: '13px 16px',
              borderRadius: '14px',
              boxShadow: `0 4px 14px ${currentPlatform.activeBg.replace('0.08', '0.4')}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '2px'
            }}
            className="clickable"
            id="btn-pay-now"
          >
            <MaterialIcon name="open_in_new" size={18} color="#FFFFFF" />
            <span>Pay Now on {currentPlatform.name}</span>
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
              <span>UPI ID copied to clipboard ({activeUpiId})</span>
            </div>
          )}

          {/* CLEAN QR CODE CARD */}
          <div
            className="ios-inset-box"
            style={{
              width: '100%',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div
              style={{
                padding: '8px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
              }}
            >
              <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '6px' }} />
            </div>

            {/* Recipient UPI ID with inline Copy & Edit */}
            <div style={{ width: '100%', textAlign: 'center' }}>
              {!isEditingUpi ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    {activeUpiId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    style={{
                      background: 'rgba(0, 122, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      color: copied ? 'var(--ios-green)' : 'var(--ios-blue)',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <MaterialIcon name={copied ? 'check' : 'content_copy'} size={12} />
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditUpiInput(activeUpiId);
                      setIsEditingUpi(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ios-text-tertiary)',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                    title="Edit UPI ID"
                  >
                    <MaterialIcon name="edit" size={13} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '4px' }}>
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
              {recipient.phone && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
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
                      marginLeft: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedPhone ? 'Copied' : 'Copy'}
                  </button>
                </div>
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
