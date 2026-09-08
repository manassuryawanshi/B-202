import React, { useState } from 'react';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function LoginModal({
  isOpen,
  members,
  onLoginSuccess
}) {
  if (!isOpen) return null;

  const [selectedMember, setSelectedMember] = useState(members[2] || members[0]); // default to Manas
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectMember = (member) => {
    playHapticChime('click');
    setSelectedMember(member);
    setPin('');
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!pin) {
      setErrorMsg('Please enter your password / PIN');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember.id,
          pin: pin.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        playHapticChime('success');
        onLoginSuccess(data.user);
      } else {
        playHapticChime('nudge');
        setErrorMsg(data.error || 'Incorrect Password / PIN');
      }
    } catch (err) {
      // Fallback for offline mode: test default PIN 1234
      if (pin.trim() === '1234') {
        playHapticChime('success');
        onLoginSuccess(selectedMember);
      } else {
        setErrorMsg('Incorrect PIN. Default is 1234.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ alignItems: 'center', padding: '16px' }}>
      <div
        className="ios-card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '24px 20px',
          boxShadow: 'var(--shadow-float)',
          borderRadius: '24px',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img
            src="/apple-touch-icon.png"
            alt="B-202 App Icon"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              margin: '0 auto 10px auto',
              boxShadow: '0 6px 18px rgba(255, 149, 0, 0.28)',
              display: 'block'
            }}
          />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
            Flat B-202 Sign In
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '3px' }}>
            Select your profile to access chores & bills
          </div>
        </div>

        {/* Member Profile Picker */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', marginBottom: '8px' }}>
            Select Your Profile
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '6px'
            }}
          >
            {members.map((member) => {
              const isSelected = selectedMember?.id === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelectMember(member)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 2px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                    background: isSelected ? 'var(--ios-blue-light)' : '#FFFFFF',
                    boxShadow: isSelected ? '0 2px 6px rgba(11, 87, 228, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: member.avatarColor,
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  >
                    {member.initials}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? 'var(--ios-blue)' : 'var(--ios-text-primary)'
                    }}
                  >
                    {member.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form for Password / PIN */}
        <form onSubmit={handleLogin}>
          <div
            className="ios-inset-box"
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: selectedMember.avatarColor,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {selectedMember.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                {selectedMember.name}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                {selectedMember.room} • {selectedMember.displayPhone}
              </div>
            </div>
          </div>

          <div className="ios-input-group">
            <label className="ios-label">Password / PIN (Default: 1234)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPin ? 'text' : 'password'}
                className="ios-input"
                style={{ width: '100%', paddingRight: '40px' }}
                placeholder="Enter password or 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ios-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPin ? <MaterialIcon name="visibility_off" size={18} /> : <MaterialIcon name="visibility" size={18} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                background: 'var(--ios-red-light)',
                border: '1px solid #F8C9C5',
                color: 'var(--ios-red)',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '12px'
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="ios-btn ios-btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : `Sign In as ${selectedMember.name}`} <MaterialIcon name="arrow_forward" size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
