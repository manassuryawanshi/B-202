import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Unique session ID to identify writes from this client tab (prevents echo / infinite loops)
  const clientSessionId = useMemo(
    () => 'client-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
    []
  );

  // Per-User Theme State (Light / Dark - each flatmate has independent preference)
  const [theme, setTheme] = useState('light');

  // Authentication State - If no active session, render dedicated LoginScreen
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedSession = localStorage.getItem('b202_active_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        const storedMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS)) || [];
        const member =
          storedMembers.find((m) => m.id === parsed.userId) ||
          data.members?.find((m) => m.id === parsed.userId);
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
          body: JSON.stringify({ userId: currentUser.id, theme: newTheme, updatedAt: Date.now() })
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
        const payloadToSave = {
          ...updatedData,
          _clientSessionId: clientSessionId,
          _updatedAt: Date.now()
        };
        const { error } = await supabase
          .from('flat_state')
          .upsert({
            id: 'b202',
            data: payloadToSave,
            updated_at: new Date().toISOString()
          });
        if (error) {
          console.error('Supabase sync error:', error);
        }
      } catch (err) {
        console.error('Supabase sync error:', err);
      }
    }
  }, [clientSessionId]);

  // Universal state updater that syncs to Supabase Cloud immediately
  const updateDataAndSync = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncToSupabase(next);
      return next;
    });
  }, [syncToSupabase]);

  // Merge incoming cloud data with local state to prevent message/bill loss or state oscillations
  const mergeIncomingData = useCallback((incoming, prev) => {
    if (!incoming) return prev;

    // 1. Deleted bill IDs union (permanently prevents deleted bills from returning)
    const deletedIds = new Set([
      ...(prev.deletedBillIds || []),
      ...(incoming.deletedBillIds || [])
    ]);

    // 2. Merge members with avatar and timestamp preservation
    const memberMap = new Map();
    (prev.members || []).forEach((m) => memberMap.set(m.id, m));
    (incoming.members || []).forEach((inMember) => {
      if (memberMap.has(inMember.id)) {
        const localMember = memberMap.get(inMember.id);
        const localTime = localMember.updatedAt || 0;
        const inTime = inMember.updatedAt || 0;

        let chosen;
        if (inTime > localTime) {
          chosen = { ...localMember, ...inMember };
        } else if (localTime > inTime) {
          chosen = { ...inMember, ...localMember };
        } else {
          // Equal timestamps or neither has updatedAt
          const avatar = localMember.customAvatar || inMember.customAvatar || '';
          chosen = { ...inMember, ...localMember, customAvatar: avatar };
        }
        // Always ensure customAvatar is preserved if either side had it
        if (!chosen.customAvatar && (localMember.customAvatar || inMember.customAvatar)) {
          chosen.customAvatar = localMember.customAvatar || inMember.customAvatar;
        }
        memberMap.set(inMember.id, chosen);
      } else {
        memberMap.set(inMember.id, inMember);
      }
    });
    const mergedMembers = Array.from(memberMap.values());

    // 3. Merge messages by ID (union of both, deduplicated & ordered by time)
    const messageMap = new Map();
    (prev.messages || []).forEach((m) => messageMap.set(m.id, m));
    (incoming.messages || []).forEach((inMsg) => {
      if (messageMap.has(inMsg.id)) {
        const localMsg = messageMap.get(inMsg.id);
        const localTime = localMsg.updatedAt || 0;
        const inTime = inMsg.updatedAt || 0;
        messageMap.set(inMsg.id, localTime >= inTime ? localMsg : inMsg);
      } else {
        messageMap.set(inMsg.id, inMsg);
      }
    });
    const mergedMessages = Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // 4. Merge bills with conflict resolution
    // - Deleted bills are NEVER revived
    // - Payments: If ANY version has paid: true, it STAYS paid
    // - Metadata: Latest updatedAt wins
    const billMap = new Map();
    const prevBills = (prev.bills || []).filter((b) => !deletedIds.has(b.id));
    const incomingBills = (incoming.bills || []).filter((b) => !deletedIds.has(b.id));

    // Seed with local bills first
    prevBills.forEach((b) => billMap.set(b.id, b));

    // Merge in incoming bills
    incomingBills.forEach((inBill) => {
      if (!billMap.has(inBill.id)) {
        billMap.set(inBill.id, inBill);
      } else {
        const localBill = billMap.get(inBill.id);

        // Union of payments: if either local or incoming has paid: true, member STAYS PAID!
        const mergedPayments = { ...(inBill.payments || {}), ...(localBill.payments || {}) };
        const allMemberIds = Array.from(
          new Set([...Object.keys(inBill.payments || {}), ...Object.keys(localBill.payments || {})])
        );

        allMemberIds.forEach((mId) => {
          const inPay = inBill.payments?.[mId];
          const locPay = localBill.payments?.[mId];
          if (locPay?.paid) {
            mergedPayments[mId] = locPay;
          } else if (inPay?.paid) {
            mergedPayments[mId] = inPay;
          } else {
            mergedPayments[mId] = locPay || inPay;
          }
        });

        // Determine which metadata to prefer (local vs incoming)
        const localTime = localBill.updatedAt || 0;
        const inTime = inBill.updatedAt || 0;
        const baseBill = localTime >= inTime ? localBill : inBill;

        billMap.set(inBill.id, {
          ...inBill,
          ...baseBill,
          payments: mergedPayments,
          shares: baseBill.shares || inBill.shares || localBill.shares
        });
      }
    });

    // 5. Deduplicate recurring bills by (type, monthYear)
    // There can only ever be one 'rent', 'washing-machine', or 'electricity' bill per month.
    const recurringTypes = new Set(['rent', 'washing-machine', 'electricity']);
    const finalBillsMap = new Map();
    const recurringSeen = new Map(); // `${type}_${monthKey}` -> canonicalId

    Array.from(billMap.values()).forEach((b) => {
      const monthKey = (b.monthYear || '').trim().toLowerCase();
      if (recurringTypes.has(b.type) && monthKey) {
        const dedupeKey = `${b.type}_${monthKey}`;
        if (!recurringSeen.has(dedupeKey)) {
          recurringSeen.set(dedupeKey, b.id);
          finalBillsMap.set(b.id, {
            ...b,
            ...(b.type === 'washing-machine' ? {
              recipientName: 'Manas (Washing Machine Coordinator)',
              recipientUpi: '8010616851@ybl'
            } : {})
          });
        } else {
          // Merge into canonical bill
          const canonicalId = recurringSeen.get(dedupeKey);
          const canonicalBill = finalBillsMap.get(canonicalId);

          const mergedPayments = { ...(canonicalBill.payments || {}) };
          Object.keys(b.payments || {}).forEach((mId) => {
            const canonicalPay = canonicalBill.payments?.[mId];
            const duplicatePay = b.payments?.[mId];
            if (duplicatePay?.paid && !canonicalPay?.paid) {
              mergedPayments[mId] = duplicatePay;
            }
          });

          // Mark duplicate ID permanently deleted
          deletedIds.add(b.id);

          finalBillsMap.set(canonicalId, {
            ...canonicalBill,
            payments: mergedPayments,
            ...(b.type === 'washing-machine' ? {
              recipientName: 'Manas (Washing Machine Coordinator)',
              recipientUpi: '8010616851@ybl'
            } : {})
          });
        }
      } else {
        finalBillsMap.set(b.id, b);
      }
    });

    const mergedBills = Array.from(finalBillsMap.values());

    // Check if new notifications arrived from other flatmates to trigger native push alert on Android/iOS
    if (incoming.notifications && prev.notifications) {
      const prevIds = new Set((prev.notifications || []).map((n) => n.id));
      const brandNew = incoming.notifications.filter((n) => !prevIds.has(n.id) && n.unread);
      if (brandNew.length > 0) {
        brandNew.forEach((n) => {
          sendBrowserNotification(n.title, { body: n.body || n.message });
        });
      }
    }

    return {
      ...prev,
      ...incoming,
      members: mergedMembers,
      messages: mergedMessages,
      bills: mergedBills,
      deletedBillIds: Array.from(deletedIds)
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
          const incomingData = row.data;
          // If the cloud row is what this client just wrote, skip merging to prevent echo
          if (incomingData._clientSessionId !== clientSessionId) {
            setData((prev) => mergeIncomingData(incomingData, prev));
          }
          if (currentUser) {
            const freshUser = incomingData.members?.find((m) => m.id === currentUser.id);
            if (freshUser) {
              setCurrentUser((prevUser) => {
                if (!prevUser) return freshUser;
                if (prevUser.customAvatar && !freshUser.customAvatar) {
                  return { ...freshUser, customAvatar: prevUser.customAvatar };
                }
                return freshUser;
              });
            }
          }
          return;
        } else if (error && error.code === 'PGRST116') {
          // Initialize row if not existing
          await supabase.from('flat_state').insert({
            id: 'b202',
            data: { ...data, _clientSessionId: clientSessionId, _updatedAt: Date.now() }
          });
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
          if (freshUser) {
            setCurrentUser((prevUser) => {
              if (!prevUser) return freshUser;
              if (prevUser.customAvatar && !freshUser.customAvatar) {
                return { ...freshUser, customAvatar: prevUser.customAvatar };
              }
              return freshUser;
            });
          }
        }
      }
    } catch {}
  }, [clientSessionId, currentUser?.id, mergeIncomingData]);

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
            const incomingData = payload?.new?.data;
            if (!incomingData) return;
            // Ignore events triggered by THIS client tab to break infinite loops & state oscillation
            if (incomingData._clientSessionId === clientSessionId) {
              return;
            }
            setData((prev) => mergeIncomingData(incomingData, prev));
            if (currentUser) {
              const freshUser = incomingData.members?.find((m) => m.id === currentUser.id);
              if (freshUser) {
                setCurrentUser((prevUser) => {
                  if (!prevUser) return freshUser;
                  if (prevUser.customAvatar && !freshUser.customAvatar) {
                    return { ...freshUser, customAvatar: prevUser.customAvatar };
                  }
                  return freshUser;
                });
              }
            }
          }
        )
        .subscribe();
    }

    // Automatic periodic polling every 4 seconds (vital for real-time multi-device sync & broadcast alerts)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchServerData();
      }
    }, 4000);

    // Refresh when user returns to app tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchServerData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) supabase?.removeChannel(channel);
    };
  }, [clientSessionId, fetchServerData, mergeIncomingData]);

  // Persist local backup to localStorage (including members!)
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.AREAS, data.areas);
    saveToStorage(STORAGE_KEYS.CHORE_HISTORY, data.choreHistory);
    saveToStorage(STORAGE_KEYS.BILLS, data.bills);
    saveToStorage(STORAGE_KEYS.MESSAGES, data.messages);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
    saveToStorage(STORAGE_KEYS.MEMBERS, data.members);
  }, [data]);

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
    const now = Date.now();
    const fieldsWithTime = { ...updatedFields, updatedAt: now };

    // Update currentUser immediately
    setCurrentUser((prev) => ({ ...(prev || {}), ...fieldsWithTime }));

    // Update local state and sync to Supabase Cloud
    updateDataAndSync((prev) => ({
      ...prev,
      members: (prev.members || []).map((m) =>
        m.id === updatedFields.userId ? { ...m, ...fieldsWithTime } : m
      )
    }));

    // Also persist to localStorage immediately
    try {
      const currentStored = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS) || '[]');
      const updatedStored = (currentStored || []).map((m) =>
        m.id === updatedFields.userId ? { ...m, ...fieldsWithTime } : m
      );
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(updatedStored));
    } catch {}

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldsWithTime)
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.user) {
          setCurrentUser(result.user);
          updateDataAndSync((prev) => ({
            ...prev,
            members: result.members
          }));
          return result.user;
        }
      }
    } catch (err) {
      console.error('Profile update API error:', err);
    }

    return { ...currentUser, ...fieldsWithTime };
  };

  // Update Member UPI ID
  const handleUpdateMemberUpi = async (memberId, upiId) => {
    updateDataAndSync((prev) => ({
      ...prev,
      members: (prev.members || []).map((m) =>
        m.id === memberId ? { ...m, upiId } : m
      )
    }));

    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId, upiId })
      });
    } catch (err) {
      console.error('Update member UPI API error:', err);
    }
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
      bills: (prev.bills || []).map((b) =>
        b.id === billId
          ? {
              ...b,
              updatedAt: Date.now(),
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
    const billWithMeta = {
      ...newBill,
      updatedAt: Date.now()
    };
    updateDataAndSync((prev) => ({
      ...prev,
      bills: [billWithMeta, ...(prev.bills || []).filter((b) => b.id !== newBill.id)]
    }));
  };

  // Update Custom Electricity Shares
  const handleUpdateCustomShares = async (billId, shares) => {
    updateDataAndSync((prev) => ({
      ...prev,
      bills: (prev.bills || []).map((b) =>
        b.id === billId
          ? {
              ...b,
              shares: { ...b.shares, ...shares },
              totalAmount: Object.values(shares).reduce((x, y) => x + (Number(y) || 0), 0),
              updatedAt: Date.now()
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

  // Delete Bill (creator or admin)
  const handleDeleteBill = async (billId) => {
    updateDataAndSync((prev) => ({
      ...prev,
      bills: (prev.bills || []).filter((b) => b.id !== billId),
      deletedBillIds: Array.from(new Set([...(prev.deletedBillIds || []), billId]))
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

  // Update Bill (creator or admin)
  const handleUpdateBill = async (payload) => {
    updateDataAndSync((prev) => ({
      ...prev,
      bills: (prev.bills || []).map((b) => {
        if (b.id !== payload.billId) return b;

        const newTotal = parseFloat(payload.totalAmount) || b.totalAmount;
        let newShares = { ...b.shares };

        // Recalculate equal shares if not custom split
        if (!b.isCustomSplit && newTotal !== b.totalAmount) {
          const each = Math.round(newTotal / (prev.members?.length || 5));
          Object.keys(newShares).forEach((k) => {
            newShares[k] = each;
          });
        } else if (payload.shares) {
          newShares = { ...payload.shares };
        }

        const newPayments = { ...b.payments };
        Object.keys(newPayments).forEach((mId) => {
          if (!newPayments[mId]?.paid) {
            newPayments[mId] = {
              ...newPayments[mId],
              amount: newShares[mId] || Math.round(newTotal / (prev.members?.length || 5))
            };
          }
        });

        return {
          ...b,
          title: payload.title !== undefined ? payload.title : b.title,
          totalAmount: newTotal,
          dueDate: payload.dueDate || b.dueDate,
          remarks: payload.remarks !== undefined ? payload.remarks : b.remarks,
          shares: newShares,
          payments: newPayments,
          updatedAt: Date.now()
        };
      })
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
            userReactions,
            updatedAt: Date.now()
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
      updatedAt: Date.now(),
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

  // Vote on Interactive Poll (Toggle vote on/off with latest timestamp)
  const handleVotePoll = async (msgId, optionId) => {
    if (!currentUser) return;
    const now = Date.now();

    updateDataAndSync((prev) => ({
      ...prev,
      messages: (prev.messages || []).map((m) => {
        if (m.id === msgId && m.poll) {
          const targetOpt = m.poll.options.find((opt) => opt.id === optionId);
          const wasAlreadyVoted = (targetOpt?.votes || []).includes(currentUser.id);

          const updatedOptions = m.poll.options.map((opt) => {
            const filteredVotes = (opt.votes || []).filter((uid) => uid !== currentUser.id);
            if (opt.id === optionId && !wasAlreadyVoted) {
              return { ...opt, votes: [...filteredVotes, currentUser.id] };
            }
            return { ...opt, votes: filteredVotes };
          });
          return { ...m, updatedAt: now, poll: { ...m.poll, options: updatedOptions } };
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
    const textContent = payload.text || payload.message || '';
    const recipient = payload.recipientName || 'everyone';
    const nudgeMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'manas',
      senderName: currentUser?.name || 'Manas',
      category: payload.category || 'urgent',
      text: `📢 Announcement for ${recipient}: ${textContent}`,
      timestamp: new Date().toISOString(),
      reactions: { fire: 1 },
      isBroadcast: true
    };

    const newNotif = {
      id: `notif-${Date.now()}`,
      title: payload.recipientName && payload.recipientName !== 'All Flatmates'
        ? `Nudge to ${payload.recipientName}`
        : `📢 Broadcast from ${currentUser?.name || 'Flatmate'}`,
      body: textContent,
      message: textContent,
      time: 'Just now',
      type: 'broadcast',
      timestamp: new Date().toISOString(),
      unread: true
    };

    updateDataAndSync((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), nudgeMsg],
      notifications: [
        newNotif,
        ...(prev.notifications || [])
      ]
    }));

    try {
      await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          text: textContent
        })
      });
    } catch {}
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
            notifications={data.notifications}
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
        currentUser={currentUser}
        onMarkBillPaid={handleMarkBillPaid}
        onUpdateMemberUpi={handleUpdateMemberUpi}
      />
    </div>
  );
}
