import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CACHE_KEY = '@vc_notification_prefs';

export interface NotificationPrefs {
  quietEnabled:  boolean;
  quietStart:    string; // "HH:MM" 24h, e.g. "21:00"
  quietEnd:      string; // "HH:MM" 24h, e.g. "09:00"
  notifyCheckin: boolean;
  notifyNudge:   boolean;
  notifyRecap:   boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  quietEnabled:  false,
  quietStart:    '21:00',
  quietEnd:      '09:00',
  notifyCheckin: true,
  notifyNudge:   true,
  notifyRecap:   true,
};

// ── Quiet-hours check ─────────────────────────────────────────────────────────

export function isInQuietHours(fireHour: number, prefs: NotificationPrefs): boolean {
  if (!prefs.quietEnabled) return false;

  const [sh, sm] = prefs.quietStart.split(':').map(Number);
  const [eh, em] = prefs.quietEnd.split(':').map(Number);
  const fireMins  = fireHour * 60;       // notification minute is always :00
  const startMins = sh * 60 + (sm ?? 0);
  const endMins   = eh * 60 + (em ?? 0);

  if (startMins > endMins) {
    // Overnight window (e.g. 21:00–09:00): wraps midnight
    return fireMins >= startMins || fireMins < endMins;
  }
  return fireMins >= startMins && fireMins < endMins;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

export async function getCachedPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

async function writeCache(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(prefs)).catch(() => {});
}

// ── Supabase sync ─────────────────────────────────────────────────────────────

export async function fetchAndCachePrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('quiet_hours_enabled, quiet_hours_start, quiet_hours_end, notify_daily_checkin, notify_momentum, notify_weekly_recap')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      const prefs: NotificationPrefs = {
        quietEnabled:  data.quiet_hours_enabled  ?? DEFAULT_PREFS.quietEnabled,
        quietStart:    (data.quiet_hours_start    ?? '21:00:00').slice(0, 5),
        quietEnd:      (data.quiet_hours_end      ?? '09:00:00').slice(0, 5),
        notifyCheckin: data.notify_daily_checkin  ?? DEFAULT_PREFS.notifyCheckin,
        notifyNudge:   data.notify_momentum       ?? DEFAULT_PREFS.notifyNudge,
        notifyRecap:   data.notify_weekly_recap   ?? DEFAULT_PREFS.notifyRecap,
      };
      await writeCache(prefs);
      return prefs;
    }
  } catch {}
  return getCachedPrefs();
}

export async function savePrefs(userId: string, prefs: NotificationPrefs): Promise<void> {
  await writeCache(prefs);
  const { error } = await supabase.from('profiles').update({
    quiet_hours_enabled:  prefs.quietEnabled,
    quiet_hours_start:    prefs.quietStart + ':00',
    quiet_hours_end:      prefs.quietEnd   + ':00',
    notify_daily_checkin: prefs.notifyCheckin,
    notify_momentum:      prefs.notifyNudge,
    notify_weekly_recap:  prefs.notifyRecap,
  }).eq('id', userId);
  if (error) throw new Error(error.message);
}
