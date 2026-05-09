import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WorkoutLog } from '../../services/workouts';
import { MealLog, mealTypeFromDescription } from '../../services/nutrition';
import { WeightLog } from '../../services/weight';
import { colors } from '../../constants/colors';
import { fonts, spacing, radii } from '../../constants/theme';

interface RecentActivityFeedProps {
  workouts: WorkoutLog[];
  meals: MealLog[];
  weights: WeightLog[];
  /** Max items shown across all 3 types combined. */
  limit?: number;
  onWorkoutPress: (w: WorkoutLog) => void;
  onWorkoutLongPress: (w: WorkoutLog) => void;
  onMealPress: (m: MealLog) => void;
  onMealLongPress: (m: MealLog) => void;
  onWeightPress: (w: WeightLog) => void;
  onWeightLongPress: (w: WeightLog) => void;
}

type FeedItem =
  | { kind: 'workout'; sortKey: string; data: WorkoutLog }
  | { kind: 'meal'; sortKey: string; data: MealLog }
  | { kind: 'weight'; sortKey: string; data: WeightLog };

/** Workouts/meals/weights are typed without an explicit `created_at`; fall back
 *  to date if not present. The cast is safe — the underlying Supabase rows do
 *  carry a created_at, but service types only expose the day-level date. */
function sortKeyOf<T extends { date: string; created_at?: string }>(row: T): string {
  return row.created_at ?? row.date;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00' : ''));
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentActivityFeed({
  workouts,
  meals,
  weights,
  limit = 15,
  onWorkoutPress,
  onWorkoutLongPress,
  onMealPress,
  onMealLongPress,
  onWeightPress,
  onWeightLongPress,
}: RecentActivityFeedProps) {
  const items: FeedItem[] = [
    ...workouts.map<FeedItem>((w) => ({ kind: 'workout', sortKey: sortKeyOf(w as any), data: w })),
    ...meals.map<FeedItem>((m) => ({ kind: 'meal', sortKey: sortKeyOf(m as any), data: m })),
    ...weights.map<FeedItem>((w) => ({ kind: 'weight', sortKey: sortKeyOf(w as any), data: w })),
  ];
  items.sort((a, b) => (a.sortKey > b.sortKey ? -1 : a.sortKey < b.sortKey ? 1 : 0));
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No activity yet — log a workout, meal, or weight to start.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {visible.map((item) => {
        if (item.kind === 'workout') {
          const w = item.data;
          const names = w.exercises.map((e) => e.name);
          const summary =
            names.slice(0, 3).join(' · ') + (names.length > 3 ? ` +${names.length - 3}` : '');
          return (
            <TouchableOpacity
              key={`w-${w.id}`}
              style={styles.row}
              onPress={() => onWorkoutPress(w)}
              onLongPress={() => onWorkoutLongPress(w)}
              activeOpacity={0.7}
            >
              <View style={[styles.pill, { backgroundColor: colors.accent }]}>
                <Text style={styles.pillText}>W</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.primary} numberOfLines={1}>{summary || 'Workout'}</Text>
                <Text style={styles.secondary}>{formatTimestamp(w.date)}</Text>
              </View>
            </TouchableOpacity>
          );
        }
        if (item.kind === 'meal') {
          const m = item.data;
          const colonIdx = m.meal_description.indexOf(':');
          const body = colonIdx !== -1 ? m.meal_description.slice(colonIdx + 1).trim() : m.meal_description;
          const mealType = mealTypeFromDescription(m.meal_description);
          return (
            <TouchableOpacity
              key={`m-${m.id}`}
              style={styles.row}
              onPress={() => onMealPress(m)}
              onLongPress={() => onMealLongPress(m)}
              activeOpacity={0.7}
            >
              <View style={[styles.pill, { backgroundColor: colors.textPrimary }]}>
                <Text style={styles.pillTextDark}>M</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.primary} numberOfLines={1}>{body || mealType}</Text>
                <Text style={styles.secondary}>{formatTimestamp(m.date)}</Text>
              </View>
            </TouchableOpacity>
          );
        }
        // weight
        const w = item.data;
        return (
          <TouchableOpacity
            key={`wt-${w.id}`}
            style={styles.row}
            onPress={() => onWeightPress(w)}
            onLongPress={() => onWeightLongPress(w)}
            activeOpacity={0.7}
          >
            <View style={[styles.pill, { backgroundColor: colors.warmAccent }]}>
              <Text style={styles.pillTextDark}>⚖</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.primary} numberOfLines={1}>{w.value} {w.unit}</Text>
              <Text style={styles.secondary}>{formatTimestamp(w.date)}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  pillText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.backgroundPrimary,
  },
  pillTextDark: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.backgroundPrimary,
  },
  body: { flex: 1, gap: 2 },
  primary: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  secondary: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
