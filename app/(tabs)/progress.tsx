import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../src/stores/authStore';
import { fetchRecentWorkouts, formatWorkoutDate, exerciseMeta, WorkoutLog } from '../../src/services/workouts';
import { fetchRecentMeals, formatMealDate, mealTypeFromDescription, MealLog } from '../../src/services/nutrition';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

// ── Workout card ──────────────────────────────────────────────────────────────
function WorkoutCard({ workout }: { workout: WorkoutLog }) {
  const names = workout.exercises.map((e) => e.name);
  const summary = names.slice(0, 3).join(' · ') + (names.length > 3 ? ` +${names.length - 3}` : '');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardDate}>{formatWorkoutDate(workout.date)}</Text>
        {workout.perceived_effort ? (
          <View style={styles.effortBadge}>
            <Text style={styles.effortBadgeText}>{workout.perceived_effort}/10</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardSummary}>{summary || 'Workout logged'}</Text>
      <View style={styles.cardDetails}>
        {workout.exercises.map((e, i) => {
          const meta = exerciseMeta(e);
          return (
            <Text key={i} style={styles.detailRow}>
              <Text style={styles.detailName}>{e.name}</Text>
              {meta ? <Text style={styles.detailMeta}>{'  '}{meta}</Text> : null}
            </Text>
          );
        })}
      </View>
      {workout.notes ? <Text style={styles.cardNotes} numberOfLines={2}>{workout.notes}</Text> : null}
    </View>
  );
}

// ── Meal card ─────────────────────────────────────────────────────────────────
const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f5a623',
  lunch:     '#7ed321',
  dinner:    '#9b59b6',
  snack:     '#4a90e2',
};

function MealCard({ meal }: { meal: MealLog }) {
  const mealType = mealTypeFromDescription(meal.meal_description);
  const colonIdx = meal.meal_description.indexOf(':');
  const bodyText = colonIdx !== -1
    ? meal.meal_description.slice(colonIdx + 1).trim()
    : meal.meal_description;

  const badgeColor = MEAL_COLORS[mealType] ?? colors.textSecondary;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardDate}>{formatMealDate(meal.date)}</Text>
        <View style={[styles.mealBadge, { borderColor: badgeColor + '55', backgroundColor: badgeColor + '18' }]}>
          <Text style={[styles.mealBadgeText, { color: badgeColor }]}>
            {mealType.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.mealBody} numberOfLines={3}>{bodyText}</Text>
      {meal.notes ? <Text style={styles.cardNotes} numberOfLines={2}>{meal.notes}</Text> : null}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [meals, setMeals]       = useState<MealLog[]>([]);
  const [loading, setLoading]   = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) { setLoading(false); return; }
      setLoading(true);
      Promise.all([
        fetchRecentWorkouts(user.id, 20),
        fetchRecentMeals(user.id, 20),
      ])
        .then(([w, m]) => { setWorkouts(w); setMeals(m); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user?.id]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Fixed header ─────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text style={styles.screenTitle}>Log</Text>
        <View style={styles.logBtns}>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => router.push('/log-workout')}
            activeOpacity={0.85}
          >
            <Ionicons name="barbell-outline" size={15} color={colors.backgroundPrimary} />
            <Text style={styles.logBtnText}>Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => router.push('/log-meal')}
            activeOpacity={0.85}
          >
            <Ionicons name="restaurant-outline" size={15} color={colors.backgroundPrimary} />
            <Text style={styles.logBtnText}>Meal</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            {/* ── Workouts section ───────────────────── */}
            <Text style={styles.sectionLabel}>WORKOUTS</Text>
            {workouts.length === 0 ? (
              <TouchableOpacity
                style={styles.miniEmpty}
                onPress={() => router.push('/log-workout')}
                activeOpacity={0.7}
              >
                <Ionicons name="barbell-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.miniEmptyText}>No workouts yet — tap to log one</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              workouts.map((w) => <WorkoutCard key={w.id} workout={w} />)
            )}

            {/* ── Meals section ──────────────────────── */}
            <Text style={[styles.sectionLabel, styles.sectionGap]}>MEALS</Text>
            {meals.length === 0 ? (
              <TouchableOpacity
                style={styles.miniEmpty}
                onPress={() => router.push('/log-meal')}
                activeOpacity={0.7}
              >
                <Ionicons name="restaurant-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.miniEmptyText}>No meals logged yet — tap to log one</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              meals.map((m) => <MealCard key={m.id} meal={m} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['5xl'],
  },

  // Header
  pageHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
    backgroundColor: colors.backgroundPrimary,
  },
  screenTitle: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
  },
  logBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 13,
  },
  logBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.backgroundPrimary,
  },

  // Section labels
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  sectionGap: { marginTop: spacing['2xl'] },

  loadingState: {
    paddingTop: spacing['5xl'],
    alignItems: 'center',
  },

  // Mini empty states (tappable rows)
  miniEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    marginBottom: spacing.base,
  },
  miniEmptyText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Shared card base
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDate: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cardSummary: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardDetails: { gap: 4 },
  detailRow: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  detailName: {
    fontFamily: fonts.sansMedium,
    color: colors.textPrimary,
  },
  detailMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardNotes: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },

  // Workout-specific
  effortBadge: {
    backgroundColor: 'rgba(216,255,62,0.12)',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  effortBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.5,
  },

  // Meal-specific
  mealBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  mealBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  mealBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
