import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../src/stores/authStore';
import { saveWeight, fetchWeightLogs, fetchLatestWeight, WeightLog, WeightUnit } from '../src/services/weight';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

// ── Inline line chart ─────────────────────────────────────────────────────────
function WeightChart({ logs }: { logs: WeightLog[] }) {
  const { width } = useWindowDimensions();
  const SCREEN_PAD = 48;
  const W = width - SCREEN_PAD;
  const H = 150;
  const L = 38; // left pad for y labels
  const R = 8;
  const T = 8;
  const B = 18; // bottom pad for x labels
  const plotW = W - L - R;
  const plotH = H - T - B;

  if (logs.length === 0) return null;

  const vals = logs.map((l) => l.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const range = rawMax - rawMin;
  const pad = range < 1 ? 1.5 : range * 0.2;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const xOf = (i: number) =>
    L + (logs.length === 1 ? plotW / 2 : (i / (logs.length - 1)) * plotW);
  const yOf = (v: number) => T + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const pts = logs.map((l, i) => ({ x: xOf(i), y: yOf(l.value) }));
  const ptStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 3 y-axis ticks
  const ticks = [rawMax, (rawMin + rawMax) / 2, rawMin].map(
    (v) => Math.round(v * 10) / 10,
  );

  const fmt = (d: string) =>
    new Date(d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Svg width={W} height={H}>
      {ticks.map((t, i) => (
        <Line
          key={i}
          x1={L} y1={yOf(t)}
          x2={W - R} y2={yOf(t)}
          stroke="rgba(244,241,234,0.08)"
          strokeWidth={1}
        />
      ))}
      {ticks.map((t, i) => (
        <SvgText
          key={i}
          x={L - 4}
          y={yOf(t) + 4}
          textAnchor="end"
          fontSize={9}
          fill="#8c8a82"
        >
          {t}
        </SvgText>
      ))}
      {logs.length > 1 && (
        <Polyline
          points={ptStr}
          fill="none"
          stroke="#d8ff3e"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#d8ff3e" />
      ))}
      {logs.length > 0 && (
        <SvgText x={L} y={H - 2} fontSize={9} fill="#8c8a82" textAnchor="middle">
          {fmt(logs[0].date)}
        </SvgText>
      )}
      {logs.length > 1 && (
        <SvgText x={W - R} y={H - 2} fontSize={9} fill="#8c8a82" textAnchor="end">
          {fmt(logs[logs.length - 1].date)}
        </SvgText>
      )}
    </Svg>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function LogWeightScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [unit, setUnit]             = useState<WeightUnit>('lbs');
  const [value, setValue]           = useState('');
  const [logs, setLogs]             = useState<WeightLog[]>([]);
  const [todayLog, setTodayLog]     = useState<WeightLog | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [latest, history] = await Promise.all([
        fetchLatestWeight(user.id),
        fetchWeightLogs(user.id, unit, 90),
      ]);
      if (latest) setUnit(latest.unit);
      setLogs(history);
      const existing = history.find((l) => l.date === today) ?? null;
      setTodayLog(existing);
      if (existing) setValue(String(existing.value));
    } catch {}
    finally { setLoading(false); }
  }, [user?.id, unit]);

  useEffect(() => { load(); }, [user?.id]);

  // Reload history when unit changes
  const switchUnit = async (u: WeightUnit) => {
    setUnit(u);
    setValue('');
    if (!user?.id) return;
    try {
      const history = await fetchWeightLogs(user.id, u, 90);
      setLogs(history);
      const existing = history.find((l) => l.date === today) ?? null;
      setTodayLog(existing);
      if (existing) setValue(String(existing.value));
    } catch {}
  };

  const handleSave = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid number greater than 0.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveWeight(user.id, num, unit);
      await load();
      setValue('');
    } catch {
      Alert.alert('Error', 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Trend badge
  const trend = (() => {
    if (logs.length < 2) return null;
    const diff = logs[logs.length - 1].value - logs[0].value;
    if (Math.abs(diff) < 0.5) return { label: 'Stable', icon: 'remove-outline', color: colors.textSecondary };
    return diff < 0
      ? { label: `↓ ${Math.abs(diff).toFixed(1)} ${unit}`, icon: 'trending-down-outline', color: colors.accent }
      : { label: `↑ ${Math.abs(diff).toFixed(1)} ${unit}`, icon: 'trending-up-outline', color: colors.warmAccent };
  })();

  const canSave = value.trim() !== '' && !isNaN(parseFloat(value)) && parseFloat(value) > 0 && !saving;

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Weight</Text>
          <Text style={styles.headerDate}>{todayLabel}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Entry card ──────────────────────────────── */}
        <View style={styles.entryCard}>
          {todayLog && (
            <Text style={styles.todayNote}>
              Already logged today: {todayLog.value} {unit}. Log again to add another entry.
            </Text>
          )}

          <View style={styles.entryRow}>
            <TextInput
              style={styles.weightInput}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={colors.textSecondary}
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {/* lbs / kg toggle */}
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitBtn, unit === 'lbs' && styles.unitBtnSelected]}
                onPress={() => switchUnit('lbs')}
              >
                <Text style={[styles.unitBtnText, unit === 'lbs' && styles.unitBtnTextSelected]}>lbs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, unit === 'kg' && styles.unitBtnSelected]}
                onPress={() => switchUnit('kg')}
              >
                <Text style={[styles.unitBtnText, unit === 'kg' && styles.unitBtnTextSelected]}>kg</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.backgroundPrimary} />
            ) : (
              <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>
                Log weight
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Chart ───────────────────────────────────── */}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>
              Log your first weight above — your trend will appear here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionLabel}>YOUR TREND</Text>
              {trend && (
                <View style={[styles.trendBadge, { borderColor: trend.color + '55', backgroundColor: trend.color + '18' }]}>
                  <Text style={[styles.trendBadgeText, { color: trend.color }]}>{trend.label}</Text>
                </View>
              )}
            </View>
            <View style={styles.chartWrap}>
              <WeightChart logs={logs} />
            </View>

            {/* ── Recent entries ───────────────────────── */}
            <Text style={[styles.sectionLabel, styles.sectionGap]}>
              RECENT ENTRIES ({unit})
            </Text>
            {[...logs].reverse().slice(0, 14).map((l) => {
              const d = new Date(l.date + 'T12:00');
              const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <View key={l.id} style={styles.entryListRow}>
                  <Text style={styles.entryListDate}>{dateStr}</Text>
                  <Text style={styles.entryListValue}>{l.value} <Text style={styles.entryListUnit}>{unit}</Text></Text>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  headerDate: { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.3 },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.base,
  },

  // Entry card
  entryCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  todayNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weightInput: {
    flex: 1,
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 52,
    color: colors.accent,
    paddingVertical: 0,
  },
  unitToggle: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  unitBtnSelected: { backgroundColor: colors.accent },
  unitBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textSecondary },
  unitBtnTextSelected: { color: colors.backgroundPrimary },

  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.backgroundPrimary },
  saveBtnTextDisabled: { color: colors.textSecondary },

  loadingState: { paddingTop: spacing['3xl'], alignItems: 'center' },

  emptyChart: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyChartText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Chart
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  trendBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  trendBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  chartWrap: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing['2xl'],
  },
  sectionGap: { marginBottom: spacing.md },

  // Recent entries list
  entryListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryListDate: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
  entryListValue: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.textPrimary },
  entryListUnit: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary },

  bottomSpacer: { height: spacing.xl },
});
