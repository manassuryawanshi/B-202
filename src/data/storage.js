import {
  FLAT_INFO,
  FLATMATE_MEMBERS,
  OWNER_DETAILS,
  CLEANING_AREAS,
  INITIAL_CHORE_HISTORY,
  INITIAL_BILLS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS
} from './initialData';

const STORAGE_KEYS = {
  CURRENT_USER: 'b202_current_user_id',
  AREAS: 'b202_cleaning_areas',
  CHORE_HISTORY: 'b202_chore_history',
  BILLS: 'b202_monthly_bills',
  MESSAGES: 'b202_flat_messages',
  NOTIFICATIONS: 'b202_notifications',
  OWNER: 'b202_owner_details',
  MEMBERS: 'b202_members'
};

export const loadStoredData = () => {
  try {
    const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'manas';
    const areas = JSON.parse(localStorage.getItem(STORAGE_KEYS.AREAS)) || CLEANING_AREAS;
    const choreHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORE_HISTORY)) || INITIAL_CHORE_HISTORY;
    const rawBills = JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLS)) || INITIAL_BILLS;
    
    // Deduplicate recurring bills (rent, washing-machine, electricity) by (type, monthYear)
    const recurringTypes = new Set(['rent', 'washing-machine', 'electricity']);
    const billsMap = new Map();
    const recurringSeen = new Map();

    (rawBills || []).forEach((b) => {
      const monthKey = (b.monthYear || '').trim().toLowerCase();
      if (recurringTypes.has(b.type) && monthKey) {
        const key = `${b.type}_${monthKey}`;
        if (!recurringSeen.has(key)) {
          recurringSeen.set(key, b.id);
          billsMap.set(b.id, {
            ...b,
            ...(b.type === 'washing-machine' ? {
              recipientName: 'Manas (Washing Machine Coordinator)',
              recipientUpi: '8010616851@ybl'
            } : {})
          });
        } else {
          // Merge payments from duplicate into canonical bill
          const canonicalId = recurringSeen.get(key);
          const canonical = billsMap.get(canonicalId);
          const mergedPayments = { ...(canonical.payments || {}) };
          Object.keys(b.payments || {}).forEach((mId) => {
            if (b.payments?.[mId]?.paid && !canonical.payments?.[mId]?.paid) {
              mergedPayments[mId] = b.payments[mId];
            }
          });
          billsMap.set(canonicalId, {
            ...canonical,
            payments: mergedPayments,
            ...(b.type === 'washing-machine' ? {
              recipientName: 'Manas (Washing Machine Coordinator)',
              recipientUpi: '8010616851@ybl'
            } : {})
          });
        }
      } else {
        billsMap.set(b.id, b);
      }
    });
    const bills = Array.from(billsMap.values());
    saveToStorage(STORAGE_KEYS.BILLS, bills);

    const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES)) || INITIAL_MESSAGES;
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) || INITIAL_NOTIFICATIONS;
    const owner = JSON.parse(localStorage.getItem(STORAGE_KEYS.OWNER)) || OWNER_DETAILS;
    const members = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS)) || FLATMATE_MEMBERS;

    return {
      currentUserId,
      areas,
      choreHistory,
      bills,
      messages,
      notifications,
      owner,
      members
    };
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return {
      currentUserId: 'manas',
      areas: CLEANING_AREAS,
      choreHistory: INITIAL_CHORE_HISTORY,
      bills: INITIAL_BILLS,
      messages: INITIAL_MESSAGES,
      notifications: INITIAL_NOTIFICATIONS,
      owner: OWNER_DETAILS,
      members: FLATMATE_MEMBERS
    };
  }
};

export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
};

export { STORAGE_KEYS };

// Organic, fidgety, pleasing Web Audio synthesizer for tactile Apple-like feedback
let sharedAudioCtx = null;
const getAudioContext = () => {
  if (!sharedAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      sharedAudioCtx = new AudioContext();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
};

export const playHapticChime = (type = 'click') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'tab') {
      // Silky marble tap / fidgety tactile drop (very short, warm, non-intrusive)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'pop') {
      // Fidgety bubble pop (satisfying upward sweep)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.032);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.038);
    } else if (type === 'reaction') {
      // Fidgety double-tick micro-tap
      const playTick = (delay, freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.06, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.025);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.026);
      };
      playTick(0, 680);
      playTick(0.035, 920);
    } else if (type === 'success') {
      // Gentle major chord bell resonance (Apple Pay-style warm acoustic chime)
      const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, now);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        const startTime = now + idx * 0.04;
        gain.gain.setValueAtTime(0.09, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } else if (type === 'nudge') {
      // Soft modern dual-tone notification ping
      const playTone = (freq, startTime, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + dur);
      };
      playTone(523.25, now, 0.12); // C5
      playTone(783.99, now + 0.06, 0.22); // G5
    } else {
      // Default subtle tactile micro-click (like a mechanical switch)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.022);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.026);
    }
  } catch {
    // Gracefully ignore audio failures
  }
};

