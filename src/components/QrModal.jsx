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
  const [downloadedQr, setDownloadedQr] = useState(false);
  const [amount, setAmount] = useState(recipient.defaultAmount || '');
  const [includeAmountInLink, setIncludeAmountInLink] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('phonepe'); // 'phonepe' | 'gpay' | 'paytm' | 'upi'
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
  const [showConfirmPaidPrompt, setShowConfirmPaidPrompt] = useState(false);
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
    }
  }, [recipient]);

  // Resolves the optimal VPA for the selected platform
  const getPlatformVpa = (baseUpi, platform) => {
    if (!baseUpi) return '';
    const trimmed = baseUpi.trim();
    const phoneMatch = trimmed.match(/^(\d{10})(@[a-zA-Z0-9.-]+)?$/);
    if (phoneMatch) {
      const phone = phoneMatch[1];
      if (platform === 'phonepe') {
        // PhonePe primary handle is phone@ybl
        return `${phone}@ybl`;
      }
      if (platform === 'paytm') {
        // Paytm primary handle is phone@paytm
        return `${phone}@paytm`;
      }
    }
    return trimmed;
  };

  // P2P static UPI URI (mode=00 ensures it is treated as a Peer-to-Peer transfer, avoiding merchant ₹200 limits)
  const upiUrl = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(
    recipient.name
  )}${amount ? `&am=${amount}` : ''}&cu=INR&mode=00`;

  useEffect(() => {
    if (canvasRef.current && activeUpiId) {
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
  }, [recipient, activeUpiId, upiUrl]);

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

  const handleDownloadQr = async () => {
    if (!canvasRef.current) return;
    playHapticChime('success');

    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      const safeName = (recipient.name || 'Flatmate').replace(/\s+/g, '_');

      // Attempt native Web Share API to save image directly to Photos on mobile
      if (navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `B202-QR-${safeName}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Pay ${recipient.name} (B202)`,
            text: `Payment QR code for ${recipient.name}`
          });
          setDownloadedQr(true);
          setTimeout(() => setDownloadedQr(false), 2500);
          return;
        }
      }

      // Standard browser download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `B202-QR-${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadedQr(true);
      setTimeout(() => setDownloadedQr(false), 2500);
    } catch (err) {
      console.error('Download QR error:', err);
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

  // Launch the selected platform app with P2P parameters
  const handlePayNow = () => {
    playHapticChime('success');
    setHasLaunchedApp(true);

    const pa = getPlatformVpa(activeUpiId, selectedPlatform);
    const pn = encodeURIComponent(recipient.name);
    // Omitting &am= opens P2P transfer screen without triggering bank unverified merchant caps
    const am = (includeAmountInLink && amount) ? `&am=${amount}` : '';
    // mode=00 explicitly declares static P2P transfer, avoiding merchant ₹200 limits
    const mode = '&mode=00';

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);

    if (selectedPlatform === 'phonepe') {
      if (isAndroid) {
        // Direct PhonePe package intent with P2P mode=00
        window.location.href = `intent://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}#Intent;scheme=upi;package=com.phonepe.app;end`;
      } else {
        // iOS PhonePe custom scheme with mode=00
        const iosPhonepe = `phonepe://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
        const start = Date.now();
        window.location.href = iosPhonepe;

        setTimeout(() => {
          if (Date.now() - start < 1500) {
            window.location.href = `phonepe://upi/pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
          }
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
      // Universal UPI
      window.location.href = `upi://pay?pa=${pa}&pn=${pn}${am}&cu=INR${mode}`;
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

  // Platform details for rendering with high-res official vector SVG logos
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
          {/* QR Canvas Container with Scan/Download Badge */}
          <div
            style={{
              padding: '12px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              display: 'inline-block',
              position: 'relative'
            }}
          >
            <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '12px' }} />

            {/* Quick 1-Tap "Save to Photos" overlay button */}
            <button
              type="button"
              onClick={handleDownloadQr}
              style={{
                marginTop: '8px',
                width: '100%',
                background: downloadedQr ? 'rgba(52, 199, 89, 0.12)' : 'rgba(0, 122, 255, 0.08)',
                border: downloadedQr ? '1px solid var(--ios-green)' : '1px solid rgba(0, 122, 255, 0.25)',
                borderRadius: '10px',
                padding: '5px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: downloadedQr ? 'var(--ios-green)' : 'var(--ios-blue)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
              title="Save QR image to gallery to scan directly in PhonePe/GPay (no limits)"
            >
              <MaterialIcon
                name={downloadedQr ? 'check_circle' : 'download'}
                size={14}
                color={downloadedQr ? 'var(--ios-green)' : 'var(--ios-blue)'}
              />
              <span>{downloadedQr ? 'Saved to Photos!' : 'Save QR to Photos (No Limits)'}</span>
            </button>
          </div>

          {/* Recipient Profile Info */}
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
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ios-blue)', marginTop: '2px', wordBreak: 'break-all' }}>
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
                  {['@ybl', '@okhdfcbank', '@oksbi', '@paytm', '@axl'].map((suffix) => (
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

          {/* Mobile Number Box (Pay to Contact in PhonePe / GPay) */}
          {recipient.phone && (
            <div
              onClick={handleCopyPhone}
              className="ios-inset-box"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '8px 12px'
              }}
              title="Click to copy mobile number for PhonePe / GPay 'To Mobile Number' transfer"
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                  Mobile Number (Pay to Contact)
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ios-text-primary)', marginTop: '2px' }}>
                  {recipient.displayPhone || recipient.phone}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: copiedPhone ? 'var(--ios-green)' : 'var(--ios-text-secondary)', fontWeight: 700 }}>
                {copiedPhone ? (
                  <>
                    <MaterialIcon name="check" size={14} color="var(--ios-green)" /> Copied
                  </>
                ) : (
                  <>
                    <MaterialIcon name="content_copy" size={14} /> Copy
                  </>
                )}
              </div>
            </div>
          )}

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

          {/* Select Platform Heading */}
          <div style={{ width: '100%', textAlign: 'left', marginTop: '4px' }}>
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

          {/* BANK LIMIT HELPER CARD */}
          <div
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 122, 255, 0.04)',
              border: '1px solid rgba(0, 122, 255, 0.15)',
              borderRadius: '14px',
              padding: '10px 12px',
              marginTop: '2px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-blue)', marginBottom: '3px' }}>
              <MaterialIcon name="info" size={15} color="var(--ios-blue)" />
              <span>App showing ₹200 or transaction limit?</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', lineHeight: 1.35, margin: '0 0 5px 0' }}>
              Bank engines sometimes restrict web browser links. You can bypass it with 100% success (up to ₹1 Lakh limit):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--ios-text-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontWeight: 800, color: 'var(--ios-blue)' }}>1.</span>
                <span>Tap <strong>Save QR to Photos</strong> above → Open {currentPlatform.name} → Tap QR scanner & pick from gallery.</span>
              </div>
              {recipient.phone && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--ios-green)' }}>2.</span>
                  <span>Tap <strong>Copy</strong> on Mobile Number → In {currentPlatform.name}, choose <strong>To Mobile Number</strong>.</span>
                </div>
              )}
            </div>
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
