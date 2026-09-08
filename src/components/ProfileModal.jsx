import React, { useState, useRef } from 'react';
import FlatmateAvatar from './Avatars';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  theme,
  onToggleTheme,
  onUpdateProfile,
  onLogout
}) {
  if (!isOpen || !currentUser) return null;

  const [activeSection, setActiveSection] = useState('details'); // 'details' | 'password' | 'appearance'
  const [name, setName] = useState(currentUser.name || '');
  const [room, setRoom] = useState(currentUser.room || '');
  const [phone, setPhone] = useState(currentUser.displayPhone || '');
  const [upiId, setUpiId] = useState(currentUser.upiId || '');
  const [customAvatar, setCustomAvatar] = useState(currentUser.customAvatar || '');

  // Password fields
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Handle Photo Upload
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (under 3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert('Please choose an image under 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setCustomAvatar(base64);
      playHapticChime('click');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomAvatar = () => {
    playHapticChime('click');
    setCustomAvatar('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Profile Details
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    playHapticChime('click');

    try {
      await onUpdateProfile({
        userId: currentUser.id,
        name: name.trim(),
        room: room.trim(),
        displayPhone: phone.trim(),
        upiId: upiId.trim(),
        customAvatar: customAvatar
      });

      playHapticChime('success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      alert('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!newPin || newPin.length < 4) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
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
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        playHapticChime('nudge');
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 120 }}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
        <div className="sheet-grab-bar" />

        {/* Modal Header */}
        <div className="sheet-header" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MaterialIcon name="person" size={22} color="var(--ios-blue)" />
            <h2 className="sheet-title">Profile & Settings</h2>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        {/* Hero Avatar Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0 16px 0',
            borderBottom: '1px solid var(--ios-card-border)'
          }}
        >
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <FlatmateAvatar
              id={currentUser.id}
              customAvatar={customAvatar}
              size={76}
            />

            {/* Camera Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: -2,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--ios-blue)',
                color: '#fff',
                border: '2px solid var(--ios-card, #FFFFFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
              }}
              title="Upload photo"
            >
              <MaterialIcon name="photo_camera" size={15} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
            {currentUser.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
            {currentUser.room} • {currentUser.roomBadge}
          </div>

          {customAvatar && (
            <button
              type="button"
              onClick={handleRemoveCustomAvatar}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ios-red)',
                fontSize: '11.5px',
                fontWeight: 600,
                marginTop: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <MaterialIcon name="delete" size={14} /> Reset to illustrated avatar
            </button>
          )}
        </div>

        {/* Flat Section Picker */}
        <div className="segmented-control" style={{ margin: '14px 0' }}>
          <button
            type="button"
            className={`segmented-btn ${activeSection === 'details' ? 'active' : ''}`}
            onClick={() => {
              playHapticChime('click');
              setActiveSection('details');
            }}
          >
            Edit Details
          </button>
          <button
            type="button"
            className={`segmented-btn ${activeSection === 'appearance' ? 'active' : ''}`}
            onClick={() => {
              playHapticChime('click');
              setActiveSection('appearance');
            }}
          >
            Appearance
          </button>
          <button
            type="button"
            className={`segmented-btn ${activeSection === 'password' ? 'active' : ''}`}
            onClick={() => {
              playHapticChime('click');
              setActiveSection('password');
            }}
          >
            Security
          </button>
        </div>

        {/* SECTION 1: EDIT DETAILS */}
        {activeSection === 'details' && (
          <form onSubmit={handleSaveProfile}>
            <div className="ios-input-group">
              <label className="ios-label">Full Name</label>
              <input
                className="ios-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-label">Room / Location in Flat B-202</label>
              <input
                className="ios-input"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Bedroom 1, Living Hall, etc."
                required
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-label">Phone Number</label>
              <input
                className="ios-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 80106 16851"
              />
            </div>

            <div className="ios-input-group">
              <label className="ios-label">UPI ID for Payments</label>
              <input
                className="ios-input"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@upi"
              />
            </div>

            {saveSuccess && (
              <div
                style={{
                  background: 'var(--ios-green-light)',
                  border: '1px solid var(--ios-green)',
                  color: 'var(--ios-green)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <MaterialIcon name="check_circle" size={16} filled /> Details updated successfully!
              </div>
            )}

            <button
              type="submit"
              className="ios-btn ios-btn-primary"
              style={{ width: '100%', marginTop: '4px' }}
              disabled={isSaving}
            >
              <MaterialIcon name="save" size={16} /> {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        )}

        {/* SECTION 2: APPEARANCE (LIGHT & DARK MODE) */}
        {activeSection === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 0' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                App Theme
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                Choose your preferred interface theme
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {/* Light Mode Card */}
              <button
                type="button"
                onClick={() => {
                  playHapticChime('click');
                  onToggleTheme('light');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  borderRadius: '16px',
                  border: theme === 'light' ? '2px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  color: '#111827'
                }}
              >
                <MaterialIcon name="light_mode" size={28} color={theme === 'light' ? 'var(--ios-blue)' : '#6B7280'} />
                <span style={{ fontSize: '13px', fontWeight: theme === 'light' ? 800 : 600 }}>
                  Light Mode
                </span>
                {theme === 'light' && (
                  <span className="status-pill info" style={{ padding: '2px 8px', fontSize: '10px' }}>
                    Active
                  </span>
                )}
              </button>

              {/* Dark Mode Card */}
              <button
                type="button"
                onClick={() => {
                  playHapticChime('click');
                  onToggleTheme('dark');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  borderRadius: '16px',
                  border: theme === 'dark' ? '2px solid var(--ios-blue)' : '1px solid #38383A',
                  background: '#1C1C1E',
                  cursor: 'pointer',
                  color: '#FFFFFF'
                }}
              >
                <MaterialIcon name="dark_mode" size={28} color={theme === 'dark' ? '#0A84FF' : '#8E8E93'} />
                <span style={{ fontSize: '13px', fontWeight: theme === 'dark' ? 800 : 600 }}>
                  Dark Mode
                </span>
                {theme === 'dark' && (
                  <span className="status-pill info" style={{ padding: '2px 8px', fontSize: '10px' }}>
                    Active
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SECTION 3: SECURITY / CHANGE PASSWORD */}
        {activeSection === 'password' && (
          <form onSubmit={handleChangePassword}>
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

            {passwordMsg.text && (
              <div
                style={{
                  background: passwordMsg.type === 'success' ? 'var(--ios-green-light)' : 'var(--ios-red-light)',
                  border: `1px solid ${passwordMsg.type === 'success' ? 'var(--ios-green)' : '#FCA5A5'}`,
                  color: passwordMsg.type === 'success' ? 'var(--ios-green)' : 'var(--ios-red)',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  marginBottom: '14px'
                }}
              >
                {passwordMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="ios-btn ios-btn-primary"
              style={{ width: '100%', marginTop: '6px' }}
              disabled={isUpdatingPassword}
            >
              <MaterialIcon name="key" size={16} /> {isUpdatingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        )}

        {/* LOGOUT BUTTON (Always available at bottom) */}
        <div style={{ marginTop: '22px', paddingTop: '14px', borderTop: '1px solid var(--ios-card-border)' }}>
          <button
            type="button"
            className="ios-btn ios-btn-danger"
            style={{ width: '100%', padding: '12px' }}
            onClick={() => {
              playHapticChime('click');
              onClose();
              onLogout();
            }}
            id="profile-sheet-logout-btn"
          >
            <MaterialIcon name="logout" size={18} /> Sign Out / Lock Account
          </button>
        </div>
      </div>
    </div>
  );
}
