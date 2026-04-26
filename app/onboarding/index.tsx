import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { Button } from '../../src/components/ui/Button';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { colors } from '../../src/constants/colors';
import { fonts, spacing } from '../../src/constants/theme';

export default function NameScreen() {
  const router = useRouter();
  const { name, setName } = useOnboardingStore();
  const [value, setValue] = useState(name);

  const handleNext = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setName(trimmed);
    router.push('/onboarding/goals');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <OnboardingHeader step={1} canGoBack={false} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>
            Hey — I'm going to be your coach.{'\n'}What should I call you?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="First name"
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={setValue}
            onSubmitEditing={handleNext}
            returnKeyType="done"
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="That's me →"
            onPress={handleNext}
            disabled={!value.trim()}
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
    fontSize: 26,
    color: colors.textPrimary,
    lineHeight: 34,
    marginBottom: spacing['2xl'],
  },
  input: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 36,
    color: colors.accent,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
