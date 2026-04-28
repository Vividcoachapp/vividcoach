import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailySteps {
  date: string; // YYYY-MM-DD
  steps: number;
}

export interface HealthSnapshot {
  steps: number | null;            // today's steps (expo-sensors — works in Expo Go)
  weekSteps: DailySteps[];         // 7-day step history
  sleepMinutes: number | null;     // last night's sleep in minutes (requires EAS Build)
  activeCalories: number | null;   // today's active calories burned (requires EAS Build)
  restingHeartRate: number | null; // most recent resting HR in bpm (requires EAS Build)
}

export const EMPTY_SNAPSHOT: HealthSnapshot = {
  steps: null,
  weekSteps: [],
  sleepMinutes: null,
  activeCalories: null,
  restingHeartRate: null,
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r;
}
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Step counting via expo-sensors Pedometer (works in Expo Go) ───────────────

async function isPedometerAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try { return await Pedometer.isAvailableAsync(); } catch { return false; }
}

export async function requestStepPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Pedometer.requestPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}

async function stepsInRange(start: Date, end: Date): Promise<number> {
  try {
    const { steps } = await Pedometer.getStepCountAsync(start, end);
    return steps;
  } catch { return 0; }
}

async function fetchTodayStepsInternal(): Promise<number | null> {
  if (!(await isPedometerAvailable())) return null;
  if (!(await requestStepPermission())) return null;
  const now = new Date();
  return stepsInRange(startOfDay(now), now);
}

async function fetchWeekStepsInternal(): Promise<DailySteps[]> {
  if (!(await isPedometerAvailable())) return [];
  if (!(await requestStepPermission())) return [];
  const now = new Date();
  return Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - i));
      const start = startOfDay(day);
      const end   = toISODate(day) === toISODate(now) ? now : endOfDay(day);
      return stepsInRange(start, end).then((steps) => ({ date: toISODate(day), steps }));
    }),
  );
}

// ── Sleep, calories, heart rate ───────────────────────────────────────────────
//
// These require native HealthKit (iOS) or Health Connect (Android).
// They are stubbed to return null in Expo Go / standard development builds.
//
// TO ENABLE (after running `npx expo run:ios` or EAS Build):
//
//   iOS — install `react-native-health` and replace the body of
//   fetchSleepMinutesInternal, fetchActiveCaloriesInternal, and
//   fetchRestingHeartRateInternal with the commented implementations below.
//   Add to app.json: ios.infoPlist.NSHealthShareUsageDescription,
//   ios.entitlements["com.apple.developer.healthkit"] = true.
//
//   Android — install `react-native-health-connect` and follow the
//   same pattern using readRecords('SleepSession'|'ActiveCaloriesBurned'|'HeartRate').

async function fetchSleepMinutesInternal(): Promise<number | null> {
  /* iOS (react-native-health):
  import AppleHealthKit from 'react-native-health';
  const start = new Date(Date.now() - 86400000); start.setHours(18, 0, 0, 0);
  return new Promise((resolve) => {
    AppleHealthKit.getSleepSamples(
      { startDate: start.toISOString(), endDate: new Date().toISOString() },
      (err: any, results: any[]) => {
        if (err || !results?.length) { resolve(null); return; }
        const asleep = results.filter(
          (s) => s.value !== 'SLEEP_INBED' && s.value !== 'SLEEP_AWAKE'
        );
        const mins = asleep.reduce(
          (sum, s) => sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000, 0
        );
        resolve(Math.round(mins));
      },
    );
  });
  */
  return null;
}

async function fetchActiveCaloriesInternal(): Promise<number | null> {
  /* iOS (react-native-health):
  import AppleHealthKit from 'react-native-health';
  const now = new Date(); const startOfToday = startOfDay(now);
  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(
      { startDate: startOfToday.toISOString(), endDate: now.toISOString() },
      (err: any, results: any[]) => {
        if (err || !results?.length) { resolve(null); return; }
        resolve(Math.round(results.reduce((s, r) => s + r.value, 0)));
      },
    );
  });
  */
  return null;
}

async function fetchRestingHeartRateInternal(): Promise<number | null> {
  /* iOS (react-native-health):
  import AppleHealthKit from 'react-native-health';
  return new Promise((resolve) => {
    AppleHealthKit.getHeartRateSamples(
      {
        startDate: new Date(Date.now() - 86400000).toISOString(),
        endDate: new Date().toISOString(),
        ascending: false,
        limit: 10,
      },
      (err: any, results: any[]) => {
        if (err || !results?.length) { resolve(null); return; }
        const avg = results.reduce((s, r) => s + r.value, 0) / results.length;
        resolve(Math.round(avg));
      },
    );
  });
  */
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch all health metrics in parallel. Non-fatal — always resolves. */
export async function fetchHealthSnapshot(): Promise<HealthSnapshot> {
  try {
    const [steps, weekSteps, sleepMinutes, activeCalories, restingHeartRate] =
      await Promise.all([
        fetchTodayStepsInternal().catch(() => null),
        fetchWeekStepsInternal().catch(() => []),
        fetchSleepMinutesInternal().catch(() => null),
        fetchActiveCaloriesInternal().catch(() => null),
        fetchRestingHeartRateInternal().catch(() => null),
      ]);
    return { steps, weekSteps: weekSteps ?? [], sleepMinutes, activeCalories, restingHeartRate };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

// Keep named exports for callers that only need steps (progress screen)
export async function fetchTodaySteps(): Promise<number | null> {
  return fetchTodayStepsInternal().catch(() => null);
}
export async function fetchWeekSteps(): Promise<DailySteps[]> {
  return fetchWeekStepsInternal().catch(() => []);
}

// ── Context formatters ────────────────────────────────────────────────────────

export function formatSnapshotForContext(snap: HealthSnapshot): string {
  const parts: string[] = [];
  if (snap.steps != null)
    parts.push(`${snap.steps.toLocaleString()} steps`);
  if (snap.sleepMinutes != null) {
    const h = Math.floor(snap.sleepMinutes / 60);
    const m = snap.sleepMinutes % 60;
    parts.push(`${h}h ${m > 0 ? `${m}m ` : ''}sleep last night`);
  }
  if (snap.activeCalories != null)
    parts.push(`${snap.activeCalories} active calories`);
  if (snap.restingHeartRate != null)
    parts.push(`avg HR ${snap.restingHeartRate} bpm`);
  return parts.length > 0 ? `Health: ${parts.join(' · ')}` : '';
}

export function formatStepsForContext(weekSteps: DailySteps[]): string {
  if (weekSteps.every((d) => d.steps === 0)) return '';
  return weekSteps
    .filter((d) => d.steps > 0)
    .map((d) => {
      const day = new Date(d.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short' });
      return `${day} ${d.steps.toLocaleString()}`;
    })
    .join(', ');
}

/** Format a sleep duration (minutes) as "7h 23m". */
export function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
