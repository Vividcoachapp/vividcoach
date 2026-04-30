import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
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

// ── Time helpers ───────────────────────────────────────────────────────────────

function timeToMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
}

function stepTime(hhmm: string, delta: 1 | -1): string {
  return minsToTime((timeToMins(hhmm) + delta * 30 + 1440) % 1440);
}

// ── TimePicker ─────────────────────────────────────────────────────────────────

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={pickerStyles.row}>
      <Text style={pickerStyles.label}>{label}</Text>
      <View style={pickerStyles.controls}>
        <TouchableOpacity
          onPress={() => onChange(stepTime(value, -1))}
          style={pickerStyles.btn}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={pickerStyles.value}>{formatDisplay(value)}</Text>
        <TouchableOpacity
          onPress={() => onChange(stepTime(value, 1))}
          style={pickerStyles.btn}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
  },
  label: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.textPrimary },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 241, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.textPrimary,
    minWidth: 76,
    textAlign: 'center',
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuietHoursScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { selectedCoachId, coachCustomName, vibe } = useOnboardingStore();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const p = user?.id ? await fetchAndCachePrefs(user.id) : await getCachedPrefs();
      setPrefs(p);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      if (user?.id) await savePrefs(user.id, prefs);
      const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
      await setupNotifications(coachCustomName || coach.name, vibe ?? 'warm');
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Error', 'Could not save quiet hours. Try again.');
    }
  };

  const header = (
    <View style={styles.header}>
      <NavButton direction="back" onPress={() => router.back()} />
      <Text style={styles.headerTitle}>Quiet Hours</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (prefs == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>QUIET HOURS WINDOW</Text>
        <View style={styles.group}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable quiet hours</Text>
            <Switch
              value={prefs.quietEnabled}
              onValueChange={(v) => setPrefs({ ...prefs, quietEnabled: v })}
              trackColor={{ false: 'rgba(244, 241, 234, 0.12)', true: colors.accent }}
              thumbColor={colors.textPrimary}
              ios_backgroundColor="rgba(244, 241, 234, 0.12)"
            />
          </View>
        </View>

        {prefs.quietEnabled && (
          <>
            <Text style={[styles.sectionLabel, styles.sectionGap]}>DO NOT DISTURB</Text>
            <View style={styles.group}>
              <TimePicker
                label="Start time"
                value={prefs.quietStart}
                onChange={(v) => setPrefs({ ...prefs, quietStart: v })}
              />
              <View style={styles.groupDivider} />
              <TimePicker
                label="End time"
                value={prefs.quietEnd}
                onChange={(v) => setPrefs({ ...prefs, quietEnd: v })}
              />
            </View>
            <Text style={styles.hint}>
              Notifications scheduled inside this window will be skipped until the window closes.
              Overnight ranges (e.g. 9:00 PM – 9:00 AM) are supported.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  sectionGap: { marginTop: spacing['2xl'] },
  group: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
  },
  toggleLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.textPrimary },
  groupDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.base,
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
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.backgroundPrimary,
  },
});
