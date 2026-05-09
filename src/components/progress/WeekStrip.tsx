import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { fonts, spacing, radii } from '../../constants/theme';

const DOW_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // matches MonthCalendar (Sun-start)

const DOT_WORKOUT = colors.accent;       // chartreuse
const DOT_MEAL    = colors.textPrimary;  // off-white (cleaner against dark bg than coral)
const DOT_WEIGHT  = colors.warmAccent;   // coral

interface WeekStripProps {
  workoutDates: Set<string>;
  mealDates: Set<string>;
  weightDates: Set<string>;
  /** ISO YYYY-MM-DD of today. Used for the today highlight. */
  today: string;
  onDayPress: (date: string) => void;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Sunday of the week containing `dateStr`, returned as ISO date. */
function sundayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00');
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - dow);
  return ymd(d);
}

/** Build the 7 ISO dates of the week starting at `sundayIso`. */
function weekDates(sundayIso: string): string[] {
  const base = new Date(sundayIso + 'T12:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return ymd(d);
  });
}

function shiftWeek(sundayIso: string, weeks: number): string {
  const d = new Date(sundayIso + 'T12:00');
  d.setDate(d.getDate() + weeks * 7);
  return ymd(d);
}

function formatRange(sundayIso: string): string {
  const start = new Date(sundayIso + 'T12:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startMo = start.toLocaleDateString('en-US', { month: 'short' });
  const endMo = end.toLocaleDateString('en-US', { month: 'short' });
  if (startMo === endMo) return `${startMo} ${start.getDate()}–${end.getDate()}`;
  return `${startMo} ${start.getDate()} – ${endMo} ${end.getDate()}`;
}

export function WeekStrip({ workoutDates, mealDates, weightDates, today, onDayPress }: WeekStripProps) {
  const thisWeekStart = sundayOfWeek(today);
  const [weekStart, setWeekStart] = useState(thisWeekStart);

  const dates = weekDates(weekStart);
  const isCurrentWeek = weekStart === thisWeekStart;
  const canGoBack = true; // no hard cap; existing data fetch covers ~30 days
  const canGoForward = !isCurrentWeek;

  return (
    <View style={styles.wrap}>
      {/* Header: range + chevrons */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setWeekStart((s) => shiftWeek(s, -1))}
          disabled={!canGoBack}
          hitSlop={8}
          style={styles.chevronBtn}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-back" size={16} color={canGoBack ? colors.textPrimary : colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.rangeText}>{formatRange(weekStart)}</Text>

        <TouchableOpacity
          onPress={() => canGoForward && setWeekStart((s) => shiftWeek(s, 1))}
          disabled={!canGoForward}
          hitSlop={8}
          style={styles.chevronBtn}
          activeOpacity={0.6}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={canGoForward ? colors.textPrimary : 'rgba(244, 241, 234, 0.2)'}
          />
        </TouchableOpacity>
      </View>

      {/* 7 day cells */}
      <View style={styles.row}>
        {dates.map((iso, i) => {
          const dow = DOW_NAMES[i];
          const dayNum = parseInt(iso.slice(8, 10), 10);
          const isToday = iso === today;
          const hasW = workoutDates.has(iso);
          const hasM = mealDates.has(iso);
          const hasWt = weightDates.has(iso);

          return (
            <TouchableOpacity
              key={iso}
              style={[styles.cell, isToday && styles.cellToday]}
              onPress={() => onDayPress(iso)}
              activeOpacity={0.7}
            >
              <Text style={styles.dow}>{dow}</Text>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dayNum}</Text>
              <View style={styles.dotsRow}>
                {hasW && <View style={[styles.dot, { backgroundColor: DOT_WORKOUT }]} />}
                {hasM && <View style={[styles.dot, { backgroundColor: DOT_MEAL }]} />}
                {hasWt && <View style={[styles.dot, { backgroundColor: DOT_WEIGHT }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  chevronBtn: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  rangeText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellToday: {
    borderColor: colors.accent,
  },
  dow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  dayNum: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  dayNumToday: {
    color: colors.accent,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 4,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
