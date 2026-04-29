import { supabase } from './supabase';
import { CoachVibe } from '../constants/coaches';
import { HydrateParams } from '../stores/onboardingStore';

export async function fetchUserProfile(userId: string): Promise<HydrateParams | null> {
  const [profileRes, coachRes, memoryRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('coach_selections')
      .select('coach_id, coach_custom_name, vibe')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('coach_memory')
      .select('memory_type, content')
      .eq('user_id', userId)
      .in('memory_type', ['goal', 'constraint']),
  ]);

  if (!profileRes.data && !coachRes.data) return null;

  const goalRow = memoryRes.data?.find((m) => m.memory_type === 'goal');
  const constraintRows = memoryRes.data?.filter((m) => m.memory_type === 'constraint') ?? [];

  return {
    name: profileRes.data?.full_name ?? '',
    goals: goalRow?.content ?? '',
    constraints: constraintRows.map((m) => m.content),
    selectedCoachId: coachRes.data?.coach_id ?? null,
    coachCustomName: coachRes.data?.coach_custom_name ?? '',
    vibe: (coachRes.data?.vibe as CoachVibe | null) ?? null,
  };
}

export interface ChatStats {
  streak: number;
  weeklyMessages: number;
}

// ── Coach memory (Coach's Notes) ──────────────────────────────────────────

export interface CoachMemoryRow {
  id: string;
  memory_type: string;
  content: string;
}

export async function fetchCoachNotes(userId: string): Promise<CoachMemoryRow[]> {
  const { data } = await supabase
    .from('coach_memory')
    .select('id, memory_type, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return (data ?? []) as CoachMemoryRow[];
}

export async function updateCoachNote(id: string, content: string): Promise<void> {
  await supabase.from('coach_memory').update({ content }).eq('id', id);
}

export async function deleteCoachNote(id: string): Promise<void> {
  await supabase.from('coach_memory').delete().eq('id', id);
}

export async function addCoachNote(
  userId: string,
  coachId: number,
  memoryType: string,
  content: string,
): Promise<void> {
  await supabase.from('coach_memory').insert({
    user_id: userId,
    coach_id: coachId,
    memory_type: memoryType,
    content,
    confidence: 1.0,
  });
}

export async function updateCoachCustomName(userId: string, customName: string): Promise<void> {
  await supabase
    .from('coach_selections')
    .update({ coach_custom_name: customName })
    .eq('user_id', userId)
    .eq('is_active', true);
}

export async function saveCoachSelection(
  userId: string,
  coachId: number,
  customName: string,
  vibe: CoachVibe,
): Promise<void> {
  await supabase
    .from('coach_selections')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  await supabase.from('coach_selections').insert({
    user_id: userId,
    coach_id: coachId,
    coach_custom_name: customName,
    vibe,
    is_active: true,
  });
}

export async function fetchChatStats(userId: string): Promise<ChatStats> {
  const { data } = await supabase
    .from('messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(200);

  if (!data || data.length === 0) return { streak: 0, weeklyMessages: 0 };

  const localDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const uniqueDates = [...new Set(data.map((m) => localDate(m.created_at)))]
    .sort()
    .reverse();

  const today = localDate(new Date().toISOString());
  const yesterday = localDate(new Date(Date.now() - 86400000).toISOString());

  let streak = 0;
  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    let expected = uniqueDates[0];
    for (const date of uniqueDates) {
      if (date === expected) {
        streak++;
        const d = new Date(expected);
        d.setDate(d.getDate() - 1);
        expected = localDate(d.toISOString());
      } else {
        break;
      }
    }
  }

  const cutoff = localDate(new Date(Date.now() - 6 * 86400000).toISOString());
  const weeklyMessages = data.filter((m) => localDate(m.created_at) >= cutoff).length;

  return { streak, weeklyMessages };
}
