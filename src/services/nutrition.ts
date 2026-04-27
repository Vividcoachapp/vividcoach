import { supabase } from './supabase';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export interface MealLog {
  id: string;
  date: string;
  meal_description: string;
  notes: string | null;
}

export function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snack';
}

export function mealTypeFromDescription(desc: string): MealType {
  const prefix = desc.split(':')[0].toLowerCase().trim();
  if (prefix === 'breakfast') return 'breakfast';
  if (prefix === 'lunch') return 'lunch';
  if (prefix === 'dinner') return 'dinner';
  return 'snack';
}

export async function saveMeal(
  userId: string,
  mealType: MealType,
  description: string,
  notes: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const fullDescription = `${MEAL_LABELS[mealType]}: ${description.trim()}`;
  const { error } = await supabase.from('nutrition_logs').insert({
    user_id: userId,
    date: today,
    meal_description: fullDescription,
    notes: notes.trim() || null,
  });
  if (error) throw error;
}

export async function fetchRecentMeals(userId: string, limit = 14): Promise<MealLog[]> {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('id, date, meal_description, notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MealLog[];
}

export function formatMealsForContext(meals: MealLog[]): string {
  if (meals.length === 0) return '';
  return meals
    .slice(0, 7)
    .map((m) => `${m.date}: ${m.meal_description}`)
    .join('\n');
}

export function formatMealDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
