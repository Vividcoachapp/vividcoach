import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useRef, useEffect, useMemo } from 'react';
import { colors } from '../constants/colors';
import { fonts, spacing, radii } from '../constants/theme';

// ── Dot colors ────────────────────────────────────────────────────────────────
const DOT_W  = '#d8ff3e';
const DOT_M  = '#f5a623';
const DOT_LB = '#7b9cff';

const DOW_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthPage {
  year: number;
  month: number; // 0-11
}

interface DayCell {
  date: string;    // YYYY-MM-DD
  dayNum: number;
  inMonth: boolean;
}

export interface MonthCalendarProps {
  pageWidth: number;
  workoutDates: Set<string>;
  mealDates: Set<string>;
  weightDates: Set<string>;
  oldestDate: string; // cap; oldest month that can be swiped to
  today: string;
  onDayPress: (date: string) => void;
}

// ── Date helpers (no library, no timezone issues) ─────────────────────────────

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function buildMonthList(oldestDate: string, today: string): MonthPage[] {
  const oy = parseInt(oldestDate.slice(0, 4), 10);
  const om = parseInt(oldestDate.slice(5, 7), 10) - 1; // 0-indexed
  const ty = parseInt(today.slice(0, 4), 10);
  const tm = parseInt(today.slice(5, 7), 10) - 1;

  const pages: MonthPage[] = [];
  let y = oy, m = om;
  while (y < ty || (y === ty && m <= tm)) {
    pages.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return pages;
}

function buildCells(year: number, month: number): DayCell[] {
  const firstDow    = new Date(year, month, 1).getDay(); // 0=Sun
  const dim         = daysInMonth(year, month);
  const prevDim     = daysInMonth(year, month === 0 ? 11 : month - 1);
  const prevYear    = month === 0 ? year - 1 : year;
  const prevMonth   = month === 0 ? 11 : month - 1;
  const nextYear    = month === 11 ? year + 1 : year;
  const nextMonth   = month === 11 ? 0 : month + 1;

  const cells: DayCell[] = [];

  // Leading days from previous month
  for (let i = 0; i < firstDow; i++) {
    const d = prevDim - firstDow + 1 + i;
    cells.push({ date: ymd(prevYear, prevMonth, d), dayNum: d, inMonth: false });
  }

  // Days in this month
  for (let d = 1; d <= dim; d++) {
    cells.push({ date: ymd(year, month, d), dayNum: d, inMonth: true });
  }

  // Trailing days from next month (fill last row)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: ymd(nextYear, nextMonth, d), dayNum: d, inMonth: false });
  }

  return cells;
}

function monthName(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonthCalendar({
  pageWidth, workoutDates, mealDates, weightDates,
  oldestDate, today, onDayPress,
}: MonthCalendarProps) {
  const flatRef = useRef<FlatList<MonthPage>>(null);

  const cellW = Math.floor(pageWidth / 7);
  // Fixed height: month label + DOW header + 6 rows (tallest possible month grid)
  const DOW_H   = Math.round(cellW * 0.55);
  const LABEL_H = 28; // mono label + marginBottom
  const pageH   = LABEL_H + DOW_H + 6 * cellW;

  const pages = useMemo(
    () => buildMonthList(oldestDate, today),
    [oldestDate, today],
  );

  // Scroll to current month on first render
  useEffect(() => {
    const t = setTimeout(() => {
      flatRef.current?.scrollToIndex({
        index: Math.max(0, pages.length - 1),
        animated: false,
      });
    }, 60);
    return () => clearTimeout(t);
  }, [pages.length]);

  const renderPage = ({ item }: { item: MonthPage }) => {
    const cells = buildCells(item.year, item.month);
    const rows: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return (
      <View style={{ width: pageWidth }}>
        {/* Month label */}
        <Text style={styles.monthLabel}>{monthName(item.year, item.month)}</Text>

        {/* Day-of-week header */}
        <View style={styles.dowRow}>
          {DOW_NAMES.map((n, i) => (
            <View key={i} style={[styles.cell, { width: cellW, height: DOW_H }]}>
              <Text style={styles.dowLabel}>{n}</Text>
            </View>
          ))}
        </View>

        {/* Week rows */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.weekRow}>
            {row.map((cell, ci) => {
              if (!cell.inMonth) {
                return (
                  <View key={ci} style={[styles.cell, { width: cellW, height: cellW }]}>
                    <Text style={styles.fadedDay}>{cell.dayNum}</Text>
                  </View>
                );
              }

              const isToday = cell.date === today;
              const hasW    = workoutDates.has(cell.date);
              const hasM    = mealDates.has(cell.date);
              const hasLb   = weightDates.has(cell.date);
              const active  = hasW || hasM || hasLb;

              return (
                <TouchableOpacity
                  key={ci}
                  style={[
                    styles.cell,
                    { width: cellW, height: cellW },
                    isToday && styles.cellToday,
                  ]}
                  onPress={() => onDayPress(cell.date)}
                  activeOpacity={0.65}
                >
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                    {cell.dayNum}
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
        ))}
      </View>
    );
  };

  return (
    <FlatList
      ref={flatRef}
      data={pages}
      renderItem={renderPage}
      keyExtractor={(item) => `${item.year}-${item.month}`}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={{ height: pageH }}
      getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
      initialScrollIndex={Math.max(0, pages.length - 1)}
      onScrollToIndexFailed={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  monthLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  dowRow: { flexDirection: 'row' },
  dowLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  weekRow: { flexDirection: 'row' },
  cell: {
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
  fadedDay: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    opacity: 0.25,
  },
  dotRow: { flexDirection: 'row', gap: 2, minHeight: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotEmpty: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.4,
  },
});
