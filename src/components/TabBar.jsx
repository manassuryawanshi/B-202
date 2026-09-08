import React from 'react';
import { playHapticChime } from '../data/storage';
import MaterialIcon from './MaterialIcon';

// Official Google Material Icons for Navigation
const TabIcons = {
  dashboard: ({ active }) => (
    <MaterialIcon name="home" size={22} filled={active} color="currentColor" />
  ),
  chores: ({ active }) => (
    <MaterialIcon name="cleaning_services" size={22} filled={active} color="currentColor" />
  ),
  bills: ({ active }) => (
    <MaterialIcon name="currency_rupee" size={22} filled={active} color="currentColor" />
  ),
  calendar: ({ active }) => (
    <MaterialIcon name="calendar_month" size={22} filled={active} color="currentColor" />
  ),
  directory: ({ active }) => (
    <MaterialIcon name="group" size={22} filled={active} color="currentColor" />
  ),
  messages: ({ active }) => (
    <MaterialIcon name="chat_bubble" size={22} filled={active} color="currentColor" />
  )
};

export default function TabBar({ activeTab, onTabChange, unreadMessages = 0, pendingBills = 0 }) {
  const tabs = [
    { id: 'dashboard', label: 'Home' },
    { id: 'chores', label: 'Chores' },
    { id: 'bills', label: 'Bills', badge: pendingBills },
    { id: 'calendar', label: 'Calendar' },
    { id: 'directory', label: 'Directory' },
    { id: 'messages', label: 'Chat', badge: unreadMessages }
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 6px) + 6px)',
        paddingTop: '4px'
      }}
    >
      {/* Apple Floating Pill Nav Container */}
      <div
        style={{
          pointerEvents: 'auto',
          maxWidth: '500px',
          width: 'calc(100% - 24px)',
          background: 'var(--ios-nav-bg, rgba(255, 255, 255, 0.92))',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderRadius: '32px',
          padding: '4px 6px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--ios-tabbar-border, rgba(0, 0, 0, 0.08))'
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = TabIcons[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              id={`nav-tab-${tab.id}`}
              onClick={() => {
                playHapticChime('tab');
                onTabChange(tab.id);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                minWidth: 0,
                padding: '5px 2px 4px 2px',
                border: 'none',
                background: isActive ? 'var(--ios-active-pill-bg, #EBF3FF)' : 'transparent',
                borderRadius: '22px',
                cursor: 'pointer',
                position: 'relative',
                color: isActive ? 'var(--ios-blue, #007AFF)' : 'var(--ios-text-tertiary, #9CA3AF)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {/* Badge */}
              {Boolean(tab.badge && tab.badge > 0) && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: 'calc(50% - 15px)',
                    background: 'var(--ios-red, #FF3B30)',
                    color: '#FFFFFF',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    minWidth: '15px',
                    height: '15px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 2px 4px rgba(255, 59, 48, 0.3)',
                    zIndex: 2
                  }}
                >
                  {tab.badge}
                </span>
              )}

              {/* Google Material Icon */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.2s ease'
                }}
              >
                {IconComp && <IconComp active={isActive} />}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 700 : 500,
                  marginTop: '1px',
                  lineHeight: 1.1,
                  letterSpacing: '-0.1px',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
