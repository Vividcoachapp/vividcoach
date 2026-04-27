import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { useAuthStore } from '../src/stores/authStore';
import { FREE_COACHES } from '../src/constants/coaches';
import { saveMeal, MealType, MEAL_LABELS, defaultMealType } from '../src/services/nutrition';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function LogMealScreen() {
  const router = useRouter();
  const { selectedCoachId, coachCustomName } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;

  const [mealType, setMealType]       = useState<MealType>(defaultMealType());
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);

  const canSave = description.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);
    try {
      await saveMeal(user.id, mealType, description, notes);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save meal. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Log Meal</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Meal type ──────────────────────────────── */}
          <Text style={styles.sectionLabel}>MEAL TYPE</Text>
          <View style={styles.typeRow}>
            {MEAL_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, mealType === t && styles.typePillSelected]}
                onPress={() => setMealType(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typePillText, mealType === t && styles.typePillTextSelected]}>
                  {MEAL_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Description ────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>WHAT DID YOU EAT?</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder={
              `Describe your ${MEAL_LABELS[mealType].toLowerCase()} — be as specific or general as you like.\n\ne.g. "Grilled chicken with roasted veggies and a side salad"`
            }
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          {/* ── Notes for coach ────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>
            NOTES FOR {displayName.toUpperCase()} (optional)
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Anything worth mentioning — how you felt, why you ate it, cravings…"
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
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
                Save meal
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  flex: { flex: 1 },

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
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  headerDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.base,
  },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  sectionGap: { marginTop: spacing['2xl'] },

  // Meal type pills
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  typePillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typePillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  typePillTextSelected: {
    color: colors.backgroundPrimary,
  },

  // Description
  descriptionInput: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.base,
    minHeight: 140,
    lineHeight: 24,
  },

  // Notes
  notesInput: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    minHeight: 80,
    lineHeight: 22,
  },

  bottomSpacer: { height: spacing.xl },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundPrimary,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
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
  saveBtnTextDisabled: {
    color: colors.textSecondary,
  },
});
