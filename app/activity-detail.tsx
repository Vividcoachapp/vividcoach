import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../src/stores/authStore';
import { fetchRecentWorkouts, WorkoutLog, exerciseMeta } from '../src/services/workouts';
import { fetchRecentMeals, MealLog, mealTypeFromDescription } from '../src/services/nutrition';
import { fetchWeightLogs, WeightLog } from '../src/services/weight';
import { NavButton } from '../src/components/NavButton';
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

function monthLabel(iso: string): string {
  return new Date(iso + 'T12:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function friendlyDate(iso: string): string {
  const today = isoToday();
  const yesterday = shiftDate(today, -1);
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return new Date(iso + 'T12:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
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

// ── Calendar grid builder ─────────────────────────────────────────────────────

interface CalRow {
  dates: (string | null)[];
  monthHeader?: string; // month label to render above this row
}

function buildCalendar(earliest: string, today: string): CalRow[] {
  // Pad start to the Sunday on or before earliest
  const startDate = new Date(earliest + 'T12:00');
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Pad end to the Saturday on or after today
  const endDate = new Date(today + 'T12:00');
  const endDow = endDate.getDay();
  if (endDow < 6) endDate.setDate(endDate.getDate() + (6 - endDow));

  const rows: CalRow[] = [];
  const cursor = new Date(startDate);
  let lastMonth = '';

  while (cursor <= endDate) {
    const week: (string | null)[] = [];
    let rowMonth: string | undefined;

    for (let i = 0; i < 7; i++) {
      const iso = cursor.toISOString().slice(0, 10);
      const inRange = iso >= earliest && iso <= today;
      week.push(inRange ? iso : null);

      if (inRange) {
        const m = monthLabel(iso);
        if (m !== lastMonth) { rowMonth = m; lastMonth = m; }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    rows.push({ dates: week, monthHeader: rowMonth });
  }

  return rows;
}

// ── Day detail modal ──────────────────────────────────────────────────────────

function DayDetailModal({
  date,
  workouts,
  meals,
  weights,
  onClose,
}: {
  date: string;
  workouts: WorkoutLog[];
  meals: MealLog[];
  weights: WeightLog[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const dayWorkouts = workouts.filter((w) => w.date === date);
  const dayMeals    = meals.filter((m) => m.date === date);
  const dayWeights  = weights.filter((w) => w.date === date);
  const isEmpty     = dayWorkouts.length === 0 && dayMeals.length === 0 && dayWeights.length === 0;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetPill} />
          <Text style={styles.sheetDate}>{friendlyDate(date)}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.sheetClose}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {isEmpty && (
            <Text style={styles.sheetEmpty}>Nothing logged on this day.</Text>
          )}

          {dayWorkouts.length > 0 && (
            <View style={styles.sheetSection}>
              <View style={styles.sheetSectionHeader}>
                <View style={[styles.sheetDot, { backgroundColor: DOT_W }]} />
                <Text style={styles.sheetSectionLabel}>WORKOUT</Text>
              </View>
              {dayWorkouts.map((w) => (
                <View key={w.id} style={styles.sheetItem}>
                  {w.exercises.map((e, i) => {
                    const meta = exerciseMeta(e);
                    return (
                      <Text key={i} style={styles.sheetItemText}>
                        <Text style={styles.sheetItemName}>{e.name}</Text>
                        {meta ? <Text style={styles.sheetItemMeta}>{'  '}{meta}</Text> : null}
                      </Text>
                    );
                  })}
                  {w.perceived_effort != null && (
                    <Text style={styles.sheetEffort}>Effort {w.perceived_effort}/10</Text>
                  )}
                  {w.notes ? <Text style={styles.sheetNotes}>{w.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {dayMeals.length > 0 && (
            <View style={styles.sheetSection}>
              <View style={styles.sheetSectionHeader}>
                <View style={[styles.sheetDot, { backgroundColor: DOT_M }]} />
                <Text style={styles.sheetSectionLabel}>MEALS</Text>
              </View>
              {dayMeals.map((m) => {
                const colonIdx = m.meal_description.indexOf(':');
                const body = colonIdx !== -1 ? m.meal_description.slice(colonIdx + 1).trim() : m.meal_description;
                const type = mealTypeFromDescription(m.meal_description).toUpperCase();
                return (
                  <View key={m.id} style={styles.sheetItem}>
                    <Text style={styles.sheetMealType}>{type}</Text>
                    <Text style={styles.sheetItemText}>{body}</Text>
                    {m.calories_kcal != null && (
                      <Text style={styles.sheetMacros}>
                        ~{m.calories_kcal} kcal · {Math.round(m.protein_g ?? 0)}g protein
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {dayWeights.length > 0 && (
            <View style={styles.sheetSection}>
              <View style={styles.sheetSectionHeader}>
                <View style={[styles.sheetDot, { backgroundColor: DOT_LB }]} />
                <Text style={styles.sheetSectionLabel}>WEIGHT</Text>
              </View>
              {dayWeights.map((w) => (
                <Text key={w.id} style={styles.sheetItemText}>
                  {w.value} {w.unit}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

  // Calendar range: earliest logged date or 90 days ago, whichever is older
  const ninetyDaysAgo = shiftDate(today, -90);
  const sorted = [...activeDates].sort();
  const earliest = sorted.length > 0 && sorted[0] < ninetyDaysAgo ? sorted[0] : ninetyDaysAgo;
  const calRows = loading ? [] : buildCalendar(earliest, today);

  // Cell sizing: 7 columns, 8px horizontal padding each side inside the card
  const cardPad   = spacing.base;
  const outerPad  = spacing.xl;
  const cellSize  = Math.floor((width - outerPad * 2 - cardPad * 2) / 7);

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
            {/* Day-of-week header */}
            <View style={styles.dowRow}>
              {DAY_NAMES.map((d, i) => (
                <View key={i} style={[styles.cell, { width: cellSize }]}>
                  <Text style={styles.dowLabel}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Weeks */}
            {calRows.map((row, ri) => (
              <View key={ri}>
                {row.monthHeader != null && (
                  <Text style={styles.monthLabel}>{row.monthHeader}</Text>
                )}
                <View style={styles.weekRow}>
                  {row.dates.map((date, ci) => {
                    if (!date) {
                      return <View key={ci} style={[styles.cell, { width: cellSize }]} />;
                    }
                    const isToday  = date === today;
                    const hasW     = workoutDates.has(date);
                    const hasM     = mealDates.has(date);
                    const hasLb    = weightDates.has(date);
                    const active   = hasW || hasM || hasLb;
                    const dayNum   = new Date(date + 'T12:00').getDate();

                    return (
                      <TouchableOpacity
                        key={ci}
                        style={[styles.cell, { width: cellSize }, isToday && styles.cellToday]}
                        onPress={() => setSelectedDate(date)}
                        activeOpacity={0.65}
                      >
                        <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                          {dayNum}
                        </Text>
                        <View style={styles.dotRow}>
                          {active ? (
                            <>
                              {hasW  && <View style={[styles.dot, { backgroundColor: DOT_W }]} />}
                              {hasM  && <View style={[styles.dot, { backgroundColor: DOT_M }]} />}
                              {hasLb && <View style={[styles.dot, { backgroundColor: DOT_LB }]} />}
                            </>
                          ) : (
                            <View style={styles.dotEmpty} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Day detail modal */}
      {selectedDate != null && (
        <DayDetailModal
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
  dowRow: { flexDirection: 'row', marginBottom: 2 },
  dowLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  monthLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  weekRow: { flexDirection: 'row' },
  cell: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 6,
  },
  cellToday: {
    backgroundColor: 'rgba(216,255,62,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.35)',
  },
  dayNum: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textSecondary },
  dayNumToday: { color: colors.accent },
  dotRow: { flexDirection: 'row', gap: 2, minHeight: 7, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotEmpty: { width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: colors.border },

  // Modal / bottom sheet
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetPill: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    left: '50%',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginLeft: -18,
  },
  sheetDate: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sheetClose: { width: 32, alignItems: 'flex-end' },
  sheetScroll: { flexGrow: 0 },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.base,
  },
  sheetEmpty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  sheetSection: { gap: spacing.sm },
  sheetSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sheetDot: { width: 7, height: 7, borderRadius: 4 },
  sheetSectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  sheetItem: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: 4,
  },
  sheetItemText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  sheetItemName: { fontFamily: fonts.sansMedium, color: colors.textPrimary },
  sheetItemMeta: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary },
  sheetEffort: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent, letterSpacing: 0.5 },
  sheetNotes: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  sheetMealType: { fontFamily: fonts.mono, fontSize: 10, color: DOT_M, letterSpacing: 1 },
  sheetMacros: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent, letterSpacing: 0.3 },
});
