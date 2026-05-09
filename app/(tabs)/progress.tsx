import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../src/stores/authStore';
import { fetchRecentWorkouts, formatWorkoutDate, WorkoutLog,
         updateWorkoutLog, deleteWorkoutLog } from '../../src/services/workouts';
import { fetchRecentMeals, formatMealDate, MealLog,
         deleteMealLog } from '../../src/services/nutrition';
import { fetchWeightLogs, deleteWeightLog, WeightLog } from '../../src/services/weight';
import { LogEditModal } from '../../src/components/LogEditModal';
import { WorkoutEditFields, WorkoutDraft } from '../../src/components/editModals/WorkoutEditFields';
import { WeightChart } from '../../src/components/WeightChart';
import { fetchWeekSteps, DailySteps } from '../../src/services/health';
import { DayDetailSheet } from '../../src/components/DayDetailSheet';
import { WeekStrip } from '../../src/components/progress/WeekStrip';
import { StepsRing } from '../../src/components/progress/StepsRing';
import { ActiveDaysRing } from '../../src/components/progress/ActiveDaysRing';
import { WeightDeltaTile } from '../../src/components/progress/WeightDeltaTile';
import { RecentActivityFeed } from '../../src/components/progress/RecentActivityFeed';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

// ── Tunable defaults — TODO override from coach_memory once schema gains
//    structured target fields (currently coach_memory is free-form text). ───
const STEP_GOAL = 8000;

