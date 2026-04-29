import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { useAuthStore } from '../src/stores/authStore';
import { ALL_COACHES } from '../src/constants/coaches';
import { updateCoachCustomName } from '../src/services/profile';
import { NavButton } from '../src/components/NavButton';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

export default function RenameCoachScreen() {
  const router = useRouter();
  const { selectedCoachId, coachCustomName, setCoachCustomName } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = ALL_COACHES.find((c) => c.id === selectedCoachId) ?? ALL_COACHES[0];
  const [name, setName] = useState(coachCustomName || coach.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user?.id) return;
    setSaving(true);
    try {
      await updateCoachCustomName(user.id, trimmed);
      setCoachCustomName(trimmed);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <NavButton direction="back" onPress={() => router.back()} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rename coach</Text>
          <Text style={styles.headerSub}>{coach.name}'s display name</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Body */}
      <View style={styles.content}>
        <Text style={styles.fieldLabel}>NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={coach.name}
          placeholderTextColor={colors.textSecondary}
          maxLength={20}
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        <Text style={styles.hint}>
          Call {coach.name} whatever feels right to you. Max 20 characters.
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.backgroundPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Save name</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerSpacer: { width: 44 },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.3 },

  content: {
    padding: spacing.xl,
    gap: spacing.md,
  },

  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  input: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.backgroundSecondary,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
  },

  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textSecondary,
  },
});
