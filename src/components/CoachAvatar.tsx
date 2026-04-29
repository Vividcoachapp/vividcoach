import { View, Image, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import type { Coach } from '../constants/coaches';
import { getCoachImages } from '../constants/coachImages';
import { colors } from '../constants/colors';
import { fonts } from '../constants/theme';

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
    if (!imgSource) {
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

  const sz = size ?? (variant === 'small' ? 48 : 200);
  const br = variant === 'small' ? sz / 2 : 8;
  const imgSource = images?.portrait;

  if (!imgSource) {
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

  return (
    <View style={[{ width: sz, height: sz, borderRadius: br, overflow: 'hidden' }, style]}>
      <Image source={imgSource} style={{ width: sz, height: sz }} resizeMode="cover" />
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
