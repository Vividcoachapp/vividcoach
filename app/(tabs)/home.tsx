import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { FREE_COACHES } from '../../src/constants/coaches';
import { CoachAvatar } from '../../src/components/CoachAvatar';
import { fetchChatStats, ChatStats } from '../../src/services/profile';
import { setupNotifications, scheduleMomentumNudge } from '../../src/services/notifications';
import {
  fetchHealthSnapshot, HealthSnapshot, EMPTY_SNAPSHOT,
  requestStepPermission, formatSleep,
} from '../../src/services/health';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { name, goals, constraints, selectedCoachId, coachCustomName, vibe } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;

  const [stats, setStats]             = useState<ChatStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [insight, setInsight]         = useState<string | null>(null);
  const [recapPreview, setRecapPreview] = useState<string | null>(null);
  const [healthSnap, setHealthSnap]   = useState<HealthSnapshot>(EMPTY_SNAPSHOT);
  const [showHealthModal, setShowHealthModal] = useState(false);

  useEffect(() => {
    if (!user?.id) { setStatsLoading(false); return; }
    fetchChatStats(user.id)
      .then(setStats)
      .catch(() => setStats({ streak: 0, weeklyMessages: 0 }))
      .finally(() => setStatsLoading(false));
  }, [user?.id]);

  // On every focus: refresh UI data, setup notifications, reset nudge timer
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;

    const obsKey = `@obs_text_${user.id}_${(FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0]).id}`;
    AsyncStorage.getItem(obsKey).then(setInsight).catch(() => {});

    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const weekStart = d.toISOString().slice(0, 10);
    const recapKey = `@recap_${user.id}_${weekStart}`;
    AsyncStorage.getItem(recapKey).then(setRecapPreview).catch(() => {});

    const coachVibe = vibe ?? 'warm';
    const coachName = coachCustomName || coach.name;

    setupNotifications(coachName, coachVibe).catch(() => {});
    scheduleMomentumNudge(coachName, coachVibe).catch(() => {});

    // Health data — fetch snapshot and show first-open permission modal
    fetchHealthSnapshot().then(setHealthSnap).catch(() => {});
    AsyncStorage.getItem('@vc_health_asked').then((asked) => {
      if (!asked) setShowHealthModal(true);
    }).catch(() => {});
  }, [user?.id, selectedCoachId, vibe, coachCustomName]));

  const handleHealthAllow = async () => {
    await AsyncStorage.setItem('@vc_health_asked', '1').catch(() => {});
    setShowHealthModal(false);
    const granted = await requestStepPermission();
    if (granted) fetchHealthSnapshot().then(setHealthSnap).catch(() => {});
  };

  const handleHealthDismiss = async () => {
    await AsyncStorage.setItem('@vc_health_asked', '1').catch(() => {});
    setShowHealthModal(false);
  };

  const vibeLabel = vibe
    ? { warm: 'Warm', direct: 'Direct', intense: 'Intense' }[vibe]
    : 'Warm';

  const hasGoals = goals.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ─────────────────────────────────────── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingEyebrow}>{greeting()}</Text>
          <Text style={styles.greetingName}>
            {name ? `${name}.` : 'Welcome back.'}
          </Text>
        </View>

        {/* ── Coach card ───────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.coachRow}>
            <CoachAvatar coach={coach} variant="portrait" size={80} />
            <View style={styles.coachInfo}>
              <Text style={styles.coachDisplayName}>{displayName}</Text>
              <View style={styles.vibePill}>
                <View style={styles.vibeDot} />
                <Text style={styles.vibeText}>{vibeLabel.toUpperCase()} COACH</Text>
              </View>
            </View>
          </View>

          <Text style={styles.coachBio} numberOfLines={2}>{coach.bio}</Text>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.navigate('/train')}
            activeOpacity={0.85}
          >
            <Text style={styles.chatButtonText}>Chat with {displayName}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.backgroundPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Coach insight card ───────────────────────────── */}
        {insight && (
          <TouchableOpacity
            style={styles.insightCard}
            onPress={() => router.navigate('/train')}
            activeOpacity={0.85}
          >
            <View style={styles.insightHeader}>
              <View style={styles.insightDot} />
              <Text style={styles.insightLabel}>WHAT {displayName.toUpperCase()} NOTICED</Text>
            </View>
            <View style={styles.insightBody}>
              <CoachAvatar coach={coach} variant="small" size={44} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
            <Text style={styles.insightCta}>Tap to continue the conversation →</Text>
          </TouchableOpacity>
        )}

        {/* ── Stats row ────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            {statsLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <>
                <Text style={styles.statNumber}>
                  {stats && stats.streak > 0 ? stats.streak : '—'}
                </Text>
                <Text style={styles.statLabel}>
                  {stats && stats.streak === 1 ? 'day streak' : 'day streak'}
                </Text>
              </>
            )}
          </View>

          <View style={[styles.card, styles.statCard]}>
            {statsLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <>
                <Text style={styles.statNumber}>
                  {stats ? stats.weeklyMessages : '—'}
                </Text>
                <Text style={styles.statLabel}>messages{'\n'}this week</Text>
              </>
            )}
          </View>
        </View>

        {/* ── Health card ───────────────────────────────────── */}
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Ionicons name="pulse-outline" size={13} color={colors.accent} />
            <Text style={styles.healthHeaderLabel}>HEALTH · AUTO-SYNCED</Text>
          </View>
          <View style={styles.healthGrid}>
            <HealthMetric
              icon="footsteps-outline"
              value={healthSnap.steps != null ? healthSnap.steps.toLocaleString() : '—'}
              label="steps today"
              active={healthSnap.steps != null}
            />
            <HealthMetric
              icon="moon-outline"
              value={healthSnap.sleepMinutes != null ? formatSleep(healthSnap.sleepMinutes) : '—'}
              label="sleep"
              active={healthSnap.sleepMinutes != null}
            />
            <HealthMetric
              icon="flame-outline"
              value={healthSnap.activeCalories != null ? String(healthSnap.activeCalories) : '—'}
              label="active cal"
              active={healthSnap.activeCalories != null}
            />
            <HealthMetric
              icon="heart-outline"
              value={healthSnap.restingHeartRate != null ? `${healthSnap.restingHeartRate} bpm` : '—'}
              label="heart rate"
              active={healthSnap.restingHeartRate != null}
            />
          </View>
          {healthSnap.steps != null && (
            <View style={styles.stepsTrack}>
              <View style={[styles.stepsFill, { width: `${Math.min((healthSnap.steps / 10000) * 100, 100)}%` as any }]} />
            </View>
          )}
        </View>

        {/* ── Goals card ───────────────────────────────────── */}
        {hasGoals && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>YOUR GOAL</Text>
            <Text style={styles.goalText}>{goals.trim()}</Text>
            {constraints.length > 0 && (
              <View style={styles.constraintChips}>
                {constraints.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {!hasGoals && (
          <TouchableOpacity
            style={[styles.card, styles.emptyGoalCard]}
            onPress={() => router.navigate('/train')}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.emptyGoalText}>
              Tell {displayName} what you're working toward — start a conversation.
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Weekly Recap card ────────────────────────────── */}
        <TouchableOpacity
          style={styles.recapCard}
          onPress={() => router.navigate('/weekly-recap')}
          activeOpacity={0.85}
        >
          <View style={styles.recapHeader}>
            <View style={styles.insightDot} />
            <Text style={styles.recapLabel}>WEEKLY RECAP</Text>
          </View>
          {recapPreview ? (
            <>
              <Text style={styles.recapPreviewText} numberOfLines={3}>{recapPreview}</Text>
              <Text style={styles.recapCta}>View full recap →</Text>
            </>
          ) : (
            <View style={styles.recapEmptyBody}>
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.recapEmptyText}>
                Get {displayName}'s take on your week — training, nutrition, and weight.
              </Text>
            </View>
          )}
          {!recapPreview && (
            <Text style={styles.recapCta}>Generate this week's recap →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Health permission modal — first open only ──── */}
      <Modal visible={showHealthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="pulse" size={28} color={colors.accent} />
            </View>
            <Text style={styles.modalTitle}>Connect health data</Text>
            <Text style={styles.modalBody}>
              {displayName} can automatically track your fitness data so you don't have to log everything manually.
            </Text>
            <View style={styles.modalMetrics}>
              {[
                { icon: 'footsteps-outline' as const, label: 'Daily steps' },
                { icon: 'moon-outline'      as const, label: 'Sleep duration' },
                { icon: 'flame-outline'     as const, label: 'Active calories' },
                { icon: 'heart-outline'     as const, label: 'Heart rate' },
              ].map(({ icon, label }) => (
                <View key={label} style={styles.modalMetricRow}>
                  <Ionicons name={icon} size={16} color={colors.accent} />
                  <Text style={styles.modalMetricLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.modalAllow} onPress={handleHealthAllow} activeOpacity={0.85}>
              <Text style={styles.modalAllowText}>Allow health access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleHealthDismiss} style={styles.modalSkip}>
              <Text style={styles.modalSkipText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function HealthMetric({
  icon, value, label, active,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  active: boolean;
}) {
  return (
    <View style={styles.healthMetric}>
      <Ionicons name={icon} size={14} color={active ? colors.accent : colors.textSecondary} />
      <Text style={[styles.healthMetricValue, !active && styles.healthMetricInactive]}>{value}</Text>
      <Text style={styles.healthMetricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },

  // Greeting
  greetingSection: {
    marginBottom: spacing.md,
  },
  greetingEyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  greetingName: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 42,
    color: colors.textPrimary,
    lineHeight: 48,
  },

  // Card base
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
  },

  // Coach card
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  coachInfo: { flex: 1, gap: 4 },
  coachDisplayName: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vibeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  vibeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  coachBio: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
  },
  chatButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.backgroundPrimary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  statNumber: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 40,
    color: colors.accent,
    lineHeight: 44,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Goals
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  goalText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 23,
  },
  constraintChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundPrimary,
  },
  chipText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Health card
  healthCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
  },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  healthHeaderLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthMetric: { flex: 1, alignItems: 'center', gap: 4 },
  healthMetricValue: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  healthMetricInactive: { color: colors.textSecondary },
  healthMetricLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  stepsTrack: {
    height: 3,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepsFill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },

  // Health permission modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['2xl'],
    width: '100%',
    gap: spacing.md,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(216,255,62,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  modalMetrics: {
    gap: spacing.sm,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: radii.md,
    padding: spacing.base,
    marginVertical: spacing.sm,
  },
  modalMetricRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modalMetricLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary },
  modalAllow: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalAllowText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.backgroundPrimary },
  modalSkip: { alignItems: 'center', paddingVertical: spacing.sm },
  modalSkipText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textSecondary },

  // Insight card
  insightCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.3)',
    padding: spacing.base,
    gap: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  insightLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  insightBody: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  insightText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  insightCta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'right',
  },

  // Weekly Recap card
  recapCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.2)',
    padding: spacing.base,
    gap: spacing.md,
  },
  recapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recapLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  recapPreviewText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  recapEmptyBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recapEmptyText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  recapCta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'right',
  },

  // Empty goal state
  emptyGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyGoalText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
});
