import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { FREE_COACHES } from '../../src/constants/coaches';
import { getCoachImages } from '../../src/constants/coachImages';
import { Button } from '../../src/components/ui/Button';
import { Shimmer } from '../../src/components/ui/Shimmer';
import { setupNotifications, scheduleMomentumNudge } from '../../src/services/notifications';
import {
  fetchHealthSnapshot, HealthSnapshot, EMPTY_SNAPSHOT,
  requestStepPermission, formatSleep,
} from '../../src/services/health';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

const TAB_BAR_HEIGHT = 60;
const TOP_ZONE_RATIO = 0.6;

/** First-token, capitalize-first-letter, truncate-at-12. Returns '' for empty. */
function firstName(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const first = trimmed.split(/\s+/)[0];
  const cap = first.charAt(0).toUpperCase() + first.slice(1);
  return cap.length > 12 ? cap.slice(0, 12) : cap;
}

export default function HomeScreen() {
  const router = useRouter();
  const { name, goals, constraints, selectedCoachId, coachCustomName, vibe } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);
  const { height: SCREEN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;
  const fName = firstName(name);

  const usableH = SCREEN_H - insets.top - TAB_BAR_HEIGHT;
  const topZoneH = Math.round(usableH * TOP_ZONE_RATIO);

  const [insight, setInsight] = useState<string | null>(null);
  const [obsLoaded, setObsLoaded] = useState(false);
  const [recapPreview, setRecapPreview] = useState<string | null>(null);
  const [healthSnap, setHealthSnap] = useState<HealthSnapshot>(EMPTY_SNAPSHOT);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // On every focus: refresh UI data, setup notifications, reset nudge timer.
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;

    setObsLoaded(false);
    const obsKey = `@obs_text_${user.id}_${(FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0]).id}`;
    AsyncStorage.getItem(obsKey)
      .then((v) => { setInsight(v); setObsLoaded(true); })
      .catch(() => setObsLoaded(true));

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

  const hasGoals = goals.trim().length > 0;
  const images = getCoachImages(coach.imageKey);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top zone: coach photo (left) + greeting/observation (right) ── */}
        <View style={[styles.topZone, { height: topZoneH }]}>
          <TouchableOpacity
            style={styles.coachColumn}
            onPress={() => router.navigate('/train')}
            activeOpacity={1}
            accessibilityLabel={`Chat with ${displayName}`}
            accessibilityRole="button"
          >
            {images?.full ? (
              <Image source={images.full} style={styles.coachImage} resizeMode="contain" />
            ) : (
              <View style={styles.coachFallback}>
                <Text style={styles.coachFallbackInitial}>{coach.name[0]}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.rightColumn}>
            <Text style={styles.greeting}>
              {fName ? `Hey ${fName},` : 'Hey there,'}
            </Text>
            <ScrollView
              style={styles.observationScroll}
              contentContainerStyle={styles.observationContent}
              showsVerticalScrollIndicator={false}
            >
              {!obsLoaded ? (
                <View style={styles.observationLoading}>
                  <Shimmer width="75%" height={14} />
                  <Shimmer width="85%" height={14} style={{ marginTop: 6 }} />
                  <Shimmer width="50%" height={14} style={{ marginTop: 6 }} />
                </View>
              ) : insight ? (
                <Text style={styles.observation}>{insight}</Text>
              ) : (
                <Text style={styles.observationEmpty}>
                  Your coach is paying attention. As you log workouts, meals, and weight, {displayName} will share what she's noticing.
                </Text>
              )}
            </ScrollView>
          </View>

          {/* Soft fade — short + light, just enough to soften the photo's
              hard bottom-crop edge without obscuring observation text. */}
          <LinearGradient
            colors={['transparent', 'rgba(14, 16, 15, 0.4)']}
            style={styles.topZoneFade}
            pointerEvents="none"
          />
        </View>

        {/* ── Goal card ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.eyebrow}>YOUR GOAL</Text>
          {hasGoals ? (
            <>
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
            </>
          ) : (
            <Text style={styles.goalEmpty}>
              What are you working toward? Tell {displayName} in your next chat.
            </Text>
          )}
        </View>

        {/* ── Health card ───────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.healthHeader}>
            <Ionicons name="pulse-outline" size={13} color={colors.accent} />
            <Text style={styles.eyebrow}>HEALTH · AUTO-SYNCED</Text>
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

        {/* ── Recap card ────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.navigate('/weekly-recap')}
          activeOpacity={0.85}
        >
          <Text style={styles.eyebrow}>WEEKLY RECAP</Text>
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
            <Button
              label="Allow health access"
              onPress={handleHealthAllow}
              variant="primary"
            />
            <Button
              label="Not now"
              onPress={handleHealthDismiss}
              variant="secondary"
              style={{ marginTop: spacing.sm }}
            />
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
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },

  // ── Top zone ────────────────────────────────────────────
  topZone: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
    backgroundColor: '#0a0b0a',
    marginBottom: spacing.base,
    gap: 14,
  },
  coachColumn: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#0a0b0a',
  },
  // Cutout PNGs (transparent backgrounds) — render full figure scaled to fit the
  // column. Empty space on whichever axis the column exceeds the image's 9:16
  // aspect; transparent silhouette around the figure shows the column's bg.
  coachImage: {
    width: '100%',
    height: '100%',
  },
  coachFallback: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0b0a',
  },
  coachFallbackInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 80,
    color: colors.backgroundPrimary,
  },
  rightColumn: {
    flex: 1,
    paddingRight: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  observationScroll: {
    flex: 1,
  },
  observationContent: {
    paddingBottom: spacing.md,
  },
  greeting: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  observation: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  observationEmpty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  observationLoading: {
    paddingTop: 4,
  },
  topZoneFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },

  // ── Cards ──────────────────────────────────────────────
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
    marginHorizontal: spacing.xl,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.5,
  },

  // Goal card
  goalText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 23,
  },
  goalEmpty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
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
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthMetric: { flex: 1, alignItems: 'center', gap: 4 },
  healthMetricValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  healthMetricInactive: { color: colors.textSecondary },
  healthMetricLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
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

  // Recap card
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
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'right',
  },

  // ── Health permission modal ───────────────────────────
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
});
