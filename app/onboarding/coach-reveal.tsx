import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '../../src/components/ui/Button';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { getCoachMatches } from '../../src/utils/coachMatcher';
import { getCoachImages } from '../../src/constants/coachImages';
import { LinearGradient } from 'expo-linear-gradient';
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
    console.log('[REVEAL DEBUG] No coach. State:', JSON.stringify({
      vibe,
      genderPref,
      agePref,
      bodyPref,
      name,
      matchesLength: matches.length,
    }));
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

  const images = getCoachImages(coach.imageKey);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Heading above photo */}
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>Based on everything you told me —</Text>
          <Text style={styles.heading}>{name}, meet{'\n'}your coach.</Text>
        </View>

        {/* Full-bleed portrait */}
        <Animated.View
          style={[
            styles.portraitWrap,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {images?.full ? (
            <Image
              source={images.full}
              style={styles.portraitImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.portraitFallback}>
              <Text style={styles.portraitFallbackInitial}>{coach.name[0]}</Text>
            </View>
          )}

          {/* Bottom fade — blends photo into the content sheet below */}
          <LinearGradient
            colors={['transparent', colors.backgroundPrimary]}
            style={styles.portraitBottomFade}
            pointerEvents="none"
          />

        </Animated.View>

        {/* Content sheet below photo */}
        <Animated.View
          style={[
            styles.sheet,
            { opacity: fadeAnim },
          ]}
        >
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

          {matches.length > 1 && (
            <TouchableOpacity onPress={handleSeeMore} style={styles.seeMore}>
              <Text style={styles.seeMoreText}>See more matches →</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
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
    paddingBottom: spacing['2xl'],
  },

  // Full-bleed portrait at top of screen
  portraitWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    position: 'relative',
    backgroundColor: '#0a0b0a',
    overflow: 'hidden',
  },
  portraitImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 9 / 16,
    width: '100%',
  },
  portraitFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitFallbackInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 96,
    color: colors.backgroundPrimary,
  },

  // Gradient on portrait — bottom fade only (heading no longer overlays photo)
  portraitBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },

  // Heading block above portrait
  headingBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
    fontSize: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
  },

  // Content sheet below portrait
  sheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
    marginTop: spacing.lg,
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
