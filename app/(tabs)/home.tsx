import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { FREE_COACHES } from '../../src/constants/coaches';
import { fetchChatStats, ChatStats } from '../../src/services/profile';
import { setupNotifications, scheduleMomentumNudge } from '../../src/services/notifications';
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

  const [stats, setStats]       = useState<ChatStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [insight, setInsight]   = useState<string | null>(null);
  const [recapPreview, setRecapPreview] = useState<string | null>(null);

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

    // Setup daily + weekly notifications (idempotent — safe to call every focus)
    setupNotifications(coachName, coachVibe).catch(() => {});
    // Reset the 2-day nudge timer — user is active right now
    scheduleMomentumNudge(coachName, coachVibe).catch(() => {});
  }, [user?.id, selectedCoachId, vibe, coachCustomName]));

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
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarInitial}>{coach.name[0]}</Text>
            </View>
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
              <View style={styles.insightAvatar}>
                <Text style={styles.insightAvatarInitial}>{coach.name[0]}</Text>
              </View>
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
    </SafeAreaView>
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
  coachAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coachAvatarInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 26,
    color: colors.backgroundPrimary,
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
  insightAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  insightAvatarInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 15,
    color: colors.backgroundPrimary,
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
