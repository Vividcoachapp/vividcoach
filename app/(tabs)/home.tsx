import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { fonts, spacing } from '../../src/constants/theme';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>VividCoach</Text>
        <Text style={styles.tagline}>A coach who remembers you.</Text>

        <View style={styles.divider} />

        <Card style={styles.card} padding={spacing.xl}>
          <Text style={styles.sectionLabel}>Component Preview</Text>

          <Input
            label="Your name"
            placeholder="Christopher"
            style={styles.inputSpacing}
          />

          <Input
            label="Your goal"
            placeholder="What are you training for?"
            style={styles.inputSpacing}
          />

          <Button label="Start Training" onPress={() => {}} style={styles.buttonSpacing} />
          <Button
            label="See Progress"
            variant="secondary"
            onPress={() => {}}
            style={styles.buttonSecondary}
          />
        </Card>

        <Text style={styles.footnote}>
          Session 3 — theme system loaded
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  logo: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 42,
    color: colors.accent,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing['2xl'],
  },
  card: {
    gap: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  inputSpacing: {
    marginBottom: spacing.sm,
  },
  buttonSpacing: {
    marginTop: spacing.sm,
  },
  buttonSecondary: {
    marginTop: spacing.sm,
  },
  footnote: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing['2xl'],
    letterSpacing: 0.5,
  },
});
