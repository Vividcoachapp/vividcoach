import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export interface DailySteps {
  date: string; // YYYY-MM-DD
  steps: number;
}

// ── Availability ──────────────────────────────────────────────────────────────

export async function isStepCountingAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function requestStepPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Pedometer.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function stepsInRange(start: Date, end: Date): Promise<number> {
  try {
    const { steps } = await Pedometer.getStepCountAsync(start, end);
    return steps;
  } catch {
    return 0;
  }
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Today's step count, or null if unavailable / permission denied. */
export async function fetchTodaySteps(): Promise<number | null> {
  const ok = await isStepCountingAvailable();
  if (!ok) return null;
  const granted = await requestStepPermission();
  if (!granted) return null;

  const now = new Date();
  const steps = await stepsInRange(startOfDay(now), now);
  return steps;
}

/** Daily step counts for the past 7 days including today. */
export async function fetchWeekSteps(): Promise<DailySteps[]> {
  const ok = await isStepCountingAvailable();
  if (!ok) return [];
  const granted = await requestStepPermission();
  if (!granted) return [];

  const now = new Date();
  const results = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - i));
      const start = startOfDay(day);
      const end   = toISODate(day) === toISODate(now) ? now : endOfDay(day);
      return stepsInRange(start, end).then((steps) => ({
        date: toISODate(day),
        steps,
      }));
    }),
  );
  return results;
}

// ── Context string builder ─────────────────────────────────────────────────────

/** Format week steps for injection into the AI system prompt. */
export function formatStepsForContext(weekSteps: DailySteps[]): string {
  if (weekSteps.every((d) => d.steps === 0)) return '';
  const lines = weekSteps
    .filter((d) => d.steps > 0)
    .map((d) => {
      const day = new Date(d.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short' });
      return `${day} ${d.steps.toLocaleString()}`;
    });
  return lines.join(', ');
}

// ── EAS Build upgrade path ─────────────────────────────────────────────────────
// Sleep, resting heart rate, and active calories require HealthKit (iOS) or
// Health Connect (Android) — both need native modules beyond expo-sensors.
// When moving to EAS Build, install `react-native-health` + `react-native-health-connect`
// and add `fetchSleepData()`, `fetchHeartRate()`, `fetchActiveCalories()` here.
// The context and AI layer are already structured to receive those fields.
