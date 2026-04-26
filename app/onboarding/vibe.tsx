import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { Button } from '../../src/components/ui/Button';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { CoachVibe } from '../../src/constants/coaches';
import { GenderPref, AgePref, BodyPref } from '../../src/utils/coachMatcher';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

const VIBES: { vibe: CoachVibe; label: string; quote: string }[] = [
  { vibe: 'warm', label: 'WARM', quote: "You've got this. Let's go." },
  { vibe: 'direct', label: 'DIRECT', quote: "Here's the plan. Let's move." },
  { vibe: 'intense', label: 'INTENSE', quote: "That's what I'm talking about." },
];

const GENDER_OPTIONS: { label: string; value: GenderPref }[] = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'No preference', value: 'no_preference' },
];

const AGE_OPTIONS: { label: string; value: AgePref }[] = [
  { label: 'Younger', value: 'younger' },
  { label: 'Similar', value: 'similar' },
  { label: 'Older', value: 'older' },
  { label: 'No preference', value: 'no_preference' },
];

const BODY_OPTIONS: { label: string; value: BodyPref }[] = [
  { label: 'Athletic', value: 'athletic' },
  { label: 'Strong & powerful', value: 'strong_powerful' },
  { label: 'No preference', value: 'no_preference' },
];

function PrefRow<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={prefStyles.row}>
      <Text style={prefStyles.rowLabel}>{label}</Text>
      <View style={prefStyles.pills}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[prefStyles.pill, active && prefStyles.pillActive]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[prefStyles.pillText, active && prefStyles.pillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function VibeScreen() {
  const router = useRouter();
  const {
    vibe,
    genderPref,
    agePref,
    bodyPref,
    setVibe,
    setGenderPref,
    setAgePref,
    setBodyPref,
  } = useOnboardingStore();

  const handleNext = () => {
    if (!vibe) return;
    router.push('/onboarding/coach-reveal');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <OnboardingHeader step={4} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>
          Last thing before I find your coach — what kind of energy do you want from them?
        </Text>

        <View style={styles.vibeCards}>
          {VIBES.map(({ vibe: v, label, quote }) => {
            const selected = vibe === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.vibeCard, selected && styles.vibeCardSelected]}
                onPress={() => setVibe(v)}
                activeOpacity={0.8}
              >
                {selected && <View style={styles.vibeAccentBar} />}
                <View style={styles.vibeCardInner}>
                  <Text style={[styles.vibeLabel, selected && styles.vibeLabelSelected]}>
                    {label}
                  </Text>
                  <Text style={styles.vibeQuote}>"{quote}"</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <Text style={styles.prefHeading}>Coach preferences</Text>
        <Text style={styles.prefSubtext}>All optional — defaults to no preference</Text>

        <PrefRow
          label="Gender"
          options={GENDER_OPTIONS}
          value={genderPref}
          onSelect={setGenderPref}
        />
        <PrefRow
          label="Age range"
          options={AGE_OPTIONS}
          value={agePref}
          onSelect={setAgePref}
        />
        <PrefRow
          label="Body energy"
          options={BODY_OPTIONS}
          value={bodyPref}
          onSelect={setBodyPref}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Find my coach →"
          onPress={handleNext}
          disabled={!vibe}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  question: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing['2xl'],
  },
  vibeCards: { gap: spacing.md },
  vibeCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 80,
    alignItems: 'center',
  },
  vibeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(216, 255, 62, 0.06)',
  },
  vibeAccentBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
  },
  vibeCardInner: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    gap: 4,
  },
  vibeLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textSecondary,
  },
  vibeLabelSelected: {
    color: colors.accent,
  },
  vibeQuote: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing['2xl'],
  },
  prefHeading: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  prefSubtext: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});

const prefStyles = StyleSheet.create({
  row: {
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  rowLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(216, 255, 62, 0.1)',
  },
  pillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.accent,
  },
});
