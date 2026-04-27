import { supabase } from './supabase';

export type WeightUnit = 'lbs' | 'kg';

export interface WeightLog {
  id: string;
  date: string;
  value: number;
  unit: WeightUnit;
}

export async function saveWeight(
  userId: string,
  value: number,
  unit: WeightUnit,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('weight_logs').insert({
    user_id: userId,
    date: today,
    value,
    metric_type: unit,
  });
  if (error) throw error;
}

export async function fetchWeightLogs(
  userId: string,
  unit: WeightUnit,
  days = 90,
): Promise<WeightLog[]> {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('weight_logs')
    .select('id, date, value, metric_type')
    .eq('user_id', userId)
    .eq('metric_type', unit)
    .gte('date', cutoff)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { id: string; date: string; value: number; metric_type: string }) => ({
    id: r.id,
    date: r.date,
    value: r.value,
    unit: r.metric_type as WeightUnit,
  }));
}

export async function fetchLatestWeight(userId: string): Promise<WeightLog | null> {
  const { data } = await supabase
    .from('weight_logs')
    .select('id, date, value, metric_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, date: data.date, value: data.value, unit: data.metric_type as WeightUnit };
}

export function formatWeightForContext(logs: WeightLog[]): string {
  if (logs.length === 0) return '';
  const unit = logs[logs.length - 1].unit;
  const recent = logs.slice(-7);
  const entries = recent.map((l) => {
    const d = new Date(l.date + 'T12:00');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${label}: ${l.value}`;
  }).join(', ');

  let trend = '';
  if (recent.length >= 2) {
    const diff = recent[recent.length - 1].value - recent[0].value;
    if (Math.abs(diff) >= 0.5) {
      trend = diff < 0
        ? ` (down ${Math.abs(diff).toFixed(1)} ${unit})`
        : ` (up ${Math.abs(diff).toFixed(1)} ${unit})`;
    }
  }
  return `Weight (${unit}): ${entries}${trend}`;
}
