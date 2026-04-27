import { supabase } from './supabase';

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  unit?: 'lbs' | 'kg';
}

export interface WorkoutLog {
  id: string;
  date: string;
  exercises: Exercise[];
  perceived_effort: number | null;
  duration_minutes: number | null;
  notes: string | null;
}

export async function saveWorkout(
  userId: string,
  coachId: number,
  exercises: Exercise[],
  perceivedEffort: number | null,
  notes: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('workout_logs').insert({
    user_id: userId,
    coach_id: coachId,
    date: today,
    exercises,
    perceived_effort: perceivedEffort,
    notes: notes.trim() || null,
  });
  if (error) throw error;
}

export async function fetchRecentWorkouts(userId: string, limit = 10): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, date, exercises, perceived_effort, duration_minutes, notes')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

export function formatWorkoutsForContext(workouts: WorkoutLog[]): string {
  if (workouts.length === 0) return '';
  return workouts
    .slice(0, 5)
    .map((w) => {
      const exStr = w.exercises
        .map((e) => {
          const wt = e.weight ? ` @ ${e.weight}${e.unit ?? 'lbs'}` : '';
          return `${e.name} ${e.sets}×${e.reps}${wt}`;
        })
        .join(', ');
      const effort = w.perceived_effort ? ` — effort ${w.perceived_effort}/10` : '';
      return `${w.date}: ${exStr}${effort}`;
    })
    .join('\n');
}

export function formatWorkoutDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
