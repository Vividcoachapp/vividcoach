import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../src/stores/authStore';
import { fetchWeightLogs, WeightLog } from '../src/services/weight';
import { WeightChart } from '../src/components/WeightChart';
import { NavButton } from '../src/components/NavButton';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

type RangeKey = '7d' | '30d' | '90d' | 'all';

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7d',  label: '7d',  days: 7  },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'all', label: 'All', days: null },
];

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function WeightDetailScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();

  const [allLogs, setAllLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState<RangeKey>('30d');

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      const [lb, kg] = await Promise.all([
        fetchWeightLogs(user.id, 'lbs', 3650),
        fetchWeightLogs(user.id, 'kg',  3650),
      ]);
      setAllLogs(lb.length >= kg.length ? lb : kg);
      setLoading(false);
    })();
  }, [user?.id]);

  const logs = (() => {
    const r = RANGES.find((x) => x.key === range)!;
    if (!r.days) return allLogs;
    const cutoff = new Date(Date.now() - r.days * 86400000).toISOString().slice(0, 10);
    return allLogs.filter((l) => l.date >= cutoff);
  })();

  const current  = logs[logs.length - 1];
  const earliest = logs[0];
  const unit     = current?.unit ?? 'lbs';
  const change   = current && earliest && logs.length >= 2
    ? current.value - earliest.value : null;
  const hi = logs.length > 0 ? Math.max(...logs.map((l) => l.value)) : null;
  const lo = logs.length > 0 ? Math.min(...logs.map((l) => l.value)) : null;
  const chartWidth = width - spacing.xl * 2 - spacing.base * 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <NavButton direction="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Weight</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Range pills */}
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.pill, range === r.key && styles.pillActive]}
                onPress={() => setRange(r.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, range === r.key && styles.pillTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No weight data in this range.</Text>
            </View>
          ) : (
            <>
              {/* Chart */}
              <View style={styles.card}>
                <WeightChart logs={logs} width={chartWidth} height={220} />
              </View>

              {/* Stats */}
              <View style={styles.statsCard}>
                {[
                  {
                    label: 'current',
                    value: current ? `${current.value} ${unit}` : '—',
                    color: undefined,
                  },
                  {
                    label: 'change',
                    value: change != null
                      ? `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}`
                      : '—',
                    color: change != null
                      ? (change < 0 ? colors.accent : colors.warmAccent)
                      : undefined,
                  },
                  {
                    label: 'highest',
                    value: hi != null ? `${hi} ${unit}` : '—',
                    color: undefined,
                  },
                  {
                    label: 'lowest',
                    value: lo != null ? `${lo} ${unit}` : '—',
                    color: undefined,
                  },
                ].map((s) => (
                  <View key={s.label} style={styles.statCell}>
                    <Text style={[styles.statValue, s.color ? { color: s.color } : null]}>
                      {s.value}
                    </Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Entry list */}
              <Text style={[styles.sectionLabel, styles.sectionGap]}>ENTRIES</Text>
              {[...logs].reverse().map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.entryRow}
                  onPress={() =>
                    Alert.alert('Edit coming soon', 'Editing weight entries will be available in a future update.')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.entryDate}>{fmtDate(log.date)}</Text>
                  <Text style={styles.entryValue}>{log.value} {log.unit}</Text>
                </TouchableOpacity>
              ))}
            </>
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
  },

  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.backgroundPrimary,
  },

  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.base,
  },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
    textAlign: 'center',
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
    marginBottom: spacing.md,
  },
  sectionGap: { marginTop: spacing['2xl'] },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  entryDate: { fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary },
  entryValue: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent },

  emptyState: { paddingTop: spacing['3xl'], alignItems: 'center' },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
});
