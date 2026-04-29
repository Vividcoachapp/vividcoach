import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useUserStore } from '../../src/stores/userStore';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/services/supabase';
import { FREE_COACHES } from '../../src/constants/coaches';
import { CoachAvatar } from '../../src/components/CoachAvatar';
import { cancelAllNotifications } from '../../src/services/notifications';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

const VIBE_LABEL: Record<string, string> = {
  warm: 'Warm',
  direct: 'Direct',
  intense: 'Intense',
};

function SettingsRow({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon} size={18} color={accent ? colors.accent : colors.textSecondary} />
        <Text style={[styles.settingsRowLabel, accent && { color: colors.accent }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { selectedCoachId, coachCustomName, vibe } = useOnboardingStore();
  const { subscriptionTier } = useUserStore();
  const user = useAuthStore((s) => s.user);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          resetOnboarding();
          cancelAllNotifications().catch(() => {});
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;
  const isPremium = subscriptionTier === 'premium';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Profile</Text>

        {/* Coach card */}
        <View style={styles.coachCard}>
          <CoachAvatar coach={coach} variant="small" size={72} />
          <View style={styles.coachInfo}>
            <Text style={styles.coachDisplayName}>{displayName}</Text>
            <Text style={styles.coachVibe}>
              {VIBE_LABEL[vibe ?? 'warm']} coach
            </Text>
            <Text style={styles.coachBio} numberOfLines={2}>{coach.bio}</Text>
          </View>
        </View>

        {/* Subscription */}
        {isPremium ? (
          <View style={styles.premiumBadgeCard}>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            <Text style={styles.premiumBadgeText}>Premium — active</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'upgrade' } })}
            activeOpacity={0.85}
          >
            <View style={styles.upgradeCardLeft}>
              <Text style={styles.upgradeCardTitle}>Upgrade to Premium</Text>
              <Text style={styles.upgradeCardSub}>
                All 28 coaches · Unlimited messages · Voice coaching
              </Text>
            </View>
            <View style={styles.upgradeChevron}>
              <Ionicons name="chevron-forward" size={16} color={colors.backgroundPrimary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Coach settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Coach</Text>
          <View style={styles.settingsGroup}>
            <SettingsRow icon="refresh" label="Change coach" onPress={() => router.navigate('/coach-roster')} />
            <SettingsRow icon="pencil" label="Rename coach" />
            <SettingsRow icon="sparkles" label="Coach's Notes" onPress={() => router.navigate('/coach-notes' as any)} accent />
          </View>
        </View>

        {/* App settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.settingsGroup}>
            <SettingsRow icon="notifications-outline" label="Notification preferences" />
            <SettingsRow icon="moon-outline" label="Quiet hours" />
          </View>
        </View>

        {/* Beta feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Beta</Text>
          <View style={styles.settingsGroup}>
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label="Send feedback"
              onPress={() =>
                Linking.openURL(
                  'mailto:vividcoachapp@gmail.com?subject=VividCoach%20Beta%20Feedback',
                ).catch(() => Alert.alert('Could not open mail app'))
              }
            />
            <SettingsRow
              icon="bug-outline"
              label="Report a bug"
              onPress={() =>
                Linking.openURL(
                  'mailto:vividcoachapp@gmail.com?subject=VividCoach%20Bug%20Report',
                ).catch(() => Alert.alert('Could not open mail app'))
              }
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.settingsGroup}>
            {isPremium && (
              <SettingsRow icon="card-outline" label="Manage subscription" />
            )}
            <SettingsRow icon="download-outline" label="Export my data" />
            <SettingsRow icon="trash-outline" label="Delete account" />
          </View>
        </View>

        {/* Sign out */}
        {user && (
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.version}>VividCoach · Beta 1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  screenTitle: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing['2xl'],
  },

  // Coach card
  coachCard: {
    flexDirection: 'row',
    gap: spacing.base,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.base,
    alignItems: 'flex-start',
  },
  coachInfo: {
    flex: 1,
    gap: 3,
  },
  coachDisplayName: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  coachVibe: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  coachBio: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },

  // Upgrade CTA
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing['2xl'],
  },
  upgradeCardLeft: {
    flex: 1,
    gap: 3,
  },
  upgradeCardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.backgroundPrimary,
  },
  upgradeCardSub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.backgroundPrimary,
    opacity: 0.75,
  },
  upgradeChevron: {
    marginLeft: spacing.sm,
  },

  // Premium badge (when already subscribed)
  premiumBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(216, 255, 62, 0.08)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(216, 255, 62, 0.3)',
    padding: spacing.base,
    marginBottom: spacing['2xl'],
  },
  premiumBadgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.accent,
  },

  // Settings sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  settingsGroup: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsRowLabel: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },

  signOutButton: {
    alignItems: 'center',
    paddingVertical: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  signOutText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.warmAccent,
  },
  version: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
