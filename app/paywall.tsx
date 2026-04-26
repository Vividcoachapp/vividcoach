import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { useUserStore } from '../src/stores/userStore';
import { FREE_COACHES } from '../src/constants/coaches';
import { PACKAGES, PackageId, revenueCatService } from '../src/services/revenuecat';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

const PREMIUM_FEATURES = [
  'Unlimited coaching messages',
  'All 28 coaches unlocked',
  'Deep memory — coach remembers more',
  'Up to 3 simultaneous coaches',
  'Live voice coaching during workouts',
  'Full meal planning + grocery lists',
  'Weekly recap calls from your coach',
  'Premium AI for hard coaching moments',
  'Early access to new coaches',
  'Priority support',
];

const COACH_MESSAGE: Record<string, string> = {
  limit:
    "That's my free coaching for today — I'll be back tomorrow, or you can unlock unlimited time with me right now.",
  upgrade:
    '14 more coaches are waiting to meet you — unlock the full roster.',
  default:
    "Unlock everything and let's really get to work.",
};

export default function PaywallScreen() {
  const router = useRouter();
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  const { selectedCoachId, coachCustomName } = useOnboardingStore();
  const { setSubscriptionTier } = useUserStore();

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;

  const [selectedPackage, setSelectedPackage] = useState<PackageId>(
    'vividcoach_premium_annual'
  );
  const [loading, setLoading] = useState(false);

  const annualPkg = PACKAGES.find((p) => p.id === 'vividcoach_premium_annual')!;
  const monthlyPkg = PACKAGES.find((p) => p.id === 'vividcoach_premium_monthly')!;

  const message = COACH_MESSAGE[trigger ?? 'default'] ?? COACH_MESSAGE.default;

  const handlePurchase = async () => {
    setLoading(true);
    const result = await revenueCatService.purchasePackage(selectedPackage);
    setLoading(false);

    if (result.success) {
      setSubscriptionTier('premium');
      router.back();
    } else if (!result.cancelled) {
      Alert.alert(
        'Not available yet',
        result.error ??
          'Purchases will be enabled once the app is in the App Store. Everything else is fully functional!',
        [{ text: 'Got it' }]
      );
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const result = await revenueCatService.restorePurchases();
    setLoading(false);
    if (result.success) {
      setSubscriptionTier('premium');
      router.back();
    } else {
      Alert.alert('Nothing to restore', 'No active subscription found on this Apple ID.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach message */}
        <View style={styles.coachRow}>
          <View style={styles.coachAvatar}>
            <Text style={styles.coachInitial}>{coach.name[0]}</Text>
          </View>
          <View style={styles.coachBubble}>
            <Text style={styles.coachBubbleText}>"{message}"</Text>
            <Text style={styles.coachBubbleName}>— {displayName}</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.heading}>Unlock your{'\n'}full coach.</Text>

        {/* Annual card — featured */}
        <TouchableOpacity
          style={[
            styles.card,
            styles.cardFeatured,
            selectedPackage === annualPkg.id && styles.cardSelected,
          ]}
          onPress={() => setSelectedPackage(annualPkg.id)}
          activeOpacity={0.85}
        >
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>

          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardPeriod}>Annual</Text>
              <Text style={styles.cardSavings}>Save 36% — {annualPkg.description}</Text>
            </View>
            <View style={styles.cardPriceCol}>
              <Text style={styles.cardPrice}>{annualPkg.priceString}</Text>
              <Text style={styles.cardPricePer}>/ year</Text>
            </View>
          </View>

          <View style={styles.selectedDot}>
            {selectedPackage === annualPkg.id && (
              <View style={styles.selectedDotInner} />
            )}
          </View>
        </TouchableOpacity>

        {/* Monthly card — ghost */}
        <TouchableOpacity
          style={[
            styles.card,
            styles.cardGhost,
            selectedPackage === monthlyPkg.id && styles.cardGhostSelected,
          ]}
          onPress={() => setSelectedPackage(monthlyPkg.id)}
          activeOpacity={0.85}
        >
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardPeriodGhost}>Monthly</Text>
              <Text style={styles.cardSavingsGhost}>{monthlyPkg.description}</Text>
            </View>
            <View style={styles.cardPriceCol}>
              <Text style={styles.cardPriceGhost}>{monthlyPkg.priceString}</Text>
              <Text style={styles.cardPricePerGhost}>/ mo</Text>
            </View>
          </View>

          <View style={styles.selectedDot}>
            {selectedPackage === monthlyPkg.id && (
              <View style={styles.selectedDotInner} />
            )}
          </View>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.backgroundPrimary} />
          ) : (
            <Text style={styles.ctaText}>Start 21-Day Free Trial</Text>
          )}
        </TouchableOpacity>

        {/* Trial disclosure — legally required */}
        <Text style={styles.disclosure}>
          Your first 7 days are completely free — no card needed. After that, add a card to
          continue your 21-day trial. You won't be charged until day 21.
        </Text>

        {/* Feature list */}
        <View style={styles.divider} />

        <Text style={styles.featuresHeading}>Everything in Premium</Text>

        <View style={styles.features}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark" size={16} color={colors.accent} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.footerLink}>Restore purchases</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
  },

  // Coach message
  coachRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
    alignItems: 'flex-start',
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coachInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 20,
    color: colors.backgroundPrimary,
  },
  coachBubble: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  coachBubbleText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  coachBubbleName: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Headline
  heading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 36,
    color: colors.textPrimary,
    lineHeight: 44,
    marginBottom: spacing['2xl'],
  },

  // Annual card
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardFeatured: {
    backgroundColor: 'rgba(216, 255, 62, 0.06)',
    borderColor: colors.accent,
  },
  cardSelected: {
    backgroundColor: 'rgba(216, 255, 62, 0.1)',
  },
  cardGhost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  cardGhostSelected: {
    borderColor: colors.textSecondary,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: spacing.md,
  },
  recommendedText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.backgroundPrimary,
    letterSpacing: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPeriod: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSavings: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.3,
  },
  cardPriceCol: {
    alignItems: 'flex-end',
  },
  cardPrice: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 26,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  cardPricePer: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardPeriodGhost: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cardSavingsGhost: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardPriceGhost: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 24,
    color: colors.textSecondary,
    lineHeight: 28,
  },
  cardPricePerGhost: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
  },
  selectedDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },

  // CTA
  ctaButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
    letterSpacing: 0.3,
  },

  // Disclosure — legally required
  disclosure: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },

  // Features
  featuresHeading: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  features: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  footerLink: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
