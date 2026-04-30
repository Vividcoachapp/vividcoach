import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

// Fetches all rows for a table using 1000-row pages to bypass PostgREST default limit.
async function fetchAll(
  table: string,
  eqCol: string,
  eqVal: string,
  orderCol: string,
): Promise<object[]> {
  const PAGE = 1000;
  let offset = 0;
  const out: object[] = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(eqCol, eqVal)
      .order(orderCol, { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as object[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

export async function exportUserData(userId: string): Promise<void> {
  // Profile uses `id`, not `user_id` — fetch separately.
  const profileRes = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (profileRes.error) throw profileRes.error;

  const [
    coachSelections,
    messages,
    workoutLogs,
    nutritionLogs,
    weightLogs,
    coachMemory,
  ] = await Promise.all([
    fetchAll('coach_selections', 'user_id', userId, 'created_at'),
    fetchAll('messages',         'user_id', userId, 'created_at'),
    fetchAll('workout_logs',     'user_id', userId, 'date'),
    fetchAll('nutrition_logs',   'user_id', userId, 'created_at'),
    fetchAll('weight_logs',      'user_id', userId, 'date'),
    fetchAll('coach_memory',     'user_id', userId, 'created_at'),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data ?? null,
    coach_selections: coachSelections,
    messages,
    workout_logs: workoutLogs,
    nutrition_logs: nutritionLogs,
    weight_logs: weightLogs,
    coach_memory: coachMemory,
  };

  const filename = `vividcoach-export-${today}.json`;
  const fileUri = (FileSystem.cacheDirectory ?? '') + filename;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your VividCoach data',
    UTI: 'public.json',
  });
}
