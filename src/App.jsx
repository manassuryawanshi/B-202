import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import TabBar from './components/TabBar';
import NotificationModal from './components/NotificationModal';
import NudgeModal from './components/NudgeModal';
import QrModal from './components/QrModal';
import InstallPrompt from './components/InstallPrompt';
import LoginScreen from './components/LoginScreen';
import ProfileModal from './components/ProfileModal';

import DashboardView from './views/DashboardView';
import ChoresView from './views/ChoresView';
import BillsView from './views/BillsView';
import CalendarView from './views/CalendarView';
import DirectoryView from './views/DirectoryView';
import MessagesView from './views/MessagesView';

import {
  loadStoredData,
  saveToStorage,
  STORAGE_KEYS,
  sendBrowserNotification,
  playHapticChime
} from './data/storage';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

export default function App() {
  const [data, setData] = useState(() => loadStoredData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prevTab, setPrevTab] = useState('dashboard');

  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      setPrevTab(activeTab);
      setActiveTab(newTab);
    }
  };

  // Per-User Theme State (Light / Dark - each flatmate has independent preference)
  const [theme, setTheme] = useState('light');

  // Authentication State - If no active session, render dedicated LoginScreen
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedSession = localStorage.getItem('b202_active_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        const member = data.members?.find((m) => m.id === parsed.userId);
        if (member) return member;
      }
    } catch {}
    return null;
  });

  // Load and apply theme specific to active currentUser
  useEffect(() => {
    if (currentUser?.id) {
      try {
        const userTheme = localStorage.getItem(`b202_theme_${currentUser.id}`) || currentUser.theme || 'light';
        setTheme(userTheme);
        document.documentElement.setAttribute('data-theme', userTheme);
      } catch {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [currentUser?.id]);

  const handleToggleTheme = async (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (currentUser?.id) {
      try {
        localStorage.setItem(`b202_theme_${currentUser.id}`, newTheme);
        await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, theme: newTheme })
        });
      } catch {}
    }
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [qrRecipient, setQrRecipient] = useState(null);
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Sync state to Supabase Cloud if configured
  const syncToSupabase = useCallback(async (updatedData) => {
    if (isSupabaseConfigured && supabase && updatedData) {
      try {
        await supabase
          .from('flat_state')
          .upsert({ id: 'b202', data: updatedData, updated_at: new Date().toISOString() });
      } catch (err) {
        console.error('Supabase sync error:', err);
      }
    }
  }, []);

  // Universal state updater that syncs to Supabase Cloud immediately
  const updateDataAndSync = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncToSupabase(next);
      return next;
    });
  }, [syncToSupabase]);

  // Merge incoming cloud data with local state to prevent message/bill loss
  const mergeIncomingData = useCallback((incoming, prev) => {
    if (!incoming) return prev;

    // Merge messages by ID (union of both)
    const messageMap = new Map();
    (incoming.messages || []).forEach((m) => messageMap.set(m.id, m));
    (prev.messages || []).forEach((m) => {
      if (!messageMap.has(m.id)) {
        messageMap.set(m.id, m);
      }
    });
    const mergedMessages = Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Merge bills by ID — prefer local version if newer (prevents newly added bills being wiped)
    const billMap = new Map();
    (incoming.bills || []).forEach((b) => billMap.set(b.id, b));
    (prev.bills || []).forEach((b) => {
      if (!billMap.has(b.id)) {
        billMap.set(b.id, b); // preserve locally added bills not yet in cloud
      }
    });
    const mergedBills = Array.from(billMap.values());

    return {
      ...incoming,
      messages: mergedMessages,
      bills: mergedBills
    };
  }, []);

  // Fetch latest database state from server or Supabase Cloud
  const fetchServerData = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: row, error } = await supabase
          .from('flat_state')
          .select('data')
          .eq('id', 'b202')
          .single();

        if (row && row.data) {
          setData((prev) => mergeIncomingData(row.data, prev));
          if (currentUser) {
            const freshUser = row.data.members?.find((m) => m.id === currentUser.id);
            if (freshUser) setCurrentUser(freshUser);
          }
          return;
        } else if (error && error.code === 'PGRST116') {
          // Initialize row if not existing
          await supabase.from('flat_state').insert({ id: 'b202', data: data });
        }
      } catch (err) {
        console.warn('Supabase fetch fallback:', err);
      }
    }

    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const serverDb = await res.json();
        setData((prev) => mergeIncomingData(serverDb, prev));

        if (currentUser) {
          const freshUser = serverDb.members?.find((m) => m.id === currentUser.id);
          if (freshUser) setCurrentUser(freshUser);
        }
      }
    } catch {}
  }, [currentUser?.id, mergeIncomingData]);

  useEffect(() => {
    fetchServerData();

    // Setup Supabase Realtime Subscription
    let channel = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('b202-realtime-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'flat_state', filter: 'id=eq.b202' },
          (payload) => {
            if (payload?.new?.data) {
              setData((prev) => mergeIncomingData(payload.new.data, prev));
            }
          }
        )
        .subscribe();
    }

    // Refresh when user returns to app tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchServerData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) supabase?.removeChannel(channel);
    };
  }, [fetchServerData, mergeIncomingData]);

  // Persist local backup & Supabase cloud sync
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.AREAS, data.areas);
    saveToStorage(STORAGE_KEYS.CHORE_HISTORY, data.choreHistory);
    saveToStorage(STORAGE_KEYS.BILLS, data.bills);
    saveToStorage(STORAGE_KEYS.MESSAGES, data.messages);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
    syncToSupabase(data);
  }, [data, syncToSupabase]);

  // Login handler
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('b202_active_session', JSON.stringify({ userId: user.id }));
    playHapticChime('success');
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('b202_active_session');
    setCurrentUser(null);
    setIsProfileOpen(false);
    playHapticChime('click');
  };

  // Update Profile Details
  const handleUpdateProfile = async (updatedFields) => {
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.user) {
          setCurrentUser(result.user);
          setData((prev) => ({
            ...prev,
            members: result.members
          }));
          return result.user;
        }
      }
    } catch (err) {
      console.error(err);
    }

    // Local fallback
    const updatedUser = { ...currentUser, ...updatedFields };
    setCurrentUser(updatedUser);
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === updatedFields.userId ? { ...m, ...updatedFields } : m))
    }));
    return updatedUser;
  };

  // Mark Chore Cleaned
  const handleMarkChoreCleaned = async (areaId, memberId, notes = '') => {
    const area = data.areas.find((a) => a.id === areaId);
    if (!area) return;
    const order = area.rotationOrder || ['rohan', 'shubham', 'manas'];
    const currentIndex = order.indexOf(area.currentTurn);
    const nextTurnId = order[(currentIndex + 1) % order.length];
    const afterNextTurnId = order[(currentIndex + 2) % order.length];

    const newLog = {
      id: `chore-${Date.now()}`,
      areaId: area.id,
      areaName: area.name,
      cleanedBy: memberId,
      cleanedByName: currentUser?.name || memberId,
      date: new Date().toISOString(),
      notes: notes || 'Cleaning completed'
    };

    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'manas',
      senderName: currentUser?.name || 'Manas',
      category: 'chores',
      text: `${currentUser?.name} completed cleaning ${area.name}! Next turn is passed to ${nextTurnId}.`,
      timestamp: new Date().toISOString(),
      reactions: { sparkle: 1 }
    };

    updateDataAndSync((prev) => ({
      ...prev,
      areas: prev.areas.map((a) =>
        a.id === areaId
          ? { ...a, lastCleaned: new Date().toISOString(), currentTurn: nextTurnId, nextTurn: afterNextTurnId }
          : a
      ),
      choreHistory: [newLog, ...(prev.choreHistory || [])],
      messages: [...(prev.messages || []), newMsg]
    }));

    sendBrowserNotification('Chore Cleaned', {
      body: `${currentUser?.name} cleaned ${notes || 'the flat'}.`
    });

    try {
      await fetch('/api/chores/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId, userId: memberId, notes })
      });
    } catch {}
  };

  // Swap Chore Turn
  const handleSwapTurn = async (areaId, newMemberId) => {
    updateDataAndSync((prev) => ({
      ...prev,
      areas: prev.areas.map((a) => (a.id === areaId ? { ...a, currentTurn: newMemberId } : a))
    }));

    try {
      await fetch('/api/chores/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId, newUserId: newMemberId, initiatorName: currentUser?.name })
      });
    } catch {}
  };

  // Mark Bill Paid
  const handleMarkBillPaid = async (billId, memberId, amount) => {
    const bill = data.bills.find((b) => b.id === billId);
    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'manas',
      senderName: currentUser?.name || 'Manas',
      category: 'bills',
      text: `${currentUser?.name} paid ₹${amount} for ${bill?.title || 'Bill'}.`,
      timestamp: new Date().toISOString(),
      reactions: { paid: 1 }
    };

    updateDataAndSync((prev) => ({
      ...prev,
      bills: prev.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              payments: {
                ...b.payments,
                [memberId]: {
                  paid: true,
                  amount,
                  date: new Date().toISOString(),
                  utr: `UTR${Math.floor(100000 + Math.random() * 900000)}`
                }
              }
            }
          : b
      ),
      messages: [...(prev.messages || []), newMsg]
    }));

    sendBrowserNotification('Payment Recorded', {
      body: `${currentUser?.name} paid their share.`
    });

    try {
      await fetch('/api/bills/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, userId: memberId, amount })
      });
    } catch {}
  };

  // Add New Bill
  const handleAddNewBill = (newBill) => {
    updateDataAndSync((prev) => ({
      ...prev,
      bills: [newBill, ...(prev.bills || [])]
    }));
  };

  // Update Custom Electricity Shares
  const handleUpdateCustomShares = async (billId, shares) => {
    updateDataAndSync((prev) => ({
      ...prev,
      bills: prev.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              shares: { ...b.shares, ...shares },
              totalAmount: Object.values(shares).reduce((x, y) => x + (Number(y) || 0), 0)
            }
          : b
      )
    }));

    try {
      await fetch('/api/bills/custom-electricity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, shares, updaterName: currentUser?.name })
      });
    } catch {}
  };

  // Delete Bill (creator only)
  const handleDeleteBill = async (billId) => {
    updateDataAndSync((prev) => ({
      ...prev,
      bills: prev.bills.filter((b) => b.id !== billId)
    }));

    try {
      await fetch('/api/bills/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, userId: currentUser?.id })
      });
    } catch {}
    return true;
  };

  // Update Bill (creator only)
  const handleUpdateBill = async (payload) => {
    updateDataAndSync((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.id === payload.billId ? { ...b, ...payload } : b))
    }));

    try {
      await fetch('/api/bills/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: currentUser?.id })
      });
    } catch {}
    return true;
  };

  // Send Chat Message
  const handleSendMessage = async (msg) => {
    const msgObj = {
      id: `msg-${Date.now()}`,
      senderId: msg.senderId || currentUser?.id || 'manas',
      senderName: msg.senderName || currentUser?.name || 'Manas',
      category: msg.category || 'general',
      text: msg.text,
      timestamp: new Date().toISOString(),
      reactions: {},
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {})
    };

    updateDataAndSync((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), msgObj]
    }));

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgObj)
      });
    } catch {}
  };

  // React to Message with Custom Vector Tapback
  const handleReactMessage = async (msgId, reactionType) => {
    if (!currentUser) return;
    updateDataAndSync((prev) => ({
      ...prev,
      messages: (prev.messages || []).map((m) => {
        if (m.id === msgId) {
          const reactions = { ...(m.reactions || {}) };
          const userReactions = { ...(m.userReactions || {}) };
          const prevReact = userReactions[currentUser.id];

          if (prevReact === reactionType) {
            delete userReactions[currentUser.id];
            reactions[reactionType] = Math.max(0, (reactions[reactionType] || 1) - 1);
            if (reactions[reactionType] === 0) delete reactions[reactionType];
          } else {
            if (prevReact && reactions[prevReact]) {
              reactions[prevReact] = Math.max(0, reactions[prevReact] - 1);
              if (reactions[prevReact] === 0) delete reactions[prevReact];
            }
            userReactions[currentUser.id] = reactionType;
            reactions[reactionType] = (reactions[reactionType] || 0) + 1;
          }

          return {
            ...m,
            reactions,
            userReactions
          };
        }
        return m;
      })
    }));

    try {
      await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgId, reactionType, userId: currentUser.id })
      });
    } catch {}
  };

  // Send Interactive Poll
  const handleSendPoll = async (question, options) => {
    const pollMessage = {
      id: `poll-${Date.now()}`,
      senderId: currentUser?.id || 'manas',
      senderName: currentUser?.name || 'Manas',
      category: 'general',
      type: 'poll',
      text: `Poll: ${question}`,
      poll: {
        question,
        options: options.map((opt, idx) => ({
          id: `opt-${idx}-${Date.now()}`,
          text: opt,
          votes: []
        }))
      },
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    updateDataAndSync((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), pollMessage]
    }));

    try {
      await fetch('/api/messages/poll-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pollMessage)
      });
    } catch {}
  };

  // Vote on Interactive Poll
  const handleVotePoll = async (msgId, optionId) => {
    updateDataAndSync((prev) => ({
      ...prev,
      messages: (prev.messages || []).map((m) => {
        if (m.id === msgId && m.poll) {
          const updatedOptions = m.poll.options.map((opt) => {
            const filteredVotes = (opt.votes || []).filter((uid) => uid !== currentUser.id);
            if (opt.id === optionId) {
              return { ...opt, votes: [...filteredVotes, currentUser.id] };
            }
            return { ...opt, votes: filteredVotes };
          });
          return { ...m, poll: { ...m.poll, options: updatedOptions } };
        }
        return m;
      })
    }));

    try {
      await fetch('/api/messages/poll-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgId,
          optionId,
          userId: currentUser.id
        })
      });
    } catch {}
  };

  // Send Nudge Broadcast
  const handleSendNudge = async (payload) => {
    const nudgeMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'manas',
      senderName: currentUser?.name || 'Manas',
      category: payload.category || 'urgent',
      text: `📢 Reminder for ${payload.recipientName || 'everyone'}: ${payload.message}`,
      timestamp: new Date().toISOString(),
      reactions: { fire: 1 }
    };

    updateDataAndSync((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), nudgeMsg],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: `Nudge from ${currentUser?.name || 'Flatmate'}`,
          message: payload.message,
          timestamp: new Date().toISOString(),
          unread: true
        },
        ...(prev.notifications || [])
      ]
    }));

    try {
      await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {}
  };

  // Update Member UPI
  const handleUpdateMemberUpi = (memberId, newUpi) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === memberId ? { ...m, upiId: newUpi } : m))
    }));
  };

  const handleMarkAllNotificationsRead = async () => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, unread: false }))
    }));
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleClearNotifications = async () => {
    setData((prev) => ({ ...prev, notifications: [] }));
    try {
      await fetch('/api/notifications/clear', { method: 'POST' });
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== notificationId)
    }));
    try {
      await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, unread: false } : n
      )
    }));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  // If user is not authenticated, show full-screen Apple Login
  if (!currentUser) {
    return (
      <LoginScreen
        members={data.members}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const pendingChoresForMe = data.areas.filter(
    (a) => a.currentTurn === currentUser?.id
  ).length;

  const pendingBillsForMe = data.bills.filter(
    (b) => !b.payments?.[currentUser?.id]?.paid
  ).length;

  return (
    <div
      className="app-container"
      style={activeTab === 'messages' ? { paddingBottom: 0, height: '100dvh', overflow: 'hidden' } : {}}
    >
      {/* Top Navbar (Hidden when inside Chat) */}
      {activeTab !== 'messages' && (
        <Navbar
          currentUser={currentUser}
          notifications={data.notifications}
          onOpenNotifications={() => setIsNotifOpen(true)}
          onOpenNudgeModal={() => setIsNudgeOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      )}

      {/* PWA Home Screen Guidance */}
      {activeTab !== 'messages' && <InstallPrompt />}

      {/* Main Tab Screen */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: activeTab === 'messages' ? 'hidden' : 'visible' }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            members={data.members}
            areas={data.areas}
            bills={data.bills}
            choreHistory={data.choreHistory}
            messages={data.messages}
            onNavigateTab={(tab) => handleTabChange(tab)}
            onOpenNudgeModal={() => setIsNudgeOpen(true)}
            onOpenQrModal={(rec) => setQrRecipient(rec)}
            onMarkChoreCleaned={handleMarkChoreCleaned}
            onMarkBillPaid={handleMarkBillPaid}
          />
        )}

        {activeTab === 'chores' && (
          <ChoresView
            currentUser={currentUser}
            members={data.members}
            areas={data.areas}
            choreHistory={data.choreHistory}
            onMarkChoreCleaned={handleMarkChoreCleaned}
            onSwapTurn={handleSwapTurn}
          />
        )}

        {activeTab === 'bills' && (
          <BillsView
            currentUser={currentUser}
            members={data.members}
            bills={data.bills}
            owner={data.owner}
            onMarkBillPaid={handleMarkBillPaid}
            onOpenQrModal={(rec) => setQrRecipient(rec)}
            onOpenNudgeModal={() => setIsNudgeOpen(true)}
            onAddNewBill={handleAddNewBill}
            onUpdateCustomShares={handleUpdateCustomShares}
            onDeleteBill={handleDeleteBill}
            onUpdateBill={handleUpdateBill}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            bills={data.bills}
            choreHistory={data.choreHistory}
            members={data.members}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryView
            members={data.members}
            owner={data.owner}
            onOpenQrModal={(rec) => setQrRecipient(rec)}
            onUpdateMemberUpi={handleUpdateMemberUpi}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesView
            currentUser={currentUser}
            members={data.members}
            messages={data.messages}
            onSendMessage={handleSendMessage}
            onReactMessage={handleReactMessage}
            onSendPoll={handleSendPoll}
            onVotePoll={handleVotePoll}
            onBack={() => setActiveTab(prevTab !== 'messages' ? prevTab : 'dashboard')}
          />
        )}
      </main>

      {/* Apple Floating Island Tab Bar (Hidden in Chat Mode or when Typing) */}
      <TabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setIsChatTyping(false);
          handleTabChange(tab);
        }}
        pendingChoresCount={pendingChoresForMe}
        pendingBillsCount={pendingBillsForMe}
        unreadMessagesCount={0}
        hidden={activeTab === 'messages' || isChatTyping}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />

      {/* Notification Center */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={data.notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onClearNotifications={handleClearNotifications}
        onDeleteNotification={handleDeleteNotification}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Broadcast Reminder Modal */}
      <NudgeModal
        isOpen={isNudgeOpen}
        onClose={() => setIsNudgeOpen(false)}
        members={data.members}
        currentUser={currentUser}
        onSendNudge={handleSendNudge}
      />

      {/* Dynamic Payment QR Modal */}
      <QrModal
        isOpen={!!qrRecipient}
        onClose={() => setQrRecipient(null)}
        recipient={qrRecipient}
      />
    </div>
  );
}
