import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { Button } from '../../src/components/ui/Button';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { CONSTRAINT_CHIPS } from '../../src/constants/coaches';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

export default function ConstraintsScreen() {
  const router = useRouter();
  const { constraints, customConstraint, toggleConstraint, setCustomConstraint } =
    useOnboardingStore();
  const [showCustom, setShowCustom] = useState(!!customConstraint);

  const handleNext = () => {
    router.push('/onboarding/vibe');
  };

  const toggleCustom = () => {
    if (showCustom) {
      setCustomConstraint('');
    }
    setShowCustom((v) => !v);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <OnboardingHeader step={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>
          Got it. What should your coach work around?
        </Text>
        <Text style={styles.helper}>
          The more they know upfront, the less you'll have to explain later.
        </Text>

        <View style={styles.chips}>
          {CONSTRAINT_CHIPS.map((chip) => {
            const selected = constraints.includes(chip);
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleConstraint(chip)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.chip, showCustom && styles.chipSelected]}
            onPress={toggleCustom}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, showCustom && styles.chipTextSelected]}>
              + Something else
            </Text>
          </TouchableOpacity>
        </View>

        {showCustom && (
          <TextInput
            style={styles.customInput}
            placeholder="Describe it in your own words…"
            placeholderTextColor={colors.textSecondary}
            value={customConstraint}
            onChangeText={setCustomConstraint}
            autoFocus
            multiline
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="My coach knows →" onPress={handleNext} />
      </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  question: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  helper: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(216, 255, 62, 0.1)',
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.accent,
  },
  customInput: {
    marginTop: spacing.xl,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    padding: spacing.base,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
