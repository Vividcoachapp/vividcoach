import { supabase } from './supabase';

export type ExerciseType = 'strength' | 'cardio' | 'other';

export interface Exercise {
  name: string;
  type?: ExerciseType;
  // Strength
  sets?: number;
  reps?: number;
  weight?: number;
  unit?: 'lbs' | 'kg';
  // Cardio & Other
  duration_minutes?: number;
  distance?: number;
  distance_unit?: 'km' | 'mi';
}

export function exerciseMeta(e: Exercise): string {
  if (!e.type || e.type === 'strength') {
    const parts: string[] = [];
    if (e.sets && e.reps) parts.push(`${e.sets}×${e.reps}`);
    if (e.weight) parts.push(`@ ${e.weight}${e.unit ?? 'lbs'}`);
    return parts.join(' ');
  }
  if (e.type === 'cardio') {
    const parts: string[] = [];
    if (e.duration_minutes) parts.push(`${e.duration_minutes} min`);
    if (e.distance) parts.push(`${e.distance} ${e.distance_unit ?? 'km'}`);
    return parts.join(' · ');
  }
  return e.duration_minutes ? `${e.duration_minutes} min` : '';
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
          if (!e.type || e.type === 'strength') {
            const wt = e.weight ? ` @ ${e.weight}${e.unit ?? 'lbs'}` : '';
            return `${e.name} ${e.sets ?? '?'}×${e.reps ?? '?'}${wt}`;
          }
          if (e.type === 'cardio') {
            const dur = e.duration_minutes ? `${e.duration_minutes}min` : '';
            const dist = e.distance ? ` ${e.distance}${e.distance_unit ?? 'km'}` : '';
            return `${e.name} ${dur}${dist}`.trim();
          }
          return e.name + (e.duration_minutes ? ` ${e.duration_minutes}min` : '');
        })
        .join(', ');
      const effort = w.perceived_effort ? ` — effort ${w.perceived_effort}/10` : '';
      return `${w.date}: ${exStr}${effort}`;
    })
    .join('\n');
}

export async function updateWorkoutLog(
  id: string,
  exercises: Exercise[],
  perceivedEffort: number | null,
  notes: string | null,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from('workout_logs')
    .update({ exercises, perceived_effort: perceivedEffort, notes: notes || null, date })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  const { error } = await supabase.from('workout_logs').delete().eq('id', id);
  if (error) throw error;
}

export function formatWorkoutDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
