import React, { useState } from 'react';
import FlatmateAvatar from './Avatars';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function LoginScreen({ members, onLoginSuccess }) {
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
    <div
      style={{
        minHeight: '100vh',
        background: '#F6F7FA',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'var(--font-apple)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '28px 22px',
          border: '1px solid #ECEEF2',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #007AFF 0%, #4338CA 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              boxShadow: '0 6px 16px rgba(0, 122, 255, 0.25)'
            }}
          >
            <MaterialIcon name="lock" size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1C1E23', letterSpacing: '-0.4px' }}>
            B-202 Skyra Residency
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
            Choose your profile to unlock your flat dashboard
          </p>
        </div>

        {/* Profile Selector Grid */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#8A92A0',
              marginBottom: '10px',
              letterSpacing: '0.6px'
            }}
          >
            Select Your Account
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
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
                    gap: '6px',
                    padding: '8px 2px',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid #007AFF' : '1px solid #E5E7EB',
                    background: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FlatmateAvatar id={member.id} size={36} />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#007AFF' : '#1F2937'
                    }}
                  >
                    {member.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected User Inset Card */}
        <form onSubmit={handleLogin}>
          <div
            style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            <FlatmateAvatar id={selectedMember.id} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                {selectedMember.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>
                {selectedMember.room} • {selectedMember.displayPhone}
              </div>
            </div>
          </div>

          {/* Password / PIN Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.4px' }}>
              Password / PIN (Default: 1234)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPin ? 'text' : 'password'}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  background: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  outline: 'none'
                }}
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
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPin ? <MaterialIcon name="visibility_off" size={20} /> : <MaterialIcon name="visibility" size={20} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
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

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '13px',
              background: '#007AFF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0, 122, 255, 0.28)'
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Unlocking...' : `Sign In as ${selectedMember.name}`} <MaterialIcon name="arrow_forward" size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
