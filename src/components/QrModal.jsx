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

  const handleOpenUpiApp = () => {
    playHapticChime('success');
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
              SCAN WITH GPAY / PHONEPE / PAYTM
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

          <button
            type="button"
            className="ios-btn ios-btn-primary"
            style={{ width: '100%', marginTop: '4px' }}
            onClick={handleOpenUpiApp}
          >
            <MaterialIcon name="open_in_new" size={16} /> Open UPI App on Phone
          </button>
        </div>
      </div>
    </div>
  );
}
