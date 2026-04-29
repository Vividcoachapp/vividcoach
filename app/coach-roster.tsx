import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { useAuthStore } from '../src/stores/authStore';
import { useUserStore } from '../src/stores/userStore';
import { ALL_COACHES, Coach, CoachVibe } from '../src/constants/coaches';
import { CoachAvatar } from '../src/components/CoachAvatar';
import { saveCoachSelection } from '../src/services/profile';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

type VibeFilter = 'all' | CoachVibe;

// ── Coach card ────────────────────────────────────────────────────────────────
function CoachCard({
  coach,
  isCurrent,
  isSelected,
  isLocked,
  onPress,
}: {
  coach: Coach;
  isCurrent: boolean;
  isSelected: boolean;
  isLocked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCurrent && styles.cardCurrent,
        isSelected && !isCurrent && styles.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Avatar */}
      <CoachAvatar coach={coach} variant="portrait" size={44} style={isLocked ? { opacity: 0.4 } : undefined} />

      {/* Body */}
      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={[styles.cardName, isLocked && styles.mutedText]}>{coach.name}</Text>
          <View style={[styles.vibePill, isLocked && styles.vibePillLocked]}>
            <Text style={[styles.vibeText, isLocked && styles.vibeTextLocked]}>
              {coach.vibe.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardMeta, isLocked && styles.mutedText]}>
          {coach.gender === 'F' ? 'Woman' : 'Man'} · {coach.age} · {coach.bodyType}
        </Text>
        <Text style={[styles.cardBio, isLocked && styles.mutedText]} numberOfLines={2}>
          {coach.bio}
        </Text>
      </View>

      {/* Right status */}
      <View style={styles.cardRight}>
        {isLocked ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
            <Text style={styles.lockText}>PRO</Text>
          </View>
        ) : isCurrent ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
        ) : isSelected ? (
          <Ionicons name="radio-button-on" size={22} color={colors.accent} />
        ) : (
          <Ionicons name="radio-button-off" size={22} color={colors.border} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CoachRosterScreen() {
  const router = useRouter();
  const { selectedCoachId, setSelectedCoach, setVibe } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);
  const { isPremium } = useUserStore();

  const [filter, setFilter] = useState<VibeFilter>('all');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered =
    filter === 'all' ? ALL_COACHES : ALL_COACHES.filter((c) => c.vibe === filter);

  const handleTap = (coach: Coach) => {
    if (coach.tier === 'premium' && !isPremium) {
      Alert.alert(
        `${coach.name} is a Premium coach`,
        'Upgrade to unlock all 14 premium coaches and more.',
        [
          { text: 'Maybe later', style: 'cancel' },
          {
            text: 'See Premium',
            onPress: () =>
              router.push({ pathname: '/paywall', params: { trigger: 'coach-roster' } }),
          },
        ],
      );
      return;
    }
    // Toggle: tapping the current coach deselects pending
    setPendingId((prev) => (coach.id === prev || coach.id === selectedCoachId ? null : coach.id));
  };

  const handleSwitch = async () => {
    const coach = ALL_COACHES.find((c) => c.id === pendingId);
    if (!coach || !user?.id) return;
    setSaving(true);
    try {
      await saveCoachSelection(user.id, coach.id, coach.name, coach.vibe);
      setSelectedCoach(coach.id, coach.name);
      setVibe(coach.vibe);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not switch coaches. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const pendingCoach = ALL_COACHES.find((c) => c.id === pendingId);
  const showFooter = pendingId !== null && pendingId !== selectedCoachId;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choose your coach</Text>
          <Text style={styles.headerSub}>15 free · 15 more with Premium</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {(['all', 'warm', 'direct', 'intense'] as VibeFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.listContent, showFooter && { paddingBottom: 104 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Free section */}
        {(filter === 'all' || filtered.some((c) => c.tier === 'free')) && (
          <>
            {filter === 'all' && (
              <Text style={styles.sectionLabel}>FREE COACHES</Text>
            )}
            {filtered.filter((c) => c.tier === 'free').map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                isCurrent={coach.id === selectedCoachId}
                isSelected={coach.id === pendingId}
                isLocked={false}
                onPress={() => handleTap(coach)}
              />
            ))}
          </>
        )}

        {/* Premium section */}
        {(filter === 'all' || filtered.some((c) => c.tier === 'premium')) && (
          <>
            <View style={styles.premiumHeader}>
              {filter === 'all' && (
                <Text style={styles.sectionLabel}>PREMIUM COACHES</Text>
              )}
              {!isPremium && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({ pathname: '/paywall', params: { trigger: 'coach-roster' } })
                  }
                >
                  <Text style={styles.upgradeCta}>Upgrade →</Text>
                </TouchableOpacity>
              )}
            </View>
            {filtered.filter((c) => c.tier === 'premium').map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                isCurrent={coach.id === selectedCoachId}
                isSelected={coach.id === pendingId}
                isLocked={!isPremium}
                onPress={() => handleTap(coach)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Sticky footer */}
      {showFooter && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.switchBtn, saving && styles.switchBtnDisabled]}
            onPress={handleSwitch}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.backgroundPrimary} />
            ) : (
              <Text style={styles.switchBtnText}>
                Switch to {pendingCoach?.name} →
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.textPrimary },
  headerSub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.backgroundPrimary,
  },

  scroll: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  upgradeCta: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.accent,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  // Coach card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardCurrent: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(216,255,62,0.05)',
  },
  cardSelected: {
    borderColor: colors.accent,
  },

  cardBody: { flex: 1, gap: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  cardName: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  vibePill: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radii.full,
    backgroundColor: 'rgba(216,255,62,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.3)',
  },
  vibePillLocked: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  vibeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: 1,
  },
  vibeTextLocked: { color: colors.textSecondary },

  cardMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  cardBio: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 1,
  },
  mutedText: { opacity: 0.5 },

  cardRight: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  lockBadge: {
    alignItems: 'center',
    gap: 2,
  },
  lockText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  switchBtnDisabled: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
  },
});
