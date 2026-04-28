import { supabase } from './supabase';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export interface MacroEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'ai_estimate' | 'barcode';
}

export interface MealLog {
  id: string;
  date: string;
  meal_description: string;
  notes: string | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  macros_source: string | null;
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
  macros?: MacroEstimate,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const fullDescription = `${MEAL_LABELS[mealType]}: ${description.trim()}`;

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    date: today,
    meal_description: fullDescription,
    notes: notes.trim() || null,
  };

  if (macros) {
    insertPayload.calories_kcal  = Math.round(macros.calories);
    insertPayload.protein_g      = Math.round(macros.protein * 10) / 10;
    insertPayload.carbs_g        = Math.round(macros.carbs * 10) / 10;
    insertPayload.fat_g          = Math.round(macros.fat * 10) / 10;
    insertPayload.macros_source  = macros.source;
  }

  const { error } = await supabase.from('nutrition_logs').insert(insertPayload);
  if (error) throw error;
}

export async function fetchRecentMeals(userId: string, limit = 14): Promise<MealLog[]> {
  // Try with macro columns first (requires migration). Falls back if they don't exist.
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('id, date, meal_description, notes, calories_kcal, protein_g, carbs_g, fat_g, macros_source')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    const { data: fallback } = await supabase
      .from('nutrition_logs')
      .select('id, date, meal_description, notes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (fallback ?? []).map((r) => ({ ...r, calories_kcal: null, protein_g: null, carbs_g: null, fat_g: null, macros_source: null })) as MealLog[];
  }

  return (data ?? []) as MealLog[];
}

// ── Open Food Facts barcode lookup (free, no API key) ─────────────────────────

export interface Per100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ScannedProduct {
  name: string;
  per100g: Per100g;
  servingSize: string;   // raw label from API e.g. "30g" or "2 crackers (28g)"
  servingGrams: number;  // parsed gram weight of one serving (fallback: 100)
}

/** Extract the gram/ml weight from an Open Food Facts serving_size string. */
function parseServingGrams(raw: string): number {
  if (!raw) return 100;
  // Prefer a parenthesised g/ml value: "(30 g)" or "(200ml)"
  const paren = raw.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\)/i);
  if (paren) return parseFloat(paren[1]);
  // Leading number with g/ml unit: "30g" or "30 g"
  const lead = raw.match(/^(\d+(?:\.\d+)?)\s*(?:g|ml)\b/i);
  if (lead) return parseFloat(lead[1]);
  // Any number + g/ml anywhere: "1 serving 30 g"
  const any = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)\b/i);
  if (any) return parseFloat(any[1]);
  return 100;
}

export async function fetchProductByBarcode(barcode: string): Promise<ScannedProduct | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: { 'User-Agent': 'VividCoach/1.0 (vividcoachapp@gmail.com)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const { product } = json;
    const n = product.nutriments ?? {};

    const name =
      product.product_name_en?.trim() ||
      product.product_name?.trim() ||
      'Unknown product';

    const cal100 = n['energy-kcal_100g'] ?? Math.round((n['energy_100g'] ?? 0) / 4.184);

    const servingSizeRaw = (product.serving_size ?? '').trim();
    const servingGrams   = parseServingGrams(servingSizeRaw) || 100;

    return {
      name,
      per100g: {
        calories: Math.round(cal100),
        protein:  Math.round((n['proteins_100g']       ?? 0) * 10) / 10,
        carbs:    Math.round((n['carbohydrates_100g']   ?? 0) * 10) / 10,
        fat:      Math.round((n['fat_100g']             ?? 0) * 10) / 10,
      },
      servingSize:  servingSizeRaw || '100g',
      servingGrams,
    };
  } catch {
    return null;
  }
}

/** Scale per-100g macros to a given gram amount. */
export function scaleMacros(per100g: Per100g, grams: number): MacroEstimate {
  const f = grams / 100;
  return {
    calories: Math.round(per100g.calories * f),
    protein:  Math.round(per100g.protein  * f * 10) / 10,
    carbs:    Math.round(per100g.carbs    * f * 10) / 10,
    fat:      Math.round(per100g.fat      * f * 10) / 10,
    source:   'barcode',
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
