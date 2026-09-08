import React from 'react';
import FlatmateAvatar from './Avatars';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function Navbar({
  currentUser,
  notifications,
  onOpenNotifications,
  onOpenNudgeModal,
  onOpenProfile
}) {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="ios-navbar">
      {/* Left Side: Profile Button */}
      <div className="nav-brand">
        <button
          className="nav-user-pill"
          onClick={() => {
            playHapticChime('pop');
            onOpenProfile();
          }}
          aria-label="Profile and Settings"
          id="user-profile-menu-btn"
          style={{
            padding: '3px 10px 3px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--ios-card)',
            border: '1px solid var(--ios-card-border)',
            borderRadius: '24px'
          }}
        >
          <FlatmateAvatar
            id={currentUser?.id}
            customAvatar={currentUser?.customAvatar}
            size={30}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ios-text-primary)', lineHeight: 1.2 }}>
              {currentUser?.name}
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
              {currentUser?.roomBadge || 'Flatmate'}
            </span>
          </div>
        </button>
      </div>

      {/* Right Side: Broadcast Nudge and Notification Bell */}
      <div className="nav-actions">
        {/* Quick Broadcast Nudge */}
        <button
          className="nav-icon-btn"
          onClick={() => {
            playHapticChime('nudge');
            onOpenNudgeModal();
          }}
          title="Send Broadcast Reminder"
          id="broadcast-nudge-btn"
        >
          <MaterialIcon name="campaign" size={19} color="var(--ios-orange)" />
        </button>

        {/* Notification Bell */}
        <button
          className="nav-icon-btn"
          onClick={() => {
            playHapticChime('click');
            onOpenNotifications();
          }}
          title="Notifications"
          id="notification-bell-btn"
        >
          <MaterialIcon name="notifications" size={20} color="var(--ios-text-primary)" />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>
      </div>
    </header>
  );
}
