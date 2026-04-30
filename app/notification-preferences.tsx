import { View, Text, Switch, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../src/stores/authStore';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { NavButton } from '../src/components/NavButton';
import {
  NotificationPrefs,
  getCachedPrefs,
  fetchAndCachePrefs,
  savePrefs,
} from '../src/services/notificationPrefs';
import { setupNotifications } from '../src/services/notifications';
import { FREE_COACHES } from '../src/constants/coaches';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

type ToggleKey = 'notifyCheckin' | 'notifyNudge' | 'notifyRecap';

const ROWS: { key: ToggleKey; label: string; sub: string }[] = [
  { key: 'notifyCheckin', label: 'Daily check-in',  sub: 'Every day at 8 AM' },
  { key: 'notifyNudge',   label: 'Momentum nudge',  sub: '2 days after your last log' },
  { key: 'notifyRecap',   label: 'Weekly recap',    sub: 'Every Monday at 9 AM' },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { selectedCoachId, coachCustomName, vibe } = useOnboardingStore();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    (async () => {
      const p = user?.id ? await fetchAndCachePrefs(user.id) : await getCachedPrefs();
      setPrefs(p);
    })();
  }, [user?.id]);

  const handleToggle = async (key: ToggleKey, val: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    if (user?.id) await savePrefs(user.id, next);
    const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
    await setupNotifications(coachCustomName || coach.name, vibe ?? 'warm');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <NavButton direction="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {prefs == null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>NOTIFICATION TYPES</Text>
          <View style={styles.group}>
            {ROWS.map(({ key, label, sub }, i) => (
              <View key={key} style={[styles.row, i < ROWS.length - 1 && styles.rowBorder]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowSub}>{sub}</Text>
                </View>
                <Switch
                  value={prefs[key]}
                  onValueChange={(v) => handleToggle(key, v)}
                  trackColor={{ false: 'rgba(244, 241, 234, 0.12)', true: colors.accent }}
                  thumbColor={colors.textPrimary}
                  ios_backgroundColor="rgba(244, 241, 234, 0.12)"
                />
              </View>
            ))}
          </View>

          <Text style={styles.hint}>
            Quiet hours apply on top of these settings. Notifications scheduled inside your quiet window will be skipped.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 44 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  group: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1, gap: 3 },
  rowLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.textPrimary },
  rowSub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    lineHeight: 16,
    marginTop: spacing.xl,
    paddingHorizontal: 4,
  },
});
