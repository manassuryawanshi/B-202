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
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--ios-nav-bg, rgba(255, 255, 255, 0.94))',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        borderTop: '0.5px solid var(--ios-tabbar-border, rgba(0, 0, 0, 0.12))',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
      }}
    >
      {/* Apple Tab Bar Container */}
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          padding: '6px 8px calc(env(safe-area-inset-bottom, 16px) + 2px) 8px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
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
                padding: '4px 2px 2px 2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                position: 'relative',
                color: isActive ? 'var(--ios-blue, #007AFF)' : 'var(--ios-text-tertiary, #8E8E93)',
                transition: 'all 0.15s ease',
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
