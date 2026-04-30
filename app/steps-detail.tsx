import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchWeekSteps, DailySteps } from '../src/services/health';
import { NavButton } from '../src/components/NavButton';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

function fmtDay(iso: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today)     return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return new Date(iso + 'T12:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function StepsDetailScreen() {
  const router = useRouter();
  const [weekSteps, setWeekSteps] = useState<DailySteps[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetchWeekSteps()
      .then(setWeekSteps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasData    = weekSteps.some((d) => d.steps > 0);
  const todaySteps = weekSteps.find((d) => d.date === new Date().toISOString().slice(0, 10))?.steps ?? 0;
  const weekTotal  = weekSteps.reduce((s, d) => s + d.steps, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <NavButton direction="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Steps</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Placeholder message */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="footsteps-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.infoTitle}>More step insights coming soon</Text>
            <Text style={styles.infoBody}>
              Full step history, goal tracking, and trends will be unlocked once your coach is running through a real iOS build. For now, here's what's available from your current session.
            </Text>
          </View>

          {hasData ? (
            <>
              {/* Quick totals */}
              <View style={styles.statsCard}>
                {[
                  { value: todaySteps.toLocaleString(), label: 'steps today' },
                  { value: weekTotal.toLocaleString(), label: 'steps this week' },
                ].map((s) => (
                  <View key={s.label} style={styles.statCell}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Daily breakdown */}
              <Text style={styles.sectionLabel}>THIS WEEK</Text>
              {[...weekSteps].reverse().map((d) => (
                <View key={d.date} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{fmtDay(d.date)}</Text>
                  <View style={styles.dayBarWrap}>
                    <View
                      style={[
                        styles.dayBar,
                        { width: `${Math.min((d.steps / 10000) * 100, 100)}%` as any },
                        d.steps >= 10000 && styles.dayBarGoal,
                      ]}
                    />
                  </View>
                  <Text style={styles.daySteps}>
                    {d.steps > 0 ? d.steps.toLocaleString() : '—'}
                  </Text>
                </View>
              ))}
              <Text style={styles.goalNote}>Bar fills at 10,000 step goal</Text>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No step data available yet.</Text>
              <Text style={styles.emptySubText}>
                Steps sync automatically when running on a real device with HealthKit access.
              </Text>
            </View>
          )}
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
    gap: spacing.base,
  },

  infoCard: {
    backgroundColor: 'rgba(216,255,62,0.06)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.2)',
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(216,255,62,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  infoBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 28,
    color: colors.accent,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
  },
  dayLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    width: 80,
  },
  dayBarWrap: {
    flex: 1,
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dayBar: {
    height: 6,
    backgroundColor: 'rgba(216,255,62,0.35)',
    borderRadius: 3,
    minWidth: 2,
  },
  dayBarGoal: {
    backgroundColor: colors.accent,
  },
  daySteps: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textPrimary,
    width: 52,
    textAlign: 'right',
  },
  goalNote: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  emptyState: { gap: spacing.sm, paddingTop: spacing.base },
  emptyText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
