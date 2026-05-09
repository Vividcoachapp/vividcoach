import { View, Text, StyleSheet } from 'react-native';
import { WeightLog } from '../../services/weight';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/theme';

interface WeightDeltaTileProps {
  /** All weight logs available, ascending by date. Window is computed inside. */
  weights: WeightLog[];
}

/**
 * Strict 30-day rolling window. Compares most recent entry within the window
 * to the oldest entry within the window. Needs ≥2 entries in-window; otherwise
 * shows empty state. Color is neutral off-white in v1 — goal-direction logic
 * is deferred until a structured weight goal is wired into coach_memory.
 */
export function WeightDeltaTile({ weights }: WeightDeltaTileProps) {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const inWindow = weights.filter((w) => w.date >= cutoff);

  if (inWindow.length < 2) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.empty}>—</Text>
        <Text style={styles.label}>NEED MORE DATA</Text>
      </View>
    );
  }

  // weights are ascending by date per fetchWeightLogs
  const oldest = inWindow[0];
  const newest = inWindow[inWindow.length - 1];
  const delta = newest.value - oldest.value;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const display = `${sign}${Math.abs(delta).toFixed(1)}`;
  const unit = newest.unit;

  return (
    <View style={styles.wrap}>
      <Text style={styles.value}>{display}</Text>
      <Text style={styles.label}>{unit.toUpperCase()} THIS MONTH</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, width: '100%' },
  value: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textPrimary,
  },
  empty: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textSecondary,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
