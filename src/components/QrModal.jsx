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
  const [copiedAction, setCopiedAction] = useState(null);
  const [amount, setAmount] = useState(recipient.defaultAmount || '');
  const [selectedPlatform, setSelectedPlatform] = useState('phonepe'); // 'phonepe' | 'gpay' | 'paytm' | 'upi'
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
  const [showConfirmPaidPrompt, setShowConfirmPaidPrompt] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showManualOptions, setShowManualOptions] = useState(false);
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

  // Direct 1-Tap Deep Link URL Generator
  const getDirectAppUrl = (platform) => {
    const pa = getPlatformVpa(activeUpiId, platform);
    const pn = recipient.name || 'Flatmate';
    const am = amount || recipient.defaultAmount || '';
    const tn = recipient.title || 'Flat B-202 Share';
    const tr = `B202TXN${Date.now()}`;

    const params = new URLSearchParams();
    params.append('pa', pa);
    params.append('pn', pn);
    if (am) {
      const num = parseFloat(String(am).replace(/,/g, ''));
      params.append('am', !isNaN(num) && num > 0 ? num.toFixed(2) : String(am));
    }
    params.append('cu', 'INR');
    params.append('tn', tn);
    params.append('tr', tr);

    const query = params.toString();

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (platform === 'phonepe') {
      if (isAndroid) {
        return `intent://pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`;
      }
      // Official PhonePe iOS scheme with /upi/pay path for direct 1-tap checkout
      return `phonepe://upi/pay?${query}`;
    }

    if (platform === 'gpay') {
      if (isAndroid) {
        return `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      }
      return `gpay://upi/pay?${query}`;
    }

    if (platform === 'paytm') {
      if (isAndroid) {
        return `intent://pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`;
      }
      return `paytmmp://upi/pay?${query}`;
    }

    // Universal UPI scheme (opens Android / iOS app chooser directly to checkout)
    return `upi://pay?${query}`;
  };

  // P2P static UPI URI for QR code
  const upiQrUrl = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(
    recipient.name
  )}${amount ? `&am=${amount}` : ''}&cu=INR&mode=00`;

  useEffect(() => {
    if (canvasRef.current && activeUpiId) {
      QRCode.toCanvas(
        canvasRef.current,
        upiQrUrl,
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
  }, [recipient, activeUpiId, upiQrUrl, showQrCode]);

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

  // Fallback: Pay via Mobile Number
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
  const directAppUrl = getDirectAppUrl(selectedPlatform);

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
              <FlatmateAvatar id={recipient.id || 'owner'} size={38} />
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
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ios-blue)' }}>
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

          {/* PRIMARY 1-TAP ACTION: DIRECT LINK TO PHONEPE / GPAY / PAYTM CHECKOUT */}
          <a
            href={directAppUrl}
            onClick={() => {
              playHapticChime('success');
              setHasLaunchedApp(true);
            }}
            style={{
              textDecoration: 'none',
              width: '100%',
              backgroundColor: currentPlatform.brandColor,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '15.5px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '14px 18px',
              borderRadius: '16px',
              boxShadow: `0 4px 14px ${currentPlatform.activeBg.replace('0.08', '0.45')}`,
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'all 0.2s ease'
            }}
            className="clickable"
            id="btn-direct-1-tap-pay"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MaterialIcon name="bolt" size={20} color="#FFFFFF" />
              <span>1-Tap Direct Pay {amount ? `₹${amount}` : 'Now'} with {currentPlatform.name}</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.92, letterSpacing: '0.2px' }}>
              ⚡ Pre-fills payee & ₹{amount || recipient.defaultAmount} • Opens PIN screen directly
            </span>
          </a>

          {/* SECONDARY ACTION: UNIVERSAL UPI CHOOSER */}
          <a
            href={getDirectAppUrl('upi')}
            onClick={() => {
              playHapticChime('success');
              setHasLaunchedApp(true);
            }}
            style={{
              textDecoration: 'none',
              width: '100%',
              backgroundColor: 'rgba(0, 122, 255, 0.08)',
              color: 'var(--ios-blue)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '14px',
              border: '1.5px solid rgba(0, 122, 255, 0.25)',
              cursor: 'pointer'
            }}
            className="clickable"
          >
            <MaterialIcon name="open_in_new" size={16} color="var(--ios-blue)" />
            <span>Pay with Any UPI App (Universal Intent)</span>
          </a>

          {/* COLLAPSIBLE MANUAL & ALTERNATIVE OPTIONS ACCORDION */}
          <div
            style={{
              width: '100%',
              borderRadius: '14px',
              border: '1px solid var(--ios-border)',
              backgroundColor: 'var(--ios-card-bg)',
              overflow: 'hidden',
              marginTop: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setShowManualOptions(!showManualOptions)}
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
                <MaterialIcon name="tune" size={16} color="var(--ios-text-tertiary)" />
                <span>Manual Options (UPI ID, Phone, QR Code)</span>
              </div>
              <MaterialIcon name={showManualOptions ? 'expand_less' : 'expand_more'} size={18} />
            </button>

            {showManualOptions && (
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  borderTop: '1px solid var(--ios-border)'
                }}
              >
                {/* UPI ID Row (with Copy & Inline Edit) */}
                <div
                  className="ios-inset-box"
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '8px 12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ textAlign: 'left', flex: 1, minWidth: 0, marginRight: '8px' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                        Recipient UPI ID (VPA)
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

                {/* Manual Phone Number Payment */}
                {recipient.phone && (
                  <button
                    type="button"
                    onClick={handlePayViaPhone}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: 'var(--ios-text-secondary)',
                      fontWeight: 600,
                      fontSize: '11.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: '1px dashed var(--ios-border)',
                      cursor: 'pointer'
                    }}
                    className="clickable"
                  >
                    <MaterialIcon name="phone_iphone" size={14} />
                    <span>Pay via Mobile Number ({recipient.displayPhone || recipient.phone})</span>
                  </button>
                )}

                {/* Toast when phone number is copied */}
                {copiedAction && (
                  <div
                    style={{
                      width: '100%',
                      background: 'rgba(52, 199, 89, 0.12)',
                      border: '1.5px solid var(--ios-green)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--ios-green)' }}>
                      <MaterialIcon name="check_circle" size={16} color="var(--ios-green)" />
                      <span>Copied ({recipient.phone})</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--ios-text-primary)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Paste in {currentPlatform.name} <strong>To Mobile Number</strong>.
                    </p>
                  </div>
                )}

                {/* Toggle Live Camera QR */}
                <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ios-blue)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <MaterialIcon name="qr_code_2" size={15} color="var(--ios-blue)" />
                    <span>{showQrCode ? 'Hide Camera QR' : 'Show Camera QR Code'}</span>
                  </button>

                  {showQrCode && (
                    <div
                      style={{
                        padding: '10px 0 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <div
                        style={{
                          padding: '10px',
                          background: '#ffffff',
                          borderRadius: '14px',
                          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
                        }}
                      >
                        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '8px' }} />
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--ios-text-tertiary)', lineHeight: 1.25 }}>
                        Scan live with phone camera from a second screen (laptop/tablet).
                      </span>
                    </div>
                  )}
                </div>
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
