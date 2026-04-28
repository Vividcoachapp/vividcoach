import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../src/stores/authStore';
import { fetchRecentWorkouts, formatWorkoutDate, exerciseMeta, WorkoutLog } from '../../src/services/workouts';
import { fetchRecentMeals, formatMealDate, mealTypeFromDescription, MealLog } from '../../src/services/nutrition';
import { fetchWeightLogs, WeightLog } from '../../src/services/weight';
import { WeightChart } from '../../src/components/WeightChart';
import { fetchWeekSteps, DailySteps } from '../../src/services/health';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

// ── Calendar strip ────────────────────────────────────────────────────────────
const DOT_W = '#d8ff3e';   // workout
const DOT_M = '#f5a623';   // meal
const DOT_LB = '#7b9cff';  // weight

function CalendarStrip({
  workouts, meals, weights,
}: { workouts: WorkoutLog[]; meals: MealLog[]; weights: WeightLog[] }) {
  const calRef = useRef<ScrollView>(null);
  const today = new Date().toISOString().slice(0, 10);
  const DAYS = 28;

  const dates = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });

  const workoutDates = new Set(workouts.map((w) => w.date));
  const mealDates    = new Set(meals.map((m) => m.date));
  const weightDates  = new Set(weights.map((w) => w.date));

  return (
    <ScrollView
      ref={calRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={() => calRef.current?.scrollToEnd({ animated: false })}
    >
      {dates.map((date) => {
        const isToday = date === today;
        const d = new Date(date + 'T12:00');
        const dayNum = d.getDate();
        const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
        const hasW  = workoutDates.has(date);
        const hasM  = mealDates.has(date);
        const hasLb = weightDates.has(date);
        const active = hasW || hasM || hasLb;

        return (
          <View key={date} style={[styles.dayCell, isToday && styles.dayCellToday]}>
            <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dayNum}</Text>
            <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{dayName}</Text>
            <View style={styles.dayDots}>
              {active ? (
                <>
                  {hasW  && <View style={[styles.dot, { backgroundColor: DOT_W }]} />}
                  {hasM  && <View style={[styles.dot, { backgroundColor: DOT_M }]} />}
                  {hasLb && <View style={[styles.dot, { backgroundColor: DOT_LB }]} />}
                </>
              ) : (
                <View style={[styles.dot, styles.dotEmpty]} />
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Weekly summary ────────────────────────────────────────────────────────────
function WeeklySummary({
  workouts, meals, weights,
}: { workouts: WorkoutLog[]; meals: MealLog[]; weights: WeightLog[] }) {
  const cutoff = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const wkWorkouts = workouts.filter((w) => w.date >= cutoff);
  const wkMeals    = meals.filter((m) => m.date >= cutoff);
  const wkWeights  = weights.filter((w) => w.date >= cutoff);

  const activeDates = new Set([
    ...wkWorkouts.map((w) => w.date),
    ...wkMeals.map((m) => m.date),
    ...wkWeights.map((w) => w.date),
  ]);

  const avgWeight = wkWeights.length > 0
    ? (wkWeights.reduce((s, w) => s + w.value, 0) / wkWeights.length).toFixed(1)
    : null;
  const unit = wkWeights[0]?.unit ?? 'lbs';

  const stats = [
    { value: String(wkWorkouts.length), label: 'workouts' },
    { value: String(wkMeals.length),    label: 'meals logged' },
    { value: avgWeight ?? '—',          label: `avg ${unit}` },
    { value: `${activeDates.size}/7`,   label: 'active days' },
  ];

  return (
    <View style={styles.summaryRow}>
      {stats.map((s, i) => (
        <View key={i} style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{s.value}</Text>
          <Text style={styles.summaryLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

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
  breakfast: '#f5a623', lunch: '#7ed321', dinner: '#9b59b6', snack: '#4a90e2',
};

function MealCard({ meal }: { meal: MealLog }) {
  const mealType = mealTypeFromDescription(meal.meal_description);
  const colonIdx = meal.meal_description.indexOf(':');
  const bodyText = colonIdx !== -1 ? meal.meal_description.slice(colonIdx + 1).trim() : meal.meal_description;
  const badgeColor = MEAL_COLORS[mealType] ?? colors.textSecondary;
  const hasMacros = meal.calories_kcal != null;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardDate}>{formatMealDate(meal.date)}</Text>
        <View style={[styles.mealBadge, { borderColor: badgeColor + '55', backgroundColor: badgeColor + '18' }]}>
          <Text style={[styles.mealBadgeText, { color: badgeColor }]}>{mealType.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.mealBody} numberOfLines={3}>{bodyText}</Text>
      {hasMacros && (
        <View style={styles.mealMacroRow}>
          <Text style={styles.mealMacroItem}>~{meal.calories_kcal} kcal</Text>
          <Text style={styles.mealMacroDot}>·</Text>
          <Text style={styles.mealMacroItem}>{Math.round(meal.protein_g ?? 0)}g protein</Text>
          <Text style={styles.mealMacroDot}>·</Text>
          <Text style={styles.mealMacroItem}>{Math.round(meal.carbs_g ?? 0)}g carbs</Text>
          <Text style={styles.mealMacroDot}>·</Text>
          <Text style={styles.mealMacroItem}>{Math.round(meal.fat_g ?? 0)}g fat</Text>
        </View>
      )}
      {meal.notes ? <Text style={styles.cardNotes} numberOfLines={2}>{meal.notes}</Text> : null}
    </View>
  );
}

// ── Steps bar chart ───────────────────────────────────────────────────────────
const STEP_GOAL = 10000;

function StepsChart({ weekSteps }: { weekSteps: DailySteps[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const maxSteps = Math.max(...weekSteps.map((d) => d.steps), STEP_GOAL);

  return (
    <View style={styles.stepsChartWrap}>
      {weekSteps.map(({ date, steps }) => {
        const isToday = date === today;
        const barPct  = Math.max(steps / maxSteps, steps > 0 ? 0.02 : 0);
        const dayName = new Date(date + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' });
        const label   = steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps > 0 ? String(steps) : '';
        const goalPct = STEP_GOAL / maxSteps;

        return (
          <View key={date} style={styles.stepsCol}>
            <Text style={styles.stepsBarCount}>{label}</Text>
            <View style={styles.stepsBarTrack}>
              {/* Goal line */}
              <View style={[styles.stepsGoalLine, { bottom: `${goalPct * 100}%` as any }]} />
              <View style={[
                styles.stepsBar,
                { height: `${barPct * 100}%` as any },
                isToday && styles.stepsBarToday,
              ]} />
            </View>
            <Text style={[styles.stepsBarDay, isToday && styles.stepsBarDayToday]}>{dayName}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();

  const [workouts,  setWorkouts]  = useState<WorkoutLog[]>([]);
  const [meals,     setMeals]     = useState<MealLog[]>([]);
  const [weights,   setWeights]   = useState<WeightLog[]>([]);
  const [weekSteps, setWeekSteps] = useState<DailySteps[]>([]);
  const [loading,   setLoading]   = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) { setLoading(false); return; }
      setLoading(true);
      Promise.all([
        fetchRecentWorkouts(user.id, 30),
        fetchRecentMeals(user.id, 30),
        fetchWeightLogs(user.id, 'lbs', 90).then((r) =>
          r.length > 0 ? r : fetchWeightLogs(user.id, 'kg', 90),
        ),
        fetchWeekSteps(),
      ])
        .then(([w, m, lb, steps]) => {
          setWorkouts(w); setMeals(m); setWeights(lb); setWeekSteps(steps);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user?.id]),
  );

  // Weight trend badge
  const trend = (() => {
    if (weights.length < 2) return null;
    const diff = weights[weights.length - 1].value - weights[0].value;
    const unit = weights[0].unit;
    if (Math.abs(diff) < 0.5) return { label: 'Stable', color: colors.textSecondary };
    return diff < 0
      ? { label: `↓ ${Math.abs(diff).toFixed(1)} ${unit}`, color: colors.accent }
      : { label: `↑ ${Math.abs(diff).toFixed(1)} ${unit}`, color: colors.warmAccent };
  })();

  const chartWidth = width - 2 * 24 - 2 * 16; // screen pad + card pad

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Fixed header ─────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text style={styles.screenTitle}>Progress</Text>
        <View style={styles.logBtns}>
          {[
            { label: 'Workout', icon: 'barbell-outline',    route: '/log-workout' },
            { label: 'Meal',    icon: 'restaurant-outline', route: '/log-meal'    },
            { label: 'Weight',  icon: 'scale-outline',      route: '/log-weight'  },
          ].map(({ label, icon, route }) => (
            <TouchableOpacity
              key={label}
              style={styles.logBtn}
              onPress={() => router.push(route as '/log-workout')}
              activeOpacity={0.85}
            >
              <Ionicons name={icon as 'barbell-outline'} size={13} color={colors.backgroundPrimary} />
              <Text style={styles.logBtnText}>{label}</Text>
            </TouchableOpacity>
          ))}
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
            {/* ── Weekly summary ──────────────────────── */}
            <Text style={styles.sectionLabel}>THIS WEEK</Text>
            <View style={styles.card}>
              <WeeklySummary workouts={workouts} meals={meals} weights={weights} />
            </View>

            {/* ── Calendar strip ──────────────────────── */}
            <Text style={[styles.sectionLabel, styles.sectionGap]}>ACTIVITY</Text>
            <View style={[styles.card, styles.calCard]}>
              <CalendarStrip workouts={workouts} meals={meals} weights={weights} />
              <View style={styles.calLegend}>
                {[
                  { color: DOT_W,  label: 'Workout' },
                  { color: DOT_M,  label: 'Meal' },
                  { color: DOT_LB, label: 'Weight' },
                ].map(({ color, label }) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Steps chart ─────────────────────────── */}
            {weekSteps.some((d) => d.steps > 0) && (
              <>
                <Text style={[styles.sectionLabel, styles.sectionGap]}>STEPS</Text>
                <View style={styles.card}>
                  <StepsChart weekSteps={weekSteps} />
                  <Text style={styles.stepsGoalNote}>Dashed line = 10,000 step goal</Text>
                </View>
              </>
            )}

            {/* ── Weight chart ────────────────────────── */}
            {weights.length > 0 && (
              <>
                <View style={[styles.sectionGap, styles.sectionRow]}>
                  <Text style={styles.sectionLabel}>WEIGHT</Text>
                  {trend && (
                    <View style={[styles.trendBadge, { borderColor: trend.color + '55', backgroundColor: trend.color + '18' }]}>
                      <Text style={[styles.trendText, { color: trend.color }]}>{trend.label}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.card}>
                  <WeightChart logs={weights} width={chartWidth} />
                </View>
              </>
            )}

            {/* ── Workouts ────────────────────────────── */}
            <Text style={[styles.sectionLabel, styles.sectionGap]}>WORKOUTS</Text>
            {workouts.length === 0 ? (
              <TouchableOpacity style={styles.miniEmpty} onPress={() => router.push('/log-workout')} activeOpacity={0.7}>
                <Ionicons name="barbell-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.miniEmptyText}>No workouts yet — tap to log one</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              workouts.slice(0, 5).map((w) => <WorkoutCard key={w.id} workout={w} />)
            )}

            {/* ── Meals ───────────────────────────────── */}
            <Text style={[styles.sectionLabel, styles.sectionGap]}>MEALS</Text>

            {/* Today's macro totals — only shown when macro data exists */}
            {(() => {
              const today = new Date().toISOString().slice(0, 10);
              const todayTracked = meals.filter((m) => m.date === today && m.calories_kcal != null);
              if (todayTracked.length === 0) return null;
              const totCal  = todayTracked.reduce((s, m) => s + (m.calories_kcal ?? 0), 0);
              const totProt = todayTracked.reduce((s, m) => s + (m.protein_g ?? 0), 0);
              const totCarb = todayTracked.reduce((s, m) => s + (m.carbs_g ?? 0), 0);
              const totFat  = todayTracked.reduce((s, m) => s + (m.fat_g ?? 0), 0);
              return (
                <View style={styles.todayMacroCard}>
                  <Text style={styles.todayMacroHeading}>TODAY'S TOTALS · APPROXIMATE</Text>
                  <View style={styles.todayMacroRow}>
                    {[
                      { v: totCal,              label: 'kcal'    },
                      { v: Math.round(totProt), label: 'protein' },
                      { v: Math.round(totCarb), label: 'carbs'   },
                      { v: Math.round(totFat),  label: 'fat'     },
                    ].map(({ v, label }) => (
                      <View key={label} style={styles.todayMacroCell}>
                        <Text style={styles.todayMacroValue}>{v}</Text>
                        <Text style={styles.todayMacroLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {meals.length === 0 ? (
              <TouchableOpacity style={styles.miniEmpty} onPress={() => router.push('/log-meal')} activeOpacity={0.7}>
                <Ionicons name="restaurant-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.miniEmptyText}>No meals logged yet — tap to log one</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              meals.slice(0, 7).map((m) => <MealCard key={m.id} meal={m} />)
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
  logBtns: { flexDirection: 'row', gap: spacing.sm },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 11,
  },
  logBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  loadingState: { paddingTop: spacing['5xl'], alignItems: 'center' },

  // Shared card
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.base,
  },

  // Weekly summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 24,
    color: colors.accent,
    lineHeight: 28,
  },
  summaryLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Calendar
  calCard: { gap: spacing.md, paddingBottom: spacing.md },
  dayCell: {
    width: 40,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  dayCellToday: {
    backgroundColor: 'rgba(216,255,62,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.3)',
  },
  dayNum: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.textSecondary },
  dayNumToday: { color: colors.accent },
  dayName: { fontFamily: fonts.mono, fontSize: 8, color: colors.textSecondary, letterSpacing: 0.5 },
  dayNameToday: { color: colors.accent },
  dayDots: { flexDirection: 'row', gap: 3, minHeight: 8, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotEmpty: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },

  calLegend: { flexDirection: 'row', gap: spacing.base, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: fonts.mono, fontSize: 9, color: colors.textSecondary, letterSpacing: 0.5 },

  // Trend badge
  trendBadge: {
    borderRadius: radii.full, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: 3,
  },
  trendText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.5 },

  // Steps chart
  stepsChartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 110,
    paddingBottom: spacing.xs,
  },
  stepsCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  stepsBarCount: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  stepsBarTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'visible',
    position: 'relative',
  },
  stepsGoalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(216,255,62,0.35)',
    borderStyle: 'dashed',
  },
  stepsBar: {
    width: '100%',
    backgroundColor: 'rgba(216,255,62,0.35)',
    borderRadius: 3,
    minHeight: 2,
  },
  stepsBarToday: {
    backgroundColor: colors.accent,
  },
  stepsBarDay: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  stepsBarDayToday: { color: colors.accent },
  stepsGoalNote: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },

  // Mini empty states
  miniEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.backgroundSecondary, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.base, paddingVertical: spacing.base,
    marginBottom: spacing.base,
  },
  miniEmptyText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },

  // Workout card
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textPrimary },
  cardSummary: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  cardDetails: { gap: 4 },
  detailRow: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20 },
  detailName: { fontFamily: fonts.sansMedium, color: colors.textPrimary },
  detailMeta: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary },
  cardNotes: {
    fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary,
    lineHeight: 19, fontStyle: 'italic',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, marginTop: spacing.xs,
  },
  effortBadge: {
    backgroundColor: 'rgba(216,255,62,0.12)', borderRadius: radii.full,
    borderWidth: 1, borderColor: 'rgba(216,255,62,0.3)',
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  effortBadgeText: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent, letterSpacing: 0.5 },

  // Today's macro totals
  todayMacroCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.25)',
    padding: spacing.base,
    marginBottom: spacing.base,
    gap: spacing.md,
  },
  todayMacroHeading: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  todayMacroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  todayMacroCell: { flex: 1, alignItems: 'center', gap: 3 },
  todayMacroValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  todayMacroLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Meal card macros
  mealMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  mealMacroItem: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.3,
  },
  mealMacroDot: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Meal card
  mealBadge: { borderRadius: radii.full, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  mealBadgeText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  mealBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
});
