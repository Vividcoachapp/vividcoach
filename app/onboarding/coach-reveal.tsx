import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '../../src/components/ui/Button';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { getCoachMatches } from '../../src/utils/coachMatcher';
import { CoachAvatar } from '../../src/components/CoachAvatar';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

const VIBE_LABEL: Record<string, string> = {
  warm: 'WARM',
  direct: 'DIRECT',
  intense: 'INTENSE',
};

export default function CoachRevealScreen() {
  const router = useRouter();
  const { name, vibe, genderPref, agePref, bodyPref, setSelectedCoach, setCoachCustomName } =
    useOnboardingStore();

  // Safe — returns [] if vibe is somehow null
  const matches = useMemo(() => {
    if (!vibe) return [];
    return getCoachMatches(vibe, genderPref, agePref, bodyPref);
  }, [vibe, genderPref, agePref, bodyPref]);

  const [matchIndex, setMatchIndex] = useState(0);

  // Lazy initializer: only runs once on mount, safe even if matches is empty
  const [customName, setCustomName] = useState<string>(() => matches[0]?.name ?? '');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  // Sync name + animate whenever the selected coach changes
  useEffect(() => {
    const current = matches[matchIndex] ?? matches[0];
    if (current) setCustomName(current.name);

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.88);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [matchIndex]);

  // All hooks are above — safe to early-return now
  const coach = matches[matchIndex] ?? matches[0];

  if (!coach) {
    // Vibe state is missing — send back to pick one
    router.replace('/onboarding/vibe');
    return null;
  }

  const handleSeeMore = () => {
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    // customName is updated in the useEffect above when matchIndex changes
  };

  const handleConfirm = () => {
    const finalName = customName.trim() || coach.name;
    setSelectedCoach(coach.id, finalName);
    setCoachCustomName(finalName);
    router.push('/onboarding/quick-win');
  };

  const pronoun = coach.gender === 'F' ? 'Her' : 'His';
  const them = coach.gender === 'F' ? 'her' : 'him';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>Based on everything you told me —</Text>
        <Text style={styles.heading}>{name}, meet{'\n'}your coach.</Text>

        <Animated.View
          style={[
            styles.coachCard,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <CoachAvatar coach={coach} variant="full" />

          <Text style={styles.coachName}>{customName || coach.name}</Text>

          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeLabel}>{VIBE_LABEL[coach.vibe]}</Text>
          </View>

          <Text style={styles.bio}>{coach.bio}</Text>

          <View style={styles.renameRow}>
            <Text style={styles.renameLabel}>
              {pronoun} name is {coach.name} — or call {them} whatever feels right to you.
            </Text>
            <TextInput
              style={styles.renameInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder={coach.name}
              placeholderTextColor={colors.textSecondary}
              maxLength={20}
              autoCorrect={false}
            />
          </View>
        </Animated.View>

        {matches.length > 1 && (
          <TouchableOpacity onPress={handleSeeMore} style={styles.seeMore}>
            <Text style={styles.seeMoreText}>See more matches →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="This is my coach →" onPress={handleConfirm} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 36,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: spacing['3xl'],
  },
  coachCard: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  coachName: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  badgeLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  bio: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  renameRow: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  renameLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  renameInput: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
  },
  seeMore: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  seeMoreText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
