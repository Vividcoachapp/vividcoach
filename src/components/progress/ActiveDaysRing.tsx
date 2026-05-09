import { View, Text, StyleSheet } from 'react-native';
import { ProgressRing } from '../ui/ProgressRing';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/theme';

const TARGET = 7;

interface ActiveDaysRingProps {
  /** Count of unique YYYY-MM-DD dates this week (Sun→Sat) on which the user
   *  logged at least one workout, meal, or weight. Coach chat does not count. */
  count: number;
  size?: number;
}

export function ActiveDaysRing({ count, size = 80 }: ActiveDaysRingProps) {
  const progress = TARGET > 0 ? count / TARGET : 0;

  return (
    <View style={styles.wrap}>
      <ProgressRing size={size} progress={progress}>
        <Text style={styles.value}>{count}</Text>
      </ProgressRing>
      <View style={styles.labelRow}>
        <Text style={styles.label}>ACTIVE DAYS</Text>
        <Text style={styles.target}>/ {TARGET}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, width: '100%' },
  value: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textPrimary,
  },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  target: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
