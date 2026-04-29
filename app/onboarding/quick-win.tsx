import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { FREE_COACHES } from '../../src/constants/coaches';
import { CoachAvatar } from '../../src/components/CoachAvatar';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

const TOTAL_SQUATS = 10;

const COMPLETION_MESSAGE: Record<string, string> = {
  warm: "That's what I'm talking about. You just did your first workout with me.",
  direct: "Done. That's one. Now let's set up your account and get to work.",
  intense: "YES. That's the energy. Let's go — account setup, then we build.",
};

export default function QuickWinScreen() {
  const router = useRouter();
  const { selectedCoachId, coachCustomName, vibe, completeOnboarding } = useOnboardingStore();
  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;

  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);
  const done = count >= TOTAL_SQUATS;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const handleTap = () => {
    if (done) return;
    pulse();
    setCount((c) => c + 1);
  };

  const finish = () => {
    completeOnboarding();
    router.replace('/auth/signup');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Coach intro */}
      <View style={styles.coachRow}>
        <CoachAvatar coach={coach} variant="small" size={48} />
        <Text style={styles.coachName}>{displayName}</Text>
      </View>

      <View style={styles.content}>
        {!started ? (
          <>
            <Text style={styles.speechText}>
              I'm {displayName} — and I'm glad you're here.{'\n\n'}
              Before we get into everything, let's do one thing together right now.{'\n\n'}
              Ready for 10 squats?
            </Text>
            <Button
              label="Let's go →"
              onPress={() => setStarted(true)}
              style={styles.startButton}
            />
          </>
        ) : done ? (
          <>
            <Text style={styles.completionText}>
              {COMPLETION_MESSAGE[vibe ?? 'warm']}
            </Text>
            <Button
              label="Save my progress →"
              onPress={finish}
              style={styles.startButton}
            />
          </>
        ) : (
          <>
            {/* Progress dots */}
            <View style={styles.dots}>
              {Array.from({ length: TOTAL_SQUATS }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.sqDot, i < count && styles.sqDotFilled]}
                />
              ))}
            </View>

            {/* Count display */}
            <Text style={styles.countText}>{count} / {TOTAL_SQUATS}</Text>

            {/* Tap button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.tapButton}
                onPress={handleTap}
                activeOpacity={0.85}
              >
                <Text style={styles.tapLabel}>TAP</Text>
                <Text style={styles.tapSub}>each squat</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>

      {!done && (
        <TouchableOpacity onPress={finish} style={styles.skip}>
          <Text style={styles.skipText}>Maybe later — take me to the app</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  coachAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 20,
    color: colors.backgroundPrimary,
  },
  coachName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  speechText: {
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 27,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  completionText: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  startButton: {
    alignSelf: 'stretch',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  sqDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  sqDotFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  countText: {
    fontFamily: fonts.mono,
    fontSize: 48,
    color: colors.accent,
    marginBottom: spacing['2xl'],
  },
  tapButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tapLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.backgroundPrimary,
    letterSpacing: 2,
  },
  tapSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.backgroundPrimary,
    opacity: 0.7,
  },
  skip: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
