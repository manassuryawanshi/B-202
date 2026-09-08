import React, { useState } from 'react';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function ChangePasswordModal({ isOpen, onClose, currentUser }) {
  if (!isOpen || !currentUser) return null;

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPin.trim() || newPin.length < 4) {
      setErrorMsg('New password must be at least 4 characters.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPin: oldPin.trim(),
          newPin: newPin.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playHapticChime('success');
        setSuccessMsg('Password changed successfully.');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        playHapticChime('nudge');
        setErrorMsg(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab-bar" />

        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MaterialIcon name="key" size={20} color="var(--ios-blue)" />
            <h2 className="sheet-title">Change Password ({currentUser.name})</h2>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        {successMsg ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <MaterialIcon name="check_circle" size={44} color="var(--ios-green)" filled style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
              Password Updated
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
              Your profile is secured with the new password.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="ios-input-group">
              <label className="ios-label">Current Password / PIN (Default: 1234)</label>
              <input
                type="password"
                className="ios-input"
                placeholder="Enter current password"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                required
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-label">New Password / PIN</label>
              <input
                type="password"
                className="ios-input"
                placeholder="Enter new 4+ character password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                required
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-label">Confirm New Password</label>
              <input
                type="password"
                className="ios-input"
                placeholder="Repeat new password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'var(--ios-red-light)',
                  border: '1px solid #FCA5A5',
                  color: 'var(--ios-red)',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  marginBottom: '14px'
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="ios-btn ios-btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ios-btn ios-btn-primary"
                style={{ flex: 2 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
