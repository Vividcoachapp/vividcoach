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
import { saveWorkout, Exercise, ExerciseType } from '../src/services/workouts';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

const EFFORT_LABELS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Light', 4: 'Moderate', 5: 'Challenging',
  6: 'Hard', 7: 'Very hard', 8: 'Heavy', 9: 'Max effort', 10: 'All out',
};

const TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio',   label: 'Cardio' },
  { value: 'other',    label: 'Other' },
];

export default function LogWorkoutScreen() {
  const router = useRouter();
  const { selectedCoachId, coachCustomName } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;

  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType]     = useState<ExerciseType>('strength');
  const [formName, setFormName]     = useState('');
  const [formSets, setFormSets]     = useState('3');
  const [formReps, setFormReps]     = useState('10');
  const [formWeight, setFormWeight] = useState('');
  const [formUnit, setFormUnit]     = useState<'lbs' | 'kg'>('lbs');
  const [formDuration, setFormDuration]         = useState('');
  const [formDistance, setFormDistance]         = useState('');
  const [formDistUnit, setFormDistUnit]         = useState<'km' | 'mi'>('km');

  // Effort + notes
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormType('strength');
    setFormName('');
    setFormSets('3');
    setFormReps('10');
    setFormWeight('');
    setFormDuration('');
    setFormDistance('');
  };

  const canAddExercise = () => {
    if (!formName.trim()) return false;
    if (formType === 'strength') return true;       // sets/reps have defaults
    if (formType === 'cardio')   return !!formDuration.trim();
    return true;                                    // Other: name is enough
  };

  const handleAddExercise = () => {
    if (!canAddExercise()) return;

    const ex: Exercise = { name: formName.trim(), type: formType };

    if (formType === 'strength') {
      ex.sets = Math.max(1, parseInt(formSets) || 1);
      ex.reps = Math.max(1, parseInt(formReps) || 1);
      if (formWeight.trim()) { ex.weight = parseFloat(formWeight); ex.unit = formUnit; }
    } else if (formType === 'cardio') {
      ex.duration_minutes = Math.max(1, parseInt(formDuration) || 1);
      if (formDistance.trim()) { ex.distance = parseFloat(formDistance); ex.distance_unit = formDistUnit; }
    } else {
      if (formDuration.trim()) ex.duration_minutes = Math.max(1, parseInt(formDuration) || 1);
    }

    setExercises((prev) => [...prev, ex]);
    resetForm();
    setShowForm(false);
  };

  const removeExercise = (index: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (exercises.length === 0) {
      Alert.alert('Add an exercise', 'Log at least one exercise before saving.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveWorkout(user.id, coach.id, exercises, effort, notes);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const exerciseSummary = (ex: Exercise): string => {
    if (!ex.type || ex.type === 'strength') {
      const wt = ex.weight ? ` · ${ex.weight} ${ex.unit ?? 'lbs'}` : '';
      return `${ex.sets} sets × ${ex.reps} reps${wt}`;
    }
    if (ex.type === 'cardio') {
      const dur = ex.duration_minutes ? `${ex.duration_minutes} min` : '';
      const dist = ex.distance ? ` · ${ex.distance} ${ex.distance_unit ?? 'km'}` : '';
      return `${dur}${dist}`;
    }
    return ex.duration_minutes ? `${ex.duration_minutes} min` : 'Logged';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const saveEnabled = exercises.length > 0 && !saving;

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
            <Text style={styles.headerTitle}>Log Workout</Text>
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
          {/* ── Exercise list ──────────────────────────── */}
          <Text style={styles.sectionLabel}>EXERCISES</Text>

          {exercises.length === 0 && !showForm && (
            <Text style={styles.emptyHint}>What did you do with {displayName} today?</Text>
          )}

          {exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <View style={styles.exerciseInfo}>
                <View style={styles.exerciseNameRow}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <View style={[styles.typeBadge, styles[`typeBadge_${ex.type ?? 'strength'}`]]}>
                    <Text style={[styles.typeBadgeText, styles[`typeBadgeText_${ex.type ?? 'strength'}`]]}>
                      {(ex.type ?? 'strength').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.exerciseMeta}>{exerciseSummary(ex)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}

          {/* ── Inline add-exercise form ─────────────── */}
          {showForm ? (
            <View style={styles.addForm}>
              {/* Type selector */}
              <View style={styles.typeSelector}>
                {TYPES.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.typePill, formType === value && styles.typePillSelected]}
                    onPress={() => { setFormType(value); setFormDuration(''); setFormDistance(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typePillText, formType === value && styles.typePillTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name */}
              <TextInput
                style={styles.nameInput}
                placeholder={
                  formType === 'strength' ? 'Exercise name (e.g. Bench Press)' :
                  formType === 'cardio'   ? 'Activity (e.g. Running, Cycling)' :
                                           'Activity (e.g. Yoga, Stretching)'
                }
                placeholderTextColor={colors.textSecondary}
                value={formName}
                onChangeText={setFormName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
              />

              {/* ── Strength fields ── */}
              {formType === 'strength' && (
                <View style={styles.fieldsRow}>
                  <View style={styles.numericGroup}>
                    <Text style={styles.numericLabel}>SETS</Text>
                    <TextInput
                      style={styles.numericInput}
                      value={formSets}
                      onChangeText={setFormSets}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.times}>×</Text>
                  <View style={styles.numericGroup}>
                    <Text style={styles.numericLabel}>REPS</Text>
                    <TextInput
                      style={styles.numericInput}
                      value={formReps}
                      onChangeText={setFormReps}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                  <View style={[styles.numericGroup, styles.flexGroup]}>
                    <Text style={styles.numericLabel}>WEIGHT (optional)</Text>
                    <View style={styles.unitRow}>
                      <TextInput
                        style={[styles.numericInput, styles.flexInput]}
                        placeholder="—"
                        placeholderTextColor={colors.textSecondary}
                        value={formWeight}
                        onChangeText={setFormWeight}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.unitToggle}
                        onPress={() => setFormUnit((u) => (u === 'lbs' ? 'kg' : 'lbs'))}
                      >
                        <Text style={styles.unitToggleText}>{formUnit}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* ── Cardio fields ── */}
              {formType === 'cardio' && (
                <View style={styles.fieldsRow}>
                  <View style={styles.numericGroup}>
                    <Text style={styles.numericLabel}>DURATION (min)</Text>
                    <TextInput
                      style={styles.numericInput}
                      placeholder="30"
                      placeholderTextColor={colors.textSecondary}
                      value={formDuration}
                      onChangeText={setFormDuration}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                  <View style={[styles.numericGroup, styles.flexGroup]}>
                    <Text style={styles.numericLabel}>DISTANCE (optional)</Text>
                    <View style={styles.unitRow}>
                      <TextInput
                        style={[styles.numericInput, styles.flexInput]}
                        placeholder="—"
                        placeholderTextColor={colors.textSecondary}
                        value={formDistance}
                        onChangeText={setFormDistance}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.unitToggle}
                        onPress={() => setFormDistUnit((u) => (u === 'km' ? 'mi' : 'km'))}
                      >
                        <Text style={styles.unitToggleText}>{formDistUnit}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* ── Other fields ── */}
              {formType === 'other' && (
                <View style={styles.fieldsRow}>
                  <View style={styles.numericGroup}>
                    <Text style={styles.numericLabel}>DURATION (min, optional)</Text>
                    <TextInput
                      style={styles.numericInput}
                      placeholder="—"
                      placeholderTextColor={colors.textSecondary}
                      value={formDuration}
                      onChangeText={setFormDuration}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              )}

              {/* Form buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { resetForm(); setShowForm(false); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addBtn, !canAddExercise() && styles.addBtnDisabled]}
                  onPress={handleAddExercise}
                  disabled={!canAddExercise()}
                >
                  <Text style={[styles.addBtnText, !canAddExercise() && styles.addBtnTextDisabled]}>
                    Add exercise
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.addExerciseBtnText}>Add exercise</Text>
            </TouchableOpacity>
          )}

          {/* ── Perceived effort ───────────────────────── */}
          {exercises.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>HOW DID IT FEEL?</Text>
              <Text style={styles.effortHint}>
                {effort ? `${effort}/10 — ${EFFORT_LABELS[effort]}` : '1 = easy · 10 = everything you had'}
              </Text>
              <View style={styles.effortRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.effortChip, effort === n && styles.effortChipSelected]}
                    onPress={() => setEffort(effort === n ? null : n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.effortChipText, effort === n && styles.effortChipTextSelected]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
                NOTES FOR {displayName.toUpperCase()}
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Anything your coach should know about this session…"
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, !saveEnabled && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!saveEnabled}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.backgroundPrimary} />
            ) : (
              <Text style={[styles.saveBtnText, !saveEnabled && styles.saveBtnTextDisabled]}>
                Save workout
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
  sectionLabelGap: { marginTop: spacing['2xl'] },

  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.base,
    lineHeight: 21,
  },

  // Exercise rows
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  exerciseInfo: { flex: 1 },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  exerciseName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  exerciseMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    letterSpacing: 0.3,
  },

  // Type badges on logged exercises
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  typeBadge_strength: {
    borderColor: 'rgba(216,255,62,0.3)',
    backgroundColor: 'rgba(216,255,62,0.08)',
  },
  typeBadge_cardio: {
    borderColor: 'rgba(255,106,61,0.3)',
    backgroundColor: 'rgba(255,106,61,0.08)',
  },
  typeBadge_other: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  typeBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
  },
  typeBadgeText_strength: { color: colors.accent },
  typeBadgeText_cardio:   { color: colors.warmAccent },
  typeBadgeText_other:    { color: colors.textSecondary },

  // Add-exercise form
  addForm: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },

  // Type selector
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
  },
  typePillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typePillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  typePillTextSelected: {
    color: colors.backgroundPrimary,
  },

  // Name input
  nameInput: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },

  // Numeric fields row
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  numericGroup: { alignItems: 'center', gap: 4 },
  flexGroup: { flex: 1 },
  numericLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  numericInput: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    minWidth: 52,
  },
  times: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  unitRow: { flexDirection: 'row', gap: spacing.xs },
  flexInput: { flex: 1 },
  unitToggle: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggleText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.5,
  },

  // Form action buttons
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Enabled: chartreuse #d8ff3e with dark text
  // Disabled: dark card background with muted text — no opacity trick
  addBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.backgroundPrimary,
  },
  addBtnTextDisabled: {
    color: colors.textSecondary,
  },

  // "+ Add exercise" trigger
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
  },
  addExerciseBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.accent,
  },

  // Effort chips
  effortHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  effortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  effortChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  effortChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  effortChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  effortChipTextSelected: {
    color: colors.backgroundPrimary,
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
  // Enabled: chartreuse. Disabled: dark card — no opacity trick
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