// Request and trigger native Web Push / Browser Notification (Supports Android PWA & Desktop)
export const sendBrowserNotification = async (title, options = {}) => {
  if (!('Notification' in window)) {
    return false;
  }

  const defaultOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    ...options
  };

  if (Notification.permission === 'granted') {
    // 1. ServiceWorker showNotification - Mandatory for Android PWA & Chrome on mobile
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, defaultOptions);
          return true;
        }
      } catch (err) {
        console.warn('SW showNotification fallback:', err);
      }
    }

    // 2. Desktop fallback (Safari, desktop browsers)
    try {
      new Notification(title, defaultOptions);
      return true;
    } catch (err) {
      console.warn('new Notification failed:', err);
      return false;
    }
  } else if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return sendBrowserNotification(title, options);
      }
    } catch {}
  }
  return false;
};

// --- Personalized Notification Management & Deduplication ---

const DELIVERED_NOTIFS_KEY = 'b202_delivered_notification_ids';
const DELETED_NOTIFS_KEY_PREFIX = 'b202_deleted_notifs_';
const DISMISSED_BROADCASTS_KEY_PREFIX = 'b202_dismissed_broadcasts_';

export const getDeliveredNotificationIds = () => {
  try {
    const raw = localStorage.getItem(DELIVERED_NOTIFS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const markNotificationDelivered = (id) => {
  if (!id) return;
  try {
    const ids = getDeliveredNotificationIds();
    ids.add(id);
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(DELIVERED_NOTIFS_KEY, JSON.stringify(arr));
  } catch {}
};

export const getStoredDeletedNotifs = (userId) => {
  try {
    const key = userId ? `${DELETED_NOTIFS_KEY_PREFIX}${userId}` : 'b202_deleted_notifs_global';
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const saveStoredDeletedNotif = (userId, notifId) => {
  if (!notifId) return;
  try {
    const ids = getStoredDeletedNotifs(userId);
    ids.add(notifId);
    const arr = Array.from(ids).slice(-500);
    const key = userId ? `${DELETED_NOTIFS_KEY_PREFIX}${userId}` : 'b202_deleted_notifs_global';
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
};

export const getDismissedBroadcastIds = (userId) => {
  try {
    const key = userId ? `${DISMISSED_BROADCASTS_KEY_PREFIX}${userId}` : 'b202_dismissed_broadcasts_global';
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const markBroadcastDismissed = (userId, broadcastId) => {
  if (!broadcastId) return;
  try {
    const ids = getDismissedBroadcastIds(userId);
    ids.add(broadcastId);
    const arr = Array.from(ids).slice(-200);
    const key = userId ? `${DISMISSED_BROADCASTS_KEY_PREFIX}${userId}` : 'b202_dismissed_broadcasts_global';
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
};

// Check if a notification is strictly intended for currentUser
export const isNotificationForUser = (notif, currentUser) => {
  if (!notif || !currentUser) return false;

  // Don't notify the sender of their own actions
  if (notif.fromId === currentUser.id || notif.senderId === currentUser.id) {
    // Note: in notification list, sender can still see it if they want, but don't notify
    // If notif is explicitly targeted to specific recipients:
    if (Array.isArray(notif.recipientIds) && !notif.recipientIds.includes('all') && !notif.recipientIds.includes(currentUser.id)) {
      return false;
    }
  }

  // 1. Explicit array of recipient member IDs
  if (Array.isArray(notif.recipientIds) && notif.recipientIds.length > 0) {
    if (notif.recipientIds.includes('all')) return true;
    return notif.recipientIds.includes(currentUser.id);
  }

  // 2. Target / toId matching
  if (notif.toId === 'all' || notif.target === 'all' || notif.toId === 'broadcast' || notif.target === 'broadcast') {
    return true;
  }
  if (notif.targetId && notif.targetId !== 'all') {
    return notif.targetId === currentUser.id;
  }
  if (notif.toId) {
    return notif.toId === currentUser.id;
  }
  if (notif.target) {
    return notif.target === currentUser.id;
  }

  // 3. Recipient name matching (e.g. "Rohan")
  if (notif.recipientName) {
    if (notif.recipientName === 'All Flatmates' || notif.recipientName === 'everyone') return true;
    const lowerName = currentUser.name.toLowerCase();
    const lowerId = currentUser.id.toLowerCase();
    const targetLower = notif.recipientName.toLowerCase();
    return targetLower.includes(lowerName) || targetLower.includes(lowerId);
  }

  // 4. Default broadcasts
  return notif.type === 'broadcast';
};
