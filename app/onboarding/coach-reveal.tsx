import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { getCoachMatches } from '../../src/utils/coachMatcher';
import { getCoachImages } from '../../src/constants/coachImages';
import { CoachDetailModal } from '../../src/components/CoachDetailModal';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

const VIBE_LABEL: Record<string, string> = {
  warm: 'WARM',
  direct: 'DIRECT',
  intense: 'INTENSE',
};

const VIBE_ACCENT: Record<string, string> = {
  warm:    colors.accent,
  direct:  colors.textPrimary,
  intense: colors.warmAccent,
};

export default function CoachRevealScreen() {
  const router = useRouter();
  const { vibe, genderPref, agePref, bodyPref, setSelectedCoach, setCoachCustomName } =
    useOnboardingStore();

  const matches = useMemo(() => {
    if (!vibe) return [];
    return getCoachMatches(vibe, genderPref, agePref, bodyPref);
  }, [vibe, genderPref, agePref, bodyPref]);

  const [showDetailModal, setShowDetailModal] = useState(false);

  // Stage 1 — photo: fade in + scale settle 1.05 → 1.00 over ~400ms
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.05)).current;
  // Stage 2 — UI: fade in over ~300ms, ~200ms after photo finishes
  const uiFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(1.05);
    uiFadeAnim.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.timing(uiFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // All hooks above — safe to early-return now
  const coach = matches[0];

  if (!coach) {
    // Vibe state is missing — send back to pick one
    router.replace('/onboarding/vibe');
    return null;
  }

  const accent = VIBE_ACCENT[coach.vibe] ?? colors.accent;

  // Placeholder hook: first sentence of the coach's existing bio. Real hooks
  // are a separate authoring task per the redesign brief.
  const dotIdx = coach.bio.indexOf('.');
  const hook = dotIdx === -1 ? coach.bio : coach.bio.slice(0, dotIdx + 1);

  const handleConfirm = () => {
    setSelectedCoach(coach.id, coach.name);
    setCoachCustomName(coach.name);
    router.push('/onboarding/quick-win');
  };

  const images = getCoachImages(coach.imageKey);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Stage 1 — full-bleed photo, fade + scale settle */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {images?.full ? (
          <Image source={images.full} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.photoFallbackInitial}>{coach.name[0]}</Text>
          </View>
        )}
      </Animated.View>

      {/* Bottom-up dark scrim — covers ~40% of screen, gives UI readability */}
      <LinearGradient
        colors={['transparent', colors.backgroundPrimary]}
        style={styles.scrim}
        pointerEvents="none"
      />

      {/* Stage 2 — chevron at bottom-right of photo area, opens detail modal */}
      <Animated.View style={[styles.chevronWrap, { opacity: uiFadeAnim }]}>
        <TouchableOpacity
          style={styles.chevronTouch}
          onPress={() => setShowDetailModal(true)}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-down" size={24} color="rgba(255, 255, 255, 0.4)" />
        </TouchableOpacity>
      </Animated.View>

      {/* Stage 2 — floating UI in scrim zone */}
      <SafeAreaView style={styles.uiSafe} edges={['bottom']} pointerEvents="box-none">
        <Animated.View style={[styles.uiContent, { opacity: uiFadeAnim }]}>
          <Text style={styles.coachName}>{coach.name}</Text>

          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: accent }]} />
            <Text style={[styles.badgeLabel, { color: accent }]}>{VIBE_LABEL[coach.vibe]}</Text>
          </View>

          <Text style={styles.hook}>{hook}</Text>

          <Button
            label="Let's go"
            onPress={handleConfirm}
            variant="vibe"
            vibe={coach.vibe}
            style={{ marginTop: spacing.sm }}
          />
        </Animated.View>
      </SafeAreaView>

      {/* Full bio + meta lives behind the chevron tap */}
      <CoachDetailModal
        coach={coach}
        displayName={coach.name}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onMessage={() => setShowDetailModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },

  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 9 / 16,
    width: '100%',
  },
  photoFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0b0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 96,
    color: colors.backgroundPrimary,
  },

  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },

  chevronWrap: {
    position: 'absolute',
    right: spacing.sm,
    bottom: '40%',
  },
  chevronTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  uiSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  uiContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  coachName: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 40,
    color: colors.textPrimary,
    lineHeight: 46,
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
  },
  badgeLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  hook: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  letsGoBtn: {
    marginTop: spacing.sm,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letsGoText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
  },
});
