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
import { saveWorkout, Exercise } from '../src/services/workouts';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

const EFFORT_LABELS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Light', 4: 'Moderate', 5: 'Challenging',
  6: 'Hard', 7: 'Very hard', 8: 'Heavy', 9: 'Max effort', 10: 'All out',
};

export default function LogWorkoutScreen() {
  const router = useRouter();
  const { selectedCoachId, coachCustomName } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;

  // Exercises list
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Add-exercise form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSets, setFormSets] = useState('3');
  const [formReps, setFormReps] = useState('10');
  const [formWeight, setFormWeight] = useState('');
  const [formUnit, setFormUnit] = useState<'lbs' | 'kg'>('lbs');

  // Effort + notes
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddExercise = () => {
    if (!formName.trim()) return;
    const ex: Exercise = {
      name: formName.trim(),
      sets: Math.max(1, parseInt(formSets) || 1),
      reps: Math.max(1, parseInt(formReps) || 1),
    };
    if (formWeight.trim()) {
      ex.weight = parseFloat(formWeight);
      ex.unit = formUnit;
    }
    setExercises((prev) => [...prev, ex]);
    setFormName('');
    setFormSets('3');
    setFormReps('10');
    setFormWeight('');
    setShowForm(false);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

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
      Alert.alert('Error', 'Could not save workout. Check your connection and try again.');
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
          {/* ── Exercises ──────────────────────────────── */}
          <Text style={styles.sectionLabel}>EXERCISES</Text>

          {exercises.length === 0 && !showForm && (
            <Text style={styles.emptyHint}>
              What did you do with {displayName} today?
            </Text>
          )}

          {exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {ex.sets} sets × {ex.reps} reps
                  {ex.weight ? ` · ${ex.weight} ${ex.unit ?? 'lbs'}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Inline add-exercise form */}
          {showForm ? (
            <View style={styles.addForm}>
              <TextInput
                style={styles.nameInput}
                placeholder="Exercise name (e.g. Bench Press)"
                placeholderTextColor={colors.textSecondary}
                value={formName}
                onChangeText={setFormName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
              />

              <View style={styles.setsRepsRow}>
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
                <View style={[styles.numericGroup, styles.weightGroup]}>
                  <Text style={styles.numericLabel}>WEIGHT</Text>
                  <View style={styles.weightRow}>
                    <TextInput
                      style={[styles.numericInput, styles.weightInput]}
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

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addBtn, !formName.trim() && styles.addBtnDisabled]}
                  onPress={handleAddExercise}
                  disabled={!formName.trim()}
                >
                  <Text style={styles.addBtnText}>Add exercise</Text>
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
                    onPress={() => setEffort(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.effortChipText, effort === n && styles.effortChipTextSelected]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Notes ──────────────────────────────── */}
              <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>NOTES FOR {displayName.toUpperCase()}</Text>
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
            style={[
              styles.saveBtn,
              (exercises.length === 0 || saving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={exercises.length === 0 || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.backgroundPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Save workout</Text>
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

  // Add exercise form
  addForm: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  nameInput: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  setsRepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  numericGroup: { alignItems: 'center', gap: 4 },
  weightGroup: { flex: 1 },
  numericLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1,
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
  weightRow: { flexDirection: 'row', gap: spacing.xs },
  weightInput: { flex: 1 },
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
  addBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.backgroundPrimary,
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

  // Effort
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
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
  },
});
