import { WorkoutLog, exerciseMeta } from './workouts';
import { MealLog } from './nutrition';
import { WeightLog } from './weight';
import { DailySteps } from './health';

const DAYS_BACK = 14;

function isoDate(offset = 0): string {
  return new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
}

function dayLabel(dateStr: string): string {
  const today = isoDate(0);
  const yesterday = isoDate(1);
  const d = new Date(dateStr + 'T12:00');
  const dow = d.toLocaleDateString('en-US', { weekday: 'short' });
  if (dateStr === today) return `${dateStr} (today)`;
  if (dateStr === yesterday) return `${dateStr} (yesterday)`;
  return `${dateStr} (${dow})`;
}

export function buildUnifiedContext(
  workouts: WorkoutLog[],
  meals: MealLog[],
  weights: WeightLog[],
  weekSteps: DailySteps[] = [],
): string {
  const cutoff = isoDate(DAYS_BACK);

  const allDates = new Set([
    ...workouts.filter((w) => w.date >= cutoff).map((w) => w.date),
    ...meals.filter((m) => m.date >= cutoff).map((m) => m.date),
    ...weights.filter((w) => w.date >= cutoff).map((w) => w.date),
  ]);

  if (allDates.size === 0) return '';

  return [...allDates]
    .sort()
    .map((date) => {
      const lines: string[] = [dayLabel(date) + ':'];

      const dayWorkouts = workouts.filter((w) => w.date === date);
      for (const w of dayWorkouts) {
        const exStr = w.exercises
          .map((e) => {
            const m = exerciseMeta(e);
            return m ? `${e.name} (${m})` : e.name;
          })
          .join(', ');
        const effort = w.perceived_effort ? ` — effort ${w.perceived_effort}/10` : '';
        lines.push(`  Training: ${exStr}${effort}`);
        if (w.notes) lines.push(`    Note: ${w.notes}`);
      }

      const dayMeals = meals.filter((m) => m.date === date);
      if (dayMeals.length > 0) {
        lines.push(`  Nutrition: ${dayMeals.map((m) => m.meal_description).join(' | ')}`);
      }

      const dayWeight = weights.find((w) => w.date === date);
      if (dayWeight) {
        lines.push(`  Weight: ${dayWeight.value} ${dayWeight.unit}`);
      }

      const daySteps = weekSteps.find((s) => s.date === date);
      if (daySteps && daySteps.steps > 0) {
        lines.push(`  Steps: ${daySteps.steps.toLocaleString()}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

export function hasRecentData(
  workouts: WorkoutLog[],
  meals: MealLog[],
  weights: WeightLog[],
  days = 7,
): boolean {
  const cutoff = isoDate(days);
  return (
    workouts.some((w) => w.date >= cutoff) ||
    meals.some((m) => m.date >= cutoff) ||
    weights.some((w) => w.date >= cutoff)
  );
}
