import { View, Image, Text, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import type { Coach } from '../constants/coaches';
import { getCoachImages } from '../constants/coachImages';
import { colors } from '../constants/colors';
import { fonts } from '../constants/theme';

// PRO-766 Bug 2: react-native-web's Image internally calls
// `Image.default.resolveAssetSource(...)` on numeric `require()` asset refs
// and crashes with "Image.default.resolveAssetSource is not a function" under
// our current SDK 54 + react-native-web bundle. iOS / Android use the native
// asset resolver path and are unaffected. Until we move to expo-image or pin a
// fix, render the initial-letter fallback on web so the screen does not
// remount-loop through ErrorBoundary.
const SKIP_IMAGE_ON_WEB = Platform.OS === 'web';

type CoachAvatarVariant = 'full' | 'portrait' | 'small';

interface CoachAvatarProps {
  coach: Coach;
  variant: CoachAvatarVariant;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const VIBE_BG: Record<string, string> = {
  warm: colors.accent,
  direct: colors.textPrimary,
  intense: colors.warmAccent,
};

export function CoachAvatar({ coach, variant, size, style }: CoachAvatarProps) {
  const images = getCoachImages(coach.imageKey);
  const fallbackBg = VIBE_BG[coach.vibe] ?? colors.accent;

  if (variant === 'full') {
    const imgSource = images?.full;
    if (!imgSource || SKIP_IMAGE_ON_WEB) {
      return (
        <View style={[styles.fullFallback, { backgroundColor: fallbackBg }, style]}>
          <Text style={styles.fullFallbackInitial}>{coach.name[0]}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.fullContainer, style]}>
        <Image source={imgSource} style={styles.fullImage} resizeMode="cover" />
      </View>
    );
  }

  // 'small' (round) and 'portrait' (rounded square) variants — both now source
  // from the full-body cutout PNGs and apply a head-and-shoulders crop in code.
  const sz = size ?? (variant === 'small' ? 48 : 200);
  const br = variant === 'small' ? sz / 2 : 8;
  const imgSource = images?.full;

  if (!imgSource || SKIP_IMAGE_ON_WEB) {
    return (
      <View
        style={[
          { width: sz, height: sz, borderRadius: br, backgroundColor: fallbackBg, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <Text
          style={{ fontFamily: fonts.serifDisplayItalic, fontSize: Math.round(sz * 0.45), color: colors.backgroundPrimary }}
        >
          {coach.name[0]}
        </Text>
      </View>
    );
  }

  // Head-and-shoulders crop math:
  //   - Image rendered at natural 9:16 aspect, sz wide × sz * 16/9 tall
  //   - Top-anchored within the sz × sz container; bottom (~44% of image) is
  //     clipped by overflow:hidden — leaving the top sz of the image visible
  //     ≈ top 56% of the figure (head + shoulders + upper torso)
  //   - No horizontal scaling, so transparent padding inside each cutout PNG
  //     stays where the artist put it — no scaled-up "halo" of transparent
  //     space around the figure (which the prior 1.8x scale produced)
  // Container has no backgroundColor — transparent cutout silhouette shows
  // whatever's behind the avatar (per the "no baked background" approach).
  return (
    <View style={[{ width: sz, height: sz, borderRadius: br, overflow: 'hidden' }, style]}>
      <Image
        source={imgSource}
        resizeMode="cover"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: sz,
          height: sz * (images?.avatarHeightMultiplier ?? 16 / 9),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    overflow: 'hidden',
    borderRadius: 12,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  fullFallback: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullFallbackInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 80,
    color: colors.backgroundPrimary,
  },
});
