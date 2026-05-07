import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCoachImages } from '../constants/coachImages';
import type { Coach } from '../constants/coaches';
import { Button } from './ui/Button';
import { colors } from '../constants/colors';
import { fonts, spacing, radii } from '../constants/theme';

const VIBE_LABEL: Record<string, string> = {
  warm: 'Warm',
  direct: 'Direct',
  intense: 'Intense',
};

const VIBE_ACCENT: Record<string, string> = {
  warm:    colors.accent,
  direct:  colors.textPrimary,
  intense: colors.warmAccent,
};

const VIBE_WASH: Record<string, string> = {
  warm:    'rgba(216, 255, 62, 0.06)',
  direct:  'rgba(244, 241, 234, 0.04)',
  intense: 'rgba(255, 106, 61, 0.06)',
};

interface CoachDetailModalProps {
  coach: Coach;
  displayName: string;
  visible: boolean;
  onClose: () => void;
  onMessage: () => void;
}

export function CoachDetailModal({
  coach,
  displayName,
  visible,
  onClose,
  onMessage,
}: CoachDetailModalProps) {
  const accent = VIBE_ACCENT[coach.vibe] ?? colors.accent;
  const wash   = VIBE_WASH[coach.vibe]   ?? 'transparent';
  const vibeLabel = VIBE_LABEL[coach.vibe] ?? 'Warm';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.backgroundPrimary }]}>
        {/* Vibe wash gradient at top */}
        <View
          style={[
            styles.washOverlay,
            { backgroundColor: wash },
          ]}
          pointerEvents="none"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Full-bleed portrait — rendered directly so we can control crop position */}
          <View style={styles.portraitWrap}>
            {(() => {
              const images = getCoachImages(coach.imageKey);
              if (!images?.full) {
                return (
                  <View style={[styles.portraitFallback, { backgroundColor: accent }]}>
                    <Text style={styles.portraitFallbackInitial}>{coach.name[0]}</Text>
                  </View>
                );
              }
              return (
                <Image
                  source={images.full}
                  style={styles.portraitImage}
                  resizeMode="cover"
                />
              );
            })()}

            {/* Bottom fade — signals scrollable content below */}
            <LinearGradient
              colors={['transparent', colors.backgroundPrimary]}
              style={styles.portraitFade}
              pointerEvents="none"
            />

            {/* Close X overlaid on portrait */}
            <TouchableOpacity
              style={styles.closeX}
              onPress={onClose}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.name}>{displayName}</Text>

            {/* Meta line */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{coach.gender === 'F' ? 'Woman' : 'Man'}</Text>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText}>{coach.age}</Text>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText}>{coach.bodyType}</Text>
            </View>

            {/* Vibe pill */}
            <View style={styles.pillRow}>
              <View
                style={[
                  styles.vibePill,
                  {
                    borderColor: accent + '55',
                    backgroundColor: accent + '1f',
                  },
                ]}
              >
                <View style={[styles.vibeDot, { backgroundColor: accent }]} />
                <Text style={[styles.vibeText, { color: accent }]}>
                  {vibeLabel.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Full bio */}
            <Text style={styles.bio}>{coach.bio}</Text>
          </View>
        </ScrollView>

        {/* Footer with Close + Message buttons */}
        <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
          <View style={styles.footer}>
            <Button
              label="Close"
              onPress={onClose}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <Button
              label={`Message ${displayName}`}
              onPress={onMessage}
              variant="vibe"
              vibe={coach.vibe}
              style={{ flex: 2 }}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  washOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  portraitWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
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
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitFallbackInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 80,
    color: colors.backgroundPrimary,
  },
  portraitFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  closeX: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 16, 15, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  name: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 36,
    color: colors.textPrimary,
    lineHeight: 44,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  metaSep: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSecondary,
  },

  pillRow: {
    flexDirection: 'row',
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  vibeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vibeText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  bio: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
    marginTop: spacing.sm,
  },

  footerSafe: {
    backgroundColor: colors.backgroundPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  messageBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  messageBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.backgroundPrimary,
  },
});
