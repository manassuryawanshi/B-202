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
    const bills = JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLS)) || INITIAL_BILLS;
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

// Request and trigger native Web Push / Browser Notification
export const sendBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        ...options
      });
      return true;
    } catch {
      return false;
    }
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          ...options
        });
      }
    });
  }
  return false;
};
