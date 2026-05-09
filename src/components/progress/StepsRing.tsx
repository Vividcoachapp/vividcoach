import { View, Text, StyleSheet } from 'react-native';
import { ProgressRing } from '../ui/ProgressRing';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/theme';

interface StepsRingProps {
  steps: number | null;
  goal: number;
  size?: number;
}

export function StepsRing({ steps, goal, size = 80 }: StepsRingProps) {
  const hasData = steps != null;
  const progress = hasData ? steps / goal : 0;
  const display = hasData ? steps.toLocaleString() : '—';

  return (
    <View style={styles.wrap}>
      <ProgressRing size={size} progress={progress}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </Text>
      </ProgressRing>
      <View style={styles.labelRow}>
        <Text style={styles.label}>STEPS</Text>
        <Text style={styles.target}>/ {goal.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, width: '100%' },
  value: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 18,
    color: colors.textPrimary,
    paddingHorizontal: 8,
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
