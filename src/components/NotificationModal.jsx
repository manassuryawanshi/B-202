import React, { useState } from 'react';
import { sendBrowserNotification, playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function NotificationModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearNotifications,
  onDeleteNotification,
  onMarkNotificationRead
}) {
  if (!isOpen) return null;

  const [permissionStatus, setPermissionStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support web notifications.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
      if (perm === 'granted') {
        playHapticChime('success');
        sendBrowserNotification('B-202 Skyra Notifications Active', {
          body: 'You will receive timely reminders for bills & chore turns.'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestNotification = () => {
    playHapticChime('nudge');
    const sent = sendBrowserNotification('B-202 Skyra Reminder', {
      body: 'Testing flat notifications on your device.'
    });
    if (!sent && permissionStatus !== 'granted') {
      requestPermission();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab-bar" />

        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MaterialIcon name="notifications" size={22} color="var(--ios-blue)" />
            <h2 className="sheet-title">Reminders & Alerts</h2>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        {/* Web Push Prompt Inset */}
        <div
          className="ios-inset-box"
          style={{
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
              Phone & Web Notifications
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
              {permissionStatus === 'granted'
                ? 'Active • Lock screen notifications enabled'
                : 'Enable notifications to never miss bills or turns'}
            </div>
          </div>

          {permissionStatus === 'granted' ? (
            <button
              type="button"
              className="ios-btn ios-btn-secondary ios-btn-sm"
              onClick={handleTestNotification}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <MaterialIcon name="notifications_active" size={15} /> Test
            </button>
          ) : (
            <button
              type="button"
              className="ios-btn ios-btn-primary ios-btn-sm"
              onClick={requestPermission}
            >
              Enable
            </button>
          )}
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--ios-text-tertiary)', fontWeight: 600 }}>
            {notifications.length} alerts received
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                playHapticChime('click');
                onMarkAllRead();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ios-blue)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <MaterialIcon name="check" size={14} /> Mark all read
            </button>
            <button
              type="button"
              onClick={() => {
                playHapticChime('click');
                onClearNotifications();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ios-red)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <MaterialIcon name="delete" size={14} /> Clear
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--ios-text-tertiary)' }}>
              <MaterialIcon name="notifications" size={32} style={{ opacity: 0.3, marginBottom: '6px' }} />
              <div>No notifications. All caught up.</div>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.unread && onMarkNotificationRead) {
                    playHapticChime('click');
                    onMarkNotificationRead(n.id);
                  }
                }}
                style={{
                  background: n.unread ? 'var(--ios-blue-light)' : '#FFFFFF',
                  border: n.unread ? '1px solid #C9DCFF' : '1px solid var(--ios-card-border-soft)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  cursor: n.unread ? 'pointer' : 'default',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: n.type === 'bill' ? 'var(--ios-orange-light)' : 'var(--ios-blue-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {n.type === 'bill' ? (
                    <MaterialIcon name="currency_rupee" size={17} color="var(--ios-orange)" />
                  ) : (
                    <MaterialIcon name="cleaning_services" size={17} color="var(--ios-blue)" />
                  )}
                </div>

                <div style={{ flex: 1, paddingRight: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: n.unread ? 800 : 600, color: 'var(--ios-text-primary)' }}>
                      {n.title}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--ios-text-tertiary)' }}>{n.time}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    {n.body}
                  </div>
                </div>

                {/* Individual Delete Button */}
                <button
                  type="button"
                  title="Delete notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    playHapticChime('pop');
                    if (onDeleteNotification) onDeleteNotification(n.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--ios-text-tertiary)',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ios-red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ios-text-tertiary)')}
                >
                  <MaterialIcon name="delete" size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
