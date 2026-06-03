import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { colors } from '../constants/colors';
import { fonts, spacing, radii } from '../constants/theme';
import {
  shouldShowSatisfactionGate,
  markSatisfactionGateShown,
  requestNativeReview,
  openFeedbackChannel,
  type ReviewTriggerSource,
} from '../services/reviewPrompt';

type Props = {
  source: ReviewTriggerSource;
  /** Delay before evaluating eligibility, in ms. Lets a celebration animation finish first. */
  delayMs?: number;
  /** Allow consumers to disable evaluation (e.g. while data is still loading). */
  enabled?: boolean;
};

/**
 * Apple guidance + PRO-765 strategy: pre-prompt satisfaction gate. Positive
 * responses fire SKStoreReviewController; negative responses route to a
 * feedback channel instead of burning the 365-day prompt budget.
 */
export function SatisfactionGate({ source, delayMs = 0, enabled = true }: Props) {
  const [visible, setVisible] = useState(false);
  const evaluated = useRef(false);

  useEffect(() => {
    if (!enabled || evaluated.current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const eligible = await shouldShowSatisfactionGate();
      if (cancelled || !eligible) return;
      evaluated.current = true;
      await markSatisfactionGateShown();
      setVisible(true);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, delayMs]);

  const handleLoving = async () => {
    setVisible(false);
    await requestNativeReview();
  };

  const handleImprove = async () => {
    setVisible(false);
    await openFeedbackChannel(source);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>How is your experience with VividCoach so far?</Text>
          <Text style={styles.subtitle}>
            Tap one. We'll route you to the right place.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleLoving}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Loving it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleImprove}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Room to improve</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setVisible(false)} hitSlop={12}>
            <Text style={styles.dismiss}>Not now</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  title: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  btn: {
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.backgroundPrimary,
  },
  btnSecondaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dismiss: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
