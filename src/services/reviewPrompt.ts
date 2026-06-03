import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';

const KEY_SESSION_COUNT = '@reviewPrompt/sessionCount';
const KEY_LAST_SESSION_AT = '@reviewPrompt/lastSessionAt';
const KEY_GATE_SHOWN_AT = '@reviewPrompt/gateShownAt';
const KEY_FEEDBACK_EMAIL = 'vividcoachapp@gmail.com';

// Treat foreground events within this window as the same session.
const SESSION_COALESCE_MS = 30 * 60 * 1000; // 30 minutes

export const REVIEW_PROMPT_MIN_SESSIONS = 3;

export type ReviewTriggerSource = 'sunday_recap' | 'post_workout';

async function readNumber(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function getSessionCount(): Promise<number> {
  return readNumber(KEY_SESSION_COUNT);
}

export async function hasShownSatisfactionGate(): Promise<boolean> {
  return (await readNumber(KEY_GATE_SHOWN_AT)) > 0;
}

/**
 * Increment the session counter at most once per coalescing window.
 * Called on app launch and when returning from background.
 */
export async function recordSessionStart(): Promise<number> {
  const now = Date.now();
  const last = await readNumber(KEY_LAST_SESSION_AT);
  if (last > 0 && now - last < SESSION_COALESCE_MS) {
    return readNumber(KEY_SESSION_COUNT);
  }
  const current = await readNumber(KEY_SESSION_COUNT);
  const next = current + 1;
  try {
    await AsyncStorage.multiSet([
      [KEY_SESSION_COUNT, String(next)],
      [KEY_LAST_SESSION_AT, String(now)],
    ]);
  } catch {}
  return next;
}

/**
 * Returns true when the satisfaction gate is eligible to display:
 * - iOS (only platform where requestReview matters for App Store)
 * - session count >= REVIEW_PROMPT_MIN_SESSIONS
 * - gate has never been shown to this user
 */
export async function shouldShowSatisfactionGate(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const [sessions, shown] = await Promise.all([
    getSessionCount(),
    hasShownSatisfactionGate(),
  ]);
  if (shown) return false;
  return sessions >= REVIEW_PROMPT_MIN_SESSIONS;
}

export async function markSatisfactionGateShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_GATE_SHOWN_AT, String(Date.now()));
  } catch {}
}

/**
 * Fire the native App Store review prompt. Apple controls whether
 * the dialog actually appears (3/365-day budget per user).
 */
export async function requestNativeReview(): Promise<void> {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    await StoreReview.requestReview();
  } catch {}
}

export async function openFeedbackChannel(source: ReviewTriggerSource): Promise<void> {
  const subject = encodeURIComponent(`VividCoach feedback (${source})`);
  const body = encodeURIComponent(
    "Tell us what wasn't great so we can fix it. What were you trying to do?\n\n",
  );
  const url = `mailto:${KEY_FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  try {
    await Linking.openURL(url);
  } catch {}
}

// Test-only escape hatch: clears persisted state so QA can re-trigger the gate.
export async function __resetReviewPromptState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEY_SESSION_COUNT,
      KEY_LAST_SESSION_AT,
      KEY_GATE_SHOWN_AT,
    ]);
  } catch {}
}
