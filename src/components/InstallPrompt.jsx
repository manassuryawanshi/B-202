import React, { useState, useEffect } from 'react';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    const dismissed = localStorage.getItem('b202_install_dismissed');

    if (!isStandalone && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    playHapticChime('click');
    localStorage.setItem('b202_install_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      style={{
        margin: '10px 16px 0 16px',
        background: '#FFFFFF',
        border: '1px solid #C9DCFF',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-flat)',
        position: 'relative'
      }}
    >
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#F3F4F6',
          border: 'none',
          borderRadius: '50%',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ios-text-secondary)',
          cursor: 'pointer'
        }}
      >
        <MaterialIcon name="close" size={13} />
      </button>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--ios-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}
        >
          <MaterialIcon name="smartphone" size={20} />
        </div>

        <div style={{ flex: 1, paddingRight: '14px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
            Install B-202 App on Phone
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
            Instant lock-screen reminders and notifications:
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginTop: '8px',
              fontSize: '11.5px',
              color: 'var(--ios-text-primary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-pill info" style={{ padding: '1px 5px', fontSize: '10px' }}>iOS Safari</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                Tap <strong>Share <MaterialIcon name="ios_share" size={13} style={{ display: 'inline' }} /></strong>, then <strong>Add to Home Screen <MaterialIcon name="add_box" size={13} style={{ display: 'inline' }} /></strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-pill neutral" style={{ padding: '1px 5px', fontSize: '10px' }}>Android</span>
              <span>Tap menu and choose <strong>Install App</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
