import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

// ── HealthKit (iOS native — available in EAS Build, null in Expo Go) ──────────
// react-native-health exports NativeModules.RNAppleHealthKit directly.
// In Expo Go that module is undefined, so the import resolves to null.
// Every call site checks for null before use; Expo Go degrades gracefully.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AppleHealthKit: any = Platform.OS === 'ios'
  ? (() => { try { return require('react-native-health'); } catch { return null; } })()
  : null;

const HK_PERMISSIONS = {
  permissions: {
    read: ['StepCount', 'SleepAnalysis', 'ActiveEnergyBurned', 'HeartRate'],
    write: [] as string[],
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailySteps {
  date: string; // YYYY-MM-DD
  steps: number;
}

export interface HealthSnapshot {
  steps: number | null;            // today's steps
  weekSteps: DailySteps[];         // past 7 days
  sleepMinutes: number | null;     // last night's sleep in minutes
  activeCalories: number | null;   // today's active calories burned
  restingHeartRate: number | null; // recent avg resting HR in bpm
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

// ── HealthKit initialisation ──────────────────────────────────────────────────

let hkInitialised = false;

function initHealthKit(): Promise<boolean> {
  if (!AppleHealthKit) return Promise.resolve(false);
  if (hkInitialised) return Promise.resolve(true);
  return new Promise((resolve) => {
    try {
      AppleHealthKit.initHealthKit(HK_PERMISSIONS, (error: string) => {
        if (error) { resolve(false); return; }
        hkInitialised = true;
        resolve(true);
      });
    } catch { resolve(false); }
  });
}

// ── Step counting ─────────────────────────────────────────────────────────────
// On iOS with HealthKit available: use HK (aggregates iPhone + Apple Watch).
// Fallback: expo-sensors Pedometer (works in Expo Go, iPhone-only).

async function isPedometerAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try { return await Pedometer.isAvailableAsync(); } catch { return false; }
}

export async function requestStepPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  // On iOS, also trigger HealthKit permission sheet via initHealthKit
  if (Platform.OS === 'ios' && AppleHealthKit) {
    await initHealthKit();
  }
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
  const now = new Date();

  // Prefer HealthKit (includes Apple Watch)
  if (AppleHealthKit && hkInitialised) {
    const result = await new Promise<number | null>((resolve) => {
      try {
        AppleHealthKit.getStepCount(
          { date: now.toISOString() },
          (err: string, res: { value: number }) => {
            if (err || res == null) { resolve(null); return; }
            resolve(Math.round(res.value));
          },
        );
      } catch { resolve(null); }
    });
    if (result !== null) return result;
  }

  // Fallback: expo-sensors Pedometer
  if (!(await isPedometerAvailable())) return null;
  if (!(await requestStepPermission())) return null;
  return stepsInRange(startOfDay(now), now);
}

async function fetchWeekStepsInternal(): Promise<DailySteps[]> {
  const now = new Date();

  // Prefer HealthKit daily aggregates
  if (AppleHealthKit && hkInitialised) {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    startOfDay(sevenDaysAgo);

    const result = await new Promise<DailySteps[] | null>((resolve) => {
      try {
        AppleHealthKit.getDailyStepCountSamples(
          { startDate: startOfDay(sevenDaysAgo).toISOString(), endDate: now.toISOString() },
          (err: string, res: Array<{ value: number; startDate: string }>) => {
            if (err || !res?.length) { resolve(null); return; }
            const byDate: Record<string, number> = {};
            for (const r of res) {
              const d = r.startDate.slice(0, 10);
              byDate[d] = (byDate[d] ?? 0) + r.value;
            }
            const days = Array.from({ length: 7 }, (_, i) => {
              const day = new Date(now);
              day.setDate(now.getDate() - (6 - i));
              const date = toISODate(day);
              return { date, steps: Math.round(byDate[date] ?? 0) };
            });
            resolve(days);
          },
        );
      } catch { resolve(null); }
    });
    if (result) return result;
  }

  // Fallback: expo-sensors Pedometer
  if (!(await isPedometerAvailable())) return [];
  if (!(await requestStepPermission())) return [];
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

// ── Sleep ─────────────────────────────────────────────────────────────────────

async function fetchSleepMinutesInternal(): Promise<number | null> {
  if (!AppleHealthKit || !hkInitialised) return null;

  // Window: 6 pm yesterday → now (captures last night's sleep)
  const start = new Date(Date.now() - 86400000);
  start.setHours(18, 0, 0, 0);
  const end = new Date();

  return new Promise((resolve) => {
    try {
      AppleHealthKit.getSleepSamples(
        { startDate: start.toISOString(), endDate: end.toISOString() },
        (err: string, results: Array<{ value: string; startDate: string; endDate: string }>) => {
          if (err || !results?.length) { resolve(null); return; }
          const asleep = results.filter(
            (s) => s.value !== 'SLEEP_INBED' && s.value !== 'SLEEP_AWAKE',
          );
          if (asleep.length === 0) { resolve(null); return; }
          const mins = asleep.reduce(
            (sum, s) =>
              sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000,
            0,
          );
          resolve(Math.round(mins));
        },
      );
    } catch { resolve(null); }
  });
}

// ── Active calories ────────────────────────────────────────────────────────────

async function fetchActiveCaloriesInternal(): Promise<number | null> {
  if (!AppleHealthKit || !hkInitialised) return null;
  const now = new Date();

  return new Promise((resolve) => {
    try {
      AppleHealthKit.getActiveEnergyBurned(
        { startDate: startOfDay(now).toISOString(), endDate: now.toISOString() },
        (err: string, results: Array<{ value: number }>) => {
          if (err || !results?.length) { resolve(null); return; }
          resolve(Math.round(results.reduce((s, r) => s + r.value, 0)));
        },
      );
    } catch { resolve(null); }
  });
}

// ── Heart rate ─────────────────────────────────────────────────────────────────

async function fetchRestingHeartRateInternal(): Promise<number | null> {
  if (!AppleHealthKit || !hkInitialised) return null;
  const now = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  return new Promise((resolve) => {
    try {
      AppleHealthKit.getHeartRateSamples(
        {
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
          ascending: false,
          limit: 10,
        },
        (err: string, results: Array<{ value: number }>) => {
          if (err || !results?.length) { resolve(null); return; }
          const avg = results.reduce((s, r) => s + r.value, 0) / results.length;
          resolve(Math.round(avg));
        },
      );
    } catch { resolve(null); }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch all health metrics in parallel. Always resolves — non-fatal. */
export async function fetchHealthSnapshot(): Promise<HealthSnapshot> {
  try {
    // iOS: initialise HealthKit first (triggers permission sheet on first call)
    if (Platform.OS === 'ios' && AppleHealthKit) {
      await initHealthKit();
    }

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

// Convenience exports used by progress screen (steps chart only)
export async function fetchTodaySteps(): Promise<number | null> {
  return fetchTodayStepsInternal().catch(() => null);
}
export async function fetchWeekSteps(): Promise<DailySteps[]> {
  return fetchWeekStepsInternal().catch(() => []);
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatSnapshotForContext(snap: HealthSnapshot): string {
  const parts: string[] = [];
  if (snap.steps != null)
    parts.push(`${snap.steps.toLocaleString()} steps`);
  if (snap.sleepMinutes != null)
    parts.push(`${formatSleep(snap.sleepMinutes)} sleep last night`);
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

export function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