// ── Steps bar chart — single-hue chartreuse, opacity scales with % of goal ──
function StepsChart({ weekSteps, today }: { weekSteps: DailySteps[]; today: string }) {
  const maxSteps = Math.max(...weekSteps.map((d) => d.steps), STEP_GOAL);

  return (
    <View style={styles.stepsChartWrap}>
      {weekSteps.map(({ date, steps }) => {
        const isToday = date === today;
        const barPct = Math.max(steps / maxSteps, steps > 0 ? 0.02 : 0);
        const dayName = new Date(date + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' });
        const label = steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps > 0 ? String(steps) : '';
        const goalPct = STEP_GOAL / maxSteps;

        // Continuous opacity ramp: 0.5 at 0% of goal → 1.0 at 100%+ of goal.
        const goalRatio = STEP_GOAL > 0 ? steps / STEP_GOAL : 0;
        const opacity = Math.max(0.5, Math.min(1, 0.5 + 0.5 * goalRatio));
        const barColor = `rgba(216, 255, 62, ${opacity})`;

        return (
          <View key={date} style={styles.stepsCol}>
            <Text style={styles.stepsBarCount}>{label}</Text>
            <View style={styles.stepsBarTrack}>
              <View style={[styles.stepsGoalLine, { bottom: `${goalPct * 100}%` as any }]} />
              <View
                style={[
                  styles.stepsBar,
                  { height: `${barPct * 100}%` as any, backgroundColor: barColor },
                  isToday && styles.stepsBarTodayBorder,
                ]}
              />
            </View>
            <Text style={[styles.stepsBarDay, isToday && styles.stepsBarDayToday]}>{dayName}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();

  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [weekSteps, setWeekSteps] = useState<DailySteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutDraft>({ exercises: [], perceived_effort: null, notes: '', date: '' });
  const [savingWorkout, setSavingWorkout] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const workoutDates = new Set(workouts.map((w) => w.date));
  const mealDates = new Set(meals.map((m) => m.date));
  const weightDates = new Set(weights.map((w) => w.date));

  const loadData = useCallback(() => {
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
  }, [user?.id]);

  useFocusEffect(loadData);

  const openWorkoutEdit = (w: WorkoutLog) => {
    setWorkoutDraft({
      exercises: w.exercises,
      perceived_effort: w.perceived_effort,
      notes: w.notes ?? '',
      date: w.date,
    });
    setEditingWorkout(w);
  };

  const handleWorkoutSave = async () => {
    if (!editingWorkout) return;
    setSavingWorkout(true);
    try {
      await updateWorkoutLog(
        editingWorkout.id,
        workoutDraft.exercises,
        workoutDraft.perceived_effort,
        workoutDraft.notes || null,
        workoutDraft.date,
      );
      setEditingWorkout(null);
      loadData();
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSavingWorkout(false);
    }
  };

  const handleWorkoutDelete = async () => {
    if (!editingWorkout) return;
    setSavingWorkout(true);
    try {
      await deleteWorkoutLog(editingWorkout.id);
      setEditingWorkout(null);
      loadData();
    } catch {
      Alert.alert('Could not delete', 'Try again.');
      setSavingWorkout(false);
    }
  };

  const confirmDeleteWorkout = (w: WorkoutLog) =>
    Alert.alert('Delete this workout?', formatWorkoutDate(w.date), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteWorkoutLog(w.id); loadData(); }
        catch { Alert.alert('Could not delete', 'Try again.'); }
      }},
    ]);

  const confirmDeleteMeal = (m: MealLog) =>
    Alert.alert('Delete this meal?', formatMealDate(m.date), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteMealLog(m.id); loadData(); }
        catch { Alert.alert('Could not delete', 'Try again.'); }
      }},
    ]);

  const confirmDeleteWeight = (w: WeightLog) => {
    const dateLabel = new Date(w.date + 'T12:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    Alert.alert('Delete this entry?', `${dateLabel} · ${w.value} ${w.unit}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteWeightLog(w.id); loadData(); }
        catch { Alert.alert('Could not delete', 'Try again.'); }
      }},
    ]);
  };

  // ── Metrics derived from current data ─────────────────────────────────
  const todaySteps = (() => {
    const d = weekSteps.find((s) => s.date === today);
    return d ? d.steps : null;
  })();

  const thisWeekStartIso = (() => {
    // Sunday of this week, computed in local time to match WeekStrip's
    // sundayOfWeek() helper (avoids UTC-shift bugs near midnight).
    const d = new Date(today + 'T12:00');
    d.setDate(d.getDate() - d.getDay());
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  // Active-days count: unique dates this week (Sun→Sat) with ≥1 log of any
  // type (workout / meal / weight). Coach chat does not count.
  const activeDaysCount = (() => {
    const days = new Set<string>();
    for (const w of workouts) if (w.date >= thisWeekStartIso) days.add(w.date);
    for (const m of meals) if (m.date >= thisWeekStartIso) days.add(m.date);
    for (const w of weights) if (w.date >= thisWeekStartIso) days.add(w.date);
    return days.size;
  })();

  const stepsWeekTotal = weekSteps.reduce((s, d) => s + d.steps, 0);

  const currentWeight = weights.length > 0 ? weights[weights.length - 1] : null;

  const chartWidth = width - spacing.xl * 2 - spacing.base * 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Fixed header ─────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text style={styles.screenTitle}>Progress</Text>
        <View style={styles.logBtns}>
          {[
            { label: 'Workout', icon: 'barbell-outline', route: '/log-workout' },
            { label: 'Meal', icon: 'restaurant-outline', route: '/log-meal' },
            { label: 'Weight', icon: 'scale-outline', route: '/log-weight' },
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
            {/* ── Week strip ─────────────────────────── */}
            <WeekStrip
              workoutDates={workoutDates}
              mealDates={mealDates}
              weightDates={weightDates}
              today={today}
              onDayPress={setSelectedDate}
            />

            {/* ── Metrics strip — 3 slots, all tappable ── */}
            <View style={styles.metricsRow}>
              <TouchableOpacity
                style={styles.metricsSlot}
                onPress={() => router.push('/steps-detail' as any)}
                activeOpacity={0.7}
              >
                <StepsRing steps={todaySteps} goal={STEP_GOAL} />
              </TouchableOpacity>
              <View style={styles.metricsSlot}>
                <ActiveDaysRing count={activeDaysCount} />
              </View>
              <TouchableOpacity
                style={styles.metricsSlot}
                onPress={() => router.push('/weight-detail' as any)}
                activeOpacity={0.7}
              >
                <WeightDeltaTile weights={weights} />
              </TouchableOpacity>
            </View>

            {/* ── Steps chart — tap to drill into steps detail ── */}
            {weekSteps.some((d) => d.steps > 0) && (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push('/steps-detail' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.chartHeaderRow}>
                  <View>
                    <Text style={styles.bigNum}>{stepsWeekTotal.toLocaleString()}</Text>
                    <Text style={styles.bigNumLabel}>WEEKLY TOTAL · STEPS</Text>
                  </View>
                </View>
                <StepsChart weekSteps={weekSteps} today={today} />
                <Text style={styles.stepsGoalNote}>Dashed line = {STEP_GOAL.toLocaleString()} step goal</Text>
              </TouchableOpacity>
            )}

            {/* ── Weight chart — no goal in coach_memory schema yet, so the
                  weight-progress ring is hidden in v1 per spec. ─────────── */}
            {weights.length > 0 && currentWeight && (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push('/weight-detail' as any)}
                activeOpacity={0.85}
              >
                <View style={styles.chartHeaderRow}>
                  <View>
                    <Text style={styles.bigNum}>{currentWeight.value} {currentWeight.unit}</Text>
                    <Text style={styles.bigNumLabel}>CURRENT</Text>
                  </View>
                </View>
                <WeightChart logs={weights} width={chartWidth} />
                <View style={styles.cardChevronRow}>
                  <Text style={styles.cardChevronLabel}>View details</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            )}

            {/* ── Recent activity (merged feed) ─────── */}
            <Text style={[styles.sectionLabel, styles.sectionGap]}>RECENT ACTIVITY</Text>
            <RecentActivityFeed
              workouts={workouts}
              meals={meals}
              weights={weights}
              limit={15}
              onWorkoutPress={openWorkoutEdit}
              onWorkoutLongPress={confirmDeleteWorkout}
              onMealPress={(m) => router.push({ pathname: '/meal-detail' as any, params: { id: m.id } })}
              onMealLongPress={confirmDeleteMeal}
              onWeightPress={() => router.push('/weight-detail' as any)}
              onWeightLongPress={confirmDeleteWeight}
            />
          </>
        )}
      </ScrollView>

      <LogEditModal
        visible={editingWorkout != null}
        title="Edit Workout"
        saving={savingWorkout}
        onCancel={() => setEditingWorkout(null)}
        onSave={handleWorkoutSave}
        onDelete={handleWorkoutDelete}
      >
        <WorkoutEditFields draft={workoutDraft} onChange={setWorkoutDraft} />
      </LogEditModal>

      {selectedDate != null && (
        <DayDetailSheet
          date={selectedDate}
          workouts={workouts}
          meals={meals}
          weights={weights}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  scroll: { flex: 1 },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.lg,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  screenTitle: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
  },
  logBtns: { flexDirection: 'row', gap: spacing.sm },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  logBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.backgroundPrimary,
    letterSpacing: 0.3,
  },

  loadingState: { paddingTop: spacing['5xl'], alignItems: 'center' },

  // Metrics strip
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  metricsSlot: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
  },

  // Section labels
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    paddingHorizontal: spacing.xl,
  },
  sectionGap: { marginTop: spacing.sm },

  // Cards
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginHorizontal: spacing.xl,
    gap: spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigNum: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  bigNumLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  cardChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  cardChevronLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Steps chart
  stepsChartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 130,
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
    backgroundColor: 'rgba(244, 241, 234, 0.4)',
    borderStyle: 'dashed',
  },
  stepsBar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 2,
  },
  stepsBarTodayBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.accent,
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
  },
});
