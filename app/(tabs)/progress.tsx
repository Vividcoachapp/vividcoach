import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { fonts, spacing } from '../../src/constants/theme';

export default function ProgressScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>03 — Progress</Text>
        <Text style={styles.heading}>Every rep{'\n'}remembered.</Text>
        <Text style={styles.body}>
          Charts, logs, and weekly recaps build in Session 4.{'\n'}
          Your coach tracks it all.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.base,
  },
  heading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 48,
    color: colors.textPrimary,
    lineHeight: 52,
    marginBottom: spacing.lg,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
