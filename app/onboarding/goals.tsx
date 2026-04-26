import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { Button } from '../../src/components/ui/Button';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { colors } from '../../src/constants/colors';
import { fonts, spacing } from '../../src/constants/theme';

export default function GoalsScreen() {
  const router = useRouter();
  const { name, goals, setGoals } = useOnboardingStore();
  const [value, setValue] = useState(goals);

  const handleNext = () => {
    setGoals(value.trim());
    router.push('/onboarding/constraints');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <OnboardingHeader step={2} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>
            Nice to meet you, {name}.{'\n'}Tell me what you're actually after.{'\n'}
            Not the polished version. The real one.
          </Text>

          <Text style={styles.helper}>
            The more specific, the better. "Lose weight" is fine.{'\n'}
            "Lose 20 lbs before my brother's wedding in October" is better.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="What do you really want?"
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={setValue}
            multiline
            textAlignVertical="top"
            autoFocus
            autoCorrect
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="This is what I want →"
            onPress={handleNext}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  flex: {
    flex: 1,
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
    marginBottom: spacing.base,
  },
  helper: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.base,
    minHeight: 140,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
