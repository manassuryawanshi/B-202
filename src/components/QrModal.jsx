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
  const [copiedAction, setCopiedAction] = useState(null); // 'phone' | 'upi' | null
  const [amount, setAmount] = useState(recipient.defaultAmount || '');
  const [selectedPlatform, setSelectedPlatform] = useState('phonepe'); // 'phonepe' | 'gpay' | 'paytm' | 'upi'
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
  const [showConfirmPaidPrompt, setShowConfirmPaidPrompt] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [markPaidSuccess, setMarkPaidSuccess] = useState(false);

  // Normalize initial UPI handle: @upi is non-existent in bank apps, default to @ybl
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
      setCopiedAction(null);
    }
  }, [recipient]);

  // Resolves the optimal VPA for the selected platform (works for all flatmates)
  const getPlatformVpa = (baseUpi, platform) => {
    if (!baseUpi) return '';
    const trimmed = baseUpi.trim();
    // If it has a verified bank handle (and not generic @upi), respect it for all flatmates
    if (trimmed.includes('@') && !trimmed.toLowerCase().endsWith('@upi')) {
      return trimmed;
    }
    // If it's a 10-digit phone number or ends with @upi
    const phoneMatch = trimmed.match(/^(\d{10})(@upi)?$/i);
    if (phoneMatch) {
      const phone = phoneMatch[1];
      if (platform === 'phonepe') return `${phone}@ybl`;
      if (platform === 'paytm') return `${phone}@paytm`;
    }
    return trimmed;
  };

  // P2P static UPI URI (mode=00 ensures it is treated as a Peer-to-Peer transfer)
  const upiUrl = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(
    recipient.name
  )}${amount ? `&am=${amount}` : ''}&cu=INR&mode=00`;

  useEffect(() => {
    if (canvasRef.current && activeUpiId) {
      QRCode.toCanvas(
        canvasRef.current,
        upiUrl,
        {
          width: 190,
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
  }, [recipient, activeUpiId, upiUrl, showQrCode]);

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

  // Pay via Mobile Number (100% reliable, zero bank / gallery limits)
  const handlePayViaPhone = () => {
    if (!recipient.phone) return;
    playHapticChime('success');
    setHasLaunchedApp(true);
    navigator.clipboard.writeText(recipient.phone);
    setCopiedPhone(true);
    setCopiedAction('phone');
    setTimeout(() => setCopiedPhone(false), 3000);

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    if (selectedPlatform === 'phonepe') {
      window.location.href = isAndroid ? 'intent://#Intent;package=com.phonepe.app;end' : 'phonepe://';
    } else if (selectedPlatform === 'gpay') {
      window.location.href = isAndroid ? 'intent://#Intent;package=com.google.android.apps.nbu.paisa.user;end' : 'gpay://';
    } else if (selectedPlatform === 'paytm') {
      window.location.href = isAndroid ? 'intent://#Intent;package=net.one97.paytm;end' : 'paytmmp://';
    } else {
      window.location.href = 'upi://';
    }
  };

  // Pay via UPI ID (Copies handle & opens app)
  const handlePayViaUpi = () => {
    if (!activeUpiId) return;
    playHapticChime('success');
    setHasLaunchedApp(true);
    navigator.clipboard.writeText(activeUpiId);
    setCopied(true);
    setCopiedAction('upi');
    setTimeout(() => setCopied(false), 3000);

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    if (selectedPlatform === 'phonepe') {
      window.location.href = isAndroid ? 'intent://#Intent;package=com.phonepe.app;end' : 'phonepe://';
    } else if (selectedPlatform === 'gpay') {
      window.location.href = isAndroid ? 'intent://#Intent;package=com.google.android.apps.nbu.paisa.user;end' : 'gpay://';
    } else if (selectedPlatform === 'paytm') {
      window.location.href = isAndroid ? 'intent://#Intent;package=net.one97.paytm;end' : 'paytmmp://';
    } else {
      window.location.href = 'upi://';
    }
  };

  // Direct app intent trigger with P2P parameters
  const handlePayNowDirect = () => {
    playHapticChime('success');
    setHasLaunchedApp(true);

    const pa = getPlatformVpa(activeUpiId, selectedPlatform);
    const pn = encodeURIComponent(recipient.name);
    const am = amount ? `&am=${amount}` : '';
    const mode = '&mode=00';

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (selectedPlatform === 'phonepe') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}#Intent;scheme=upi;package=com.phonepe.app;end`;
      } else {
        window.location.href = `phonepe://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
        setTimeout(() => {
          window.location.href = `phonepe://upi/pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
        }, 500);
      }
    } else if (selectedPlatform === 'gpay') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      } else {
        window.location.href = `gpay://upi/pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
      }
    } else if (selectedPlatform === 'paytm') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}#Intent;scheme=upi;package=net.one97.paytm;end`;
      } else {
        window.location.href = `paytmmp://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
      }
    } else {
      window.location.href = `upi://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
    }
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
    }, 900);
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
          padding: '20px 18px 24px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ios-text-primary)' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
          {/* Recipient Profile Info */}
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
              <FlatmateAvatar id={recipient.id || 'owner'} size={36} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  {recipient.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                  {recipient.roomBadge ? `${recipient.roomBadge} • Flat B-202` : recipient.title || 'Flat B-202'}
                </div>
              </div>
            </div>

            {/* Amount pill / display */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                Amount
              </div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--ios-blue)' }}>
                ₹{amount || recipient.defaultAmount || '0'}
              </div>
            </div>
          </div>

          {/* Amount input row (if user wants to customize) */}
          <div
            className="ios-inset-box"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', width: '100%' }}
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
                flex: 1,
                outline: 'none'
              }}
            />
          </div>

          {/* Select Platform Heading */}
          <div style={{ width: '100%', textAlign: 'left', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
              Select Payment App
            </span>
          </div>

          {/* HORIZONTAL LINE OF OFFICIAL LOGO BUTTONS */}
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
                    gap: '5px',
                    padding: '8px 4px',
                    borderRadius: '14px',
                    border: isSelected ? `2px solid ${p.activeBorder}` : '1px solid var(--ios-border)',
                    backgroundColor: isSelected ? p.activeBg : 'var(--ios-card-bg)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transform: isSelected ? 'translateY(-1px)' : 'none',
                    outline: 'none'
                  }}
                  className="clickable"
                >
                  {/* Selected check badge */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: p.activeBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <MaterialIcon name="check" size={10} color="#FFFFFF" />
                    </div>
                  )}

                  {/* Official SVG Logo in High-Contrast Badge */}
                  <div
                    style={{
                      width: '100%',
                      height: '32px',
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
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

          {/* PRIMARY PAYMENT ACTION: PAY VIA MOBILE NUMBER (ZERO LIMITS) */}
          {recipient.phone && (
            <button
              type="button"
              onClick={handlePayViaPhone}
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
              <MaterialIcon name="phone_iphone" size={19} color="#FFFFFF" />
              <span>Pay to Mobile No. ({recipient.displayPhone || recipient.phone})</span>
            </button>
          )}

          {/* SECONDARY ACTION: PAY VIA UPI ID */}
          <button
            type="button"
            onClick={handlePayViaUpi}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 122, 255, 0.08)',
              color: 'var(--ios-blue)',
              fontWeight: 700,
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 16px',
              borderRadius: '14px',
              border: '1.5px solid rgba(0, 122, 255, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            className="clickable"
          >
            <MaterialIcon name="badge" size={17} color="var(--ios-blue)" />
            <span>Pay to UPI ID ({activeUpiId})</span>
          </button>

          {/* TERTIARY ACTION: DIRECT LINK LAUNCH */}
          <button
            type="button"
            onClick={handlePayNowDirect}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'var(--ios-text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '2px 0'
            }}
          >
            Or try direct {currentPlatform.name} checkout link
          </button>

          {/* INTERACTIVE ACTION INSTRUCTION TOAST */}
          {copiedAction && (
            <div
              style={{
                width: '100%',
                background: 'rgba(52, 199, 89, 0.12)',
                border: '1.5px solid var(--ios-green)',
                borderRadius: '14px',
                padding: '10px 14px',
                textAlign: 'left',
                boxShadow: '0 4px 12px rgba(52, 199, 89, 0.15)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: 'var(--ios-green)' }}>
                <MaterialIcon name="check_circle" size={18} color="var(--ios-green)" />
                <span>
                  {copiedAction === 'phone'
                    ? `Copied Mobile No. (${recipient.phone})`
                    : `Copied UPI ID (${activeUpiId})`}
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--ios-text-primary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                👉 In <strong>{currentPlatform.name}</strong>: tap{' '}
                <strong>{copiedAction === 'phone' ? 'To Mobile Number' : 'To Bank / UPI ID'}</strong> at the top, paste, and enter{' '}
                <strong>₹{amount || recipient.defaultAmount}</strong>. This bypasses all gallery scan limits!
              </p>
            </div>
          )}

          {/* UPI ID Row (with Copy & Inline Edit) */}
          <div
            className="ios-inset-box"
            style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '8px 12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0, marginRight: '8px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                  UPI ID (VPA)
                </div>
                {!isEditingUpi && (
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-blue)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {activeUpiId}
                  </div>
                )}
              </div>

              {!isEditingUpi && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditUpiInput(activeUpiId);
                      setIsEditingUpi(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--ios-text-tertiary)', cursor: 'pointer', padding: '2px' }}
                    title="Correct or change UPI handle"
                  >
                    <MaterialIcon name="edit" size={14} />
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
                    {copied ? (
                      <>
                        <MaterialIcon name="check" size={14} color="var(--ios-green)" /> Copied
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="content_copy" size={14} /> Copy
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {isEditingUpi && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={editUpiInput}
                    onChange={(e) => setEditUpiInput(e.target.value)}
                    placeholder="e.g. name@ybl or phone@okaxis"
                    style={{
                      background: '#fff',
                      border: '1px solid var(--ios-blue)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      flex: 1,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveEditedUpi}
                    className="ios-btn ios-btn-primary ios-btn-sm"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
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

                {/* Quick handle suggestions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {['@ybl', '@oksbi', '@okhdfcbank', '@paytm', '@axl'].map((suffix) => (
                    <button
                      key={suffix}
                      type="button"
                      onClick={() => {
                        const prefix = editUpiInput.split('@')[0] || (recipient.phone || '');
                        setEditUpiInput(`${prefix}${suffix}`);
                      }}
                      style={{
                        background: 'rgba(0,122,255,0.08)',
                        border: '1px solid rgba(0,122,255,0.2)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        color: 'var(--ios-blue)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {suffix}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLLAPSIBLE LIVE CAMERA QR CODE SECTION */}
          <div
            style={{
              width: '100%',
              borderRadius: '14px',
              border: '1px solid var(--ios-border)',
              backgroundColor: 'var(--ios-card-bg)',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MaterialIcon name="qr_code_2" size={17} color="var(--ios-blue)" />
                <span>Show QR Code (Scan with phone camera)</span>
              </div>
              <MaterialIcon name={showQrCode ? 'expand_less' : 'expand_more'} size={18} />
            </button>

            {showQrCode && (
              <div
                style={{
                  padding: '12px 14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  borderTop: '1px solid var(--ios-border)'
                }}
              >
                <div
                  style={{
                    padding: '10px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '8px' }} />
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--ios-text-secondary)', lineHeight: 1.3 }}>
                  Point your phone's camera at this QR on a laptop/tablet screen to scan live.
                </span>
              </div>
            )}
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
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MaterialIcon name="task_alt" size={20} color="var(--ios-blue)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                  Did you complete the payment in {currentPlatform.name}?
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

          {/* Universal Guidance Note */}
          <div
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 122, 255, 0.04)',
              border: '1px solid rgba(0, 122, 255, 0.15)',
              borderRadius: '14px',
              padding: '10px 12px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-blue)', marginBottom: '3px' }}>
              <MaterialIcon name="info" size={15} color="var(--ios-blue)" />
              <span>Why PhonePe gallery QR shows a limit</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', lineHeight: 1.35, margin: 0 }}>
              PhonePe blocks or restricts payments from gallery photos to ₹2,000. Using <strong>Pay to Mobile No.</strong> or <strong>Pay to UPI ID</strong> above transfers funds directly via NPCI with standard bank limits (up to ₹1 Lakh) with zero errors.
            </p>
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
