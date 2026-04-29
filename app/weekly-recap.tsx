import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { useAuthStore } from '../src/stores/authStore';
import { FREE_COACHES } from '../src/constants/coaches';
import { CoachAvatar } from '../src/components/CoachAvatar';
import { generateWeeklyRecap } from '../src/services/ai';
import { fetchRecentWorkouts } from '../src/services/workouts';
import { fetchRecentMeals } from '../src/services/nutrition';
import { fetchWeightLogs } from '../src/services/weight';
import { buildUnifiedContext, hasRecentData } from '../src/services/context';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

// ── Date helpers ──────────────────────────────────────────────────────────────
function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekRange(): string {
  const start = new Date(getWeekStart() + 'T12:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function WeeklyRecapScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { name: userName, goals, constraints, customConstraint, selectedCoachId, coachCustomName, vibe } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;
  const allConstraints = [...constraints, ...(customConstraint.trim() ? [customConstraint.trim()] : [])];

  const [recap, setRecap]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState({ workouts: 0, meals: 0, weight: '--', unit: 'lbs', activeDays: 0 });
  const weekRange = getWeekRange();
  const weekStart = getWeekStart();
  const cacheKey = user?.id ? `@recap_${user.id}_${weekStart}` : null;

  useEffect(() => {
    (async () => {
      // Check cache first
      if (cacheKey) {
        const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
        if (cached) { setRecap(cached); setLoading(false); }
      }

      if (!user?.id) { setLoading(false); return; }

      // Fetch data
      const cutoff = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const [workouts, meals, lbsW, kgW] = await Promise.all([
        fetchRecentWorkouts(user.id, 20),
        fetchRecentMeals(user.id, 30),
        fetchWeightLogs(user.id, 'lbs', 30),
        fetchWeightLogs(user.id, 'kg', 30),
      ]);

      const weights = lbsW.length >= kgW.length ? lbsW : kgW;
      const unit = weights[0]?.unit ?? 'lbs';
      const wkWorkouts = workouts.filter((w) => w.date >= cutoff);
      const wkMeals    = meals.filter((m) => m.date >= cutoff);
      const wkWeights  = weights.filter((w) => w.date >= cutoff);

      const activeDates = new Set([
        ...wkWorkouts.map((w) => w.date),
        ...wkMeals.map((m) => m.date),
        ...wkWeights.map((w) => w.date),
      ]);

      const latestWeight = wkWeights.length > 0
        ? wkWeights[wkWeights.length - 1].value.toFixed(1)
        : '--';

      setStats({
        workouts: wkWorkouts.length,
        meals: wkMeals.length,
        weight: latestWeight,
        unit,
        activeDays: activeDates.size,
      });

      // Generate if no cache
      if (!recap && hasRecentData(workouts, meals, weights)) {
        try {
          const ctx = buildUnifiedContext(workouts, meals, weights);
          const text = await generateWeeklyRecap(
            coach.name, coach.bio, vibe ?? 'warm',
            userName, goals, allConstraints, ctx,
          );
          setRecap(text);
          if (cacheKey) await AsyncStorage.setItem(cacheKey, text).catch(() => {});
        } catch {
          setRecap("I couldn't generate your recap right now — check your connection and try again.");
        }
      } else if (!recap) {
        setRecap("Nothing logged this week yet. Start tracking and I'll put together a full recap for you.");
      }

      setLoading(false);
    })();
  }, [user?.id]);

  const handleSaveToPhotos = () => {
    Alert.alert(
      'Save your recap',
      'Take a screenshot to save your recap card to Photos.',
      [{ text: 'Got it', style: 'default' }],
    );
  };

  const handleShare = async () => {
    if (!recap) return;
    await Share.share({
      title: `My VividCoach Weekly Recap — ${weekRange}`,
      message: `${weekRange}\n\n${recap}\n\n— Coached by ${displayName} · VividCoach`,
    });
  };

  const handleRegenerate = async () => {
    if (!user?.id || !cacheKey) return;
    setLoading(true);
    setRecap(null);
    await AsyncStorage.removeItem(cacheKey).catch(() => {});
    // Trigger re-fetch by re-running the useEffect logic
    // Easiest: just reload
    try {
      const [workouts, meals, lbsW, kgW] = await Promise.all([
        fetchRecentWorkouts(user.id, 20),
        fetchRecentMeals(user.id, 30),
        fetchWeightLogs(user.id, 'lbs', 30),
        fetchWeightLogs(user.id, 'kg', 30),
      ]);
      const weights = lbsW.length >= kgW.length ? lbsW : kgW;
      const ctx = buildUnifiedContext(workouts, meals, weights);
      const text = await generateWeeklyRecap(
        coach.name, coach.bio, vibe ?? 'warm',
        userName, goals, allConstraints, ctx,
      );
      setRecap(text);
      await AsyncStorage.setItem(cacheKey, text).catch(() => {});
    } catch {
      setRecap("Couldn't regenerate right now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const vibeLabel = vibe ? { warm: 'WARM', direct: 'DIRECT', intense: 'INTENSE' }[vibe] : 'WARM';
  const cardWidth = width - 2 * 24;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Weekly Recap</Text>
          <Text style={styles.headerDate}>{weekRange}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>
              {displayName} is reviewing your week…
            </Text>
          </View>
        ) : (
          <>
            {/* ── Share card ─────────────────────────── */}
            <View style={[styles.card, { width: cardWidth }]}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardBrand}>VividCoach</Text>
                <Text style={styles.cardWeek}>{weekRange}</Text>
              </View>

              <View style={styles.divider} />

              {/* Coach identity */}
              <View style={styles.coachRow}>
                <CoachAvatar coach={coach} variant="small" size={40} />
                <View style={styles.coachInfo}>
                  <Text style={styles.coachName}>{displayName}</Text>
                  <Text style={styles.coachVibe}>{vibeLabel} COACH</Text>
                </View>
              </View>

              {/* Recap text */}
              <Text style={styles.recapText}>{recap}</Text>

              <View style={styles.divider} />

              {/* Stats */}
              <View style={styles.statsRow}>
                {[
                  { value: String(stats.workouts), label: 'workouts' },
                  { value: String(stats.meals),    label: 'meals' },
                  { value: `${stats.weight}`, label: stats.unit },
                  { value: `${stats.activeDays}/7`, label: 'active days' },
                ].map((s, i) => (
                  <View key={i} style={styles.statCell}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              {/* Card footer */}
              <Text style={styles.cardFooter}>
                Coached by {displayName} · VividCoach
              </Text>
            </View>

            {/* ── Action buttons ─────────────────────── */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSave]}
                onPress={handleSaveToPhotos}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={16} color={colors.backgroundPrimary} />
                <Text style={styles.actionBtnSaveText}>Save to Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnShare]}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.actionBtnShareText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => router.navigate('/train')}
              activeOpacity={0.85}
            >
              <Text style={styles.chatBtnText}>Chat with {displayName} about this week →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.regenLink} onPress={handleRegenerate}>
              <Text style={styles.regenLinkText}>Regenerate recap</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.textPrimary },
  headerDate: { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.3 },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['5xl'],
    alignItems: 'center',
  },

  loadingState: { paddingTop: spacing['5xl'], alignItems: 'center', gap: spacing.xl },
  loadingText: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },

  // Share card
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.35)',
    padding: spacing.xl,
    gap: spacing.base,
    marginBottom: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBrand: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.accent,
  },
  cardWeek: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  coachAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  coachAvatarInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 20, color: colors.backgroundPrimary,
  },
  coachInfo: { gap: 2 },
  coachName: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.textPrimary },
  coachVibe: {
    fontFamily: fonts.mono, fontSize: 9, color: colors.accent, letterSpacing: 1.5,
  },
  recapText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCell: { alignItems: 'center', gap: 3 },
  statValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22, color: colors.accent, lineHeight: 26,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 8, color: colors.textSecondary, letterSpacing: 0.5, textAlign: 'center',
  },
  cardFooter: {
    fontFamily: fonts.mono,
    fontSize: 9, color: colors.textSecondary, letterSpacing: 0.5, textAlign: 'center',
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.base,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm,
    borderRadius: radii.md, paddingVertical: 14,
  },
  actionBtnSave: { backgroundColor: colors.accent },
  actionBtnShare: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.border,
  },
  actionBtnSaveText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.backgroundPrimary },
  actionBtnShareText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textPrimary },

  chatBtn: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, alignItems: 'center',
    marginBottom: spacing.xl,
  },
  chatBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textSecondary },

  regenLink: { paddingVertical: spacing.sm },
  regenLinkText: {
    fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary,
    letterSpacing: 0.5, textDecorationLine: 'underline',
  } as const,
});
