import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../src/stores/authStore';
import { fetchRecentWorkouts, WorkoutLog } from '../src/services/workouts';
import { fetchRecentMeals, MealLog } from '../src/services/nutrition';
import { fetchWeightLogs, WeightLog } from '../src/services/weight';
import { NavButton } from '../src/components/NavButton';
import { DayDetailSheet } from '../src/components/DayDetailSheet';
import { MonthCalendar } from '../src/components/MonthCalendar';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

// ── Dot colors (matches progress.tsx legend) ──────────────────────────────────
const DOT_W  = '#d8ff3e';
const DOT_M  = '#f5a623';
const DOT_LB = '#7b9cff';

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Streak helpers ────────────────────────────────────────────────────────────

function calcStreaks(activeDates: Set<string>): { current: number; longest: number } {
  if (activeDates.size === 0) return { current: 0, longest: 0 };

  const sorted = [...activeDates].sort();

  // Longest ever
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i] + 'T12:00').getTime() - new Date(sorted[i - 1] + 'T12:00').getTime())
      / 86400000,
    );
    if (diff === 1) { run++; if (run > longest) longest = run; }
    else run = 1;
  }

  // Current (count backwards from today or yesterday)
  const today = isoToday();
  const yesterday = shiftDate(today, -1);
  const desc = [...sorted].reverse();
  let current = 0;
  if (desc[0] === today || desc[0] === yesterday) {
    let expected = desc[0];
    for (const d of desc) {
      if (d === expected) { current++; expected = shiftDate(expected, -1); }
      else break;
    }
  }

  return { current, longest };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ActivityDetailScreen() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();

  const [workouts,  setWorkouts]  = useState<WorkoutLog[]>([]);
  const [meals,     setMeals]     = useState<MealLog[]>([]);
  const [weights,   setWeights]   = useState<WeightLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      try {
        const [w, m, lb, kg] = await Promise.all([
          fetchRecentWorkouts(user.id, 2000),
          fetchRecentMeals(user.id, 2000),
          fetchWeightLogs(user.id, 'lbs', 3650),
          fetchWeightLogs(user.id, 'kg', 3650),
        ]);
        setWorkouts(w);
        setMeals(m);
        // Use whichever unit has more entries
        setWeights(lb.length >= kg.length ? lb : kg);
      } catch {}
      setLoading(false);
    })();
  }, [user?.id]);

  const today = isoToday();

  // Build activity sets
  const workoutDates = new Set(workouts.map((w) => w.date));
  const mealDates    = new Set(meals.map((m) => m.date));
  const weightDates  = new Set(weights.map((w) => w.date));
  const activeDates  = new Set([...workoutDates, ...mealDates, ...weightDates]);

  // Streaks
  const { current: currentStreak, longest: longestStreak } = calcStreaks(activeDates);

  // Calendar: oldest logged date caps scrollback; pageWidth matches card inner width
  const sorted     = [...activeDates].sort();
  const oldestDate = sorted[0] ?? today;
  const pageWidth  = width - spacing.xl * 2 - spacing.base * 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <NavButton direction="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Lifetime totals ─────────────────────── */}
          <Text style={styles.sectionLabel}>LIFETIME TOTALS</Text>
          <View style={styles.statsCard}>
            {[
              { value: workouts.length, label: 'workouts' },
              { value: meals.length,    label: 'meals logged' },
              { value: weights.length,  label: 'weight\ncheck-ins' },
            ].map((s) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Streaks ─────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>ACTIVE DAYS STREAK</Text>
          <View style={styles.statsCard}>
            {[
              { value: currentStreak, label: 'current streak' },
              { value: longestStreak, label: 'longest ever' },
            ].map((s) => (
              <View key={s.label} style={styles.statCellWide}>
                <Text style={styles.statValueLarge}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Calendar ─────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>CALENDAR</Text>

          {/* Legend */}
          <View style={styles.legend}>
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

          <View style={styles.calCard}>
            <MonthCalendar
              pageWidth={pageWidth}
              workoutDates={workoutDates}
              mealDates={mealDates}
              weightDates={weightDates}
              oldestDate={oldestDate}
              today={today}
              onDayPress={setSelectedDate}
            />
          </View>
        </ScrollView>
      )}

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.sansBold, fontSize: 15, color: colors.textPrimary },
  headerSpacer: { width: 44 },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
  },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  sectionGap: { marginTop: spacing['2xl'] },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statCellWide: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 28,
    color: colors.accent,
    lineHeight: 32,
  },
  statValueLarge: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 36,
    color: colors.accent,
    lineHeight: 40,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: fonts.mono, fontSize: 9, color: colors.textSecondary, letterSpacing: 0.5 },

  // Calendar
  calCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
  },

});
