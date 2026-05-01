import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
import { parseWorkoutDescription } from '../src/services/ai';
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
  const [showForm, setShowForm]         = useState(true);
  const [formType, setFormType]         = useState<ExerciseType>('strength');
  const [formName, setFormName]         = useState('');
  const [formSets, setFormSets]         = useState('3');
  const [formReps, setFormReps]         = useState('10');
  const [formWeight, setFormWeight]     = useState('');
  const [formUnit, setFormUnit]         = useState<'lbs' | 'kg'>('lbs');
  const [formDuration, setFormDuration] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formDistUnit, setFormDistUnit] = useState<'km' | 'mi'>('km');

  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  // Natural language mode
  const [inputMode, setInputMode] = useState<'structured' | 'describe'>('structured');
  const [nlText, setNlText]       = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const [nlError, setNlError]     = useState<string | null>(null);

  const resetForm = () => {
    setFormType('strength');
    setFormName('');
    setFormSets('3');
    setFormReps('10');
    setFormWeight('');
    setFormDuration('');
    setFormDistance('');
  };

  const canAddExercise = () => formName.trim().length > 0;

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

  const parseNl = async () => {
    if (!nlText.trim()) return;
    setNlParsing(true);
    setNlError(null);
    try {
      const parsed = await parseWorkoutDescription(nlText.trim());
      if (parsed.length === 0) {
        setNlError("Couldn't find any exercises in that description. Try being more specific.");
        return;
      }
      setExercises((prev) => [...prev, ...parsed]);
      setNlText('');
      setInputMode('structured');
    } catch {
      setNlError('Could not parse — check your connection and try again.');
    } finally {
      setNlParsing(false);
    }
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

      const shareExercises = exercises;
      const shareEffort = effort;
      const shareDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      });

      setExercises([]);
      setEffort(null);
      setNotes('');
      setShowForm(false);
      resetForm();

      router.push({
        pathname: '/workout-share',
        params: {
          exercises: JSON.stringify(shareExercises),
          effort: shareEffort != null ? String(shareEffort) : '',
          date: shareDate,
        },
      });
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

      {/* ── Header ─────────────────────────────────────── */}
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

      {/* ── Scrollable content ─────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* Input mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modePill, inputMode === 'structured' && styles.modePillActive]}
            onPress={() => { setInputMode('structured'); setNlError(null); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.modePillText, inputMode === 'structured' && styles.modePillTextActive]}>
              Structured
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, inputMode === 'describe' && styles.modePillActive]}
            onPress={() => { setInputMode('describe'); setShowForm(false); setNlError(null); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.modePillText, inputMode === 'describe' && styles.modePillTextActive]}>
              Describe workout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Natural language input */}
        {inputMode === 'describe' && (
          <View style={styles.nlPanel}>
            <Text style={styles.nlHint}>
              Type your workout in plain English — AI will parse it into exercises.
            </Text>
            <TextInput
              style={styles.nlInput}
              placeholder={'e.g. "3 sets bench press 135 lbs and a 2 mile run"'}
              placeholderTextColor={colors.textSecondary}
              value={nlText}
              onChangeText={(t) => { setNlText(t); setNlError(null); }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />
            {nlError && <Text style={styles.nlError}>{nlError}</Text>}
            <TouchableOpacity
              style={[styles.nlParseBtn, (!nlText.trim() || nlParsing) && styles.nlParseBtnDisabled]}
              onPress={parseNl}
              disabled={!nlText.trim() || nlParsing}
              activeOpacity={0.8}
            >
              {nlParsing ? (
                <ActivityIndicator color={colors.backgroundPrimary} size="small" />
              ) : (
                <Text style={styles.nlParseBtnText}>Log This Workout</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>EXERCISES</Text>

        {exercises.length === 0 && !showForm && inputMode === 'structured' && (
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

        {/* Inline form — only the form lives in the scroll area */}
        {showForm && (
          <View style={styles.addForm}>
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

            <View style={styles.nameGroup}>
              <Text style={styles.nameLabel}>
                Exercise name
              </Text>
              <TextInput
                style={[styles.nameInput, formName.trim() && styles.nameInputFilled]}
                placeholder={
                  formType === 'strength' ? 'e.g. Bench Press, Squat, Pull-ups' :
                  formType === 'cardio'   ? 'e.g. Running, Cycling, Rowing' :
                                            'e.g. Yoga, Stretching, HIIT'
                }
                placeholderTextColor={colors.textPrimary + '80'}
                value={formName}
                onChangeText={setFormName}
                autoCapitalize="words"
                returnKeyType="next"
                autoFocus
              />
            </View>

            {formType === 'strength' && (
              <View style={styles.fieldsRow}>
                <View style={styles.numericGroup}>
                  <Text style={styles.numericLabel}>SETS</Text>
                  <TextInput style={styles.numericInput} value={formSets} onChangeText={setFormSets} keyboardType="number-pad" selectTextOnFocus />
                </View>
                <Text style={styles.times}>×</Text>
                <View style={styles.numericGroup}>
                  <Text style={styles.numericLabel}>REPS</Text>
                  <TextInput style={styles.numericInput} value={formReps} onChangeText={setFormReps} keyboardType="number-pad" selectTextOnFocus />
                </View>
                <View style={[styles.numericGroup, styles.flexGroup]}>
                  <Text style={styles.numericLabel}>WEIGHT (optional)</Text>
                  <View style={styles.unitRow}>
                    <TextInput style={[styles.numericInput, styles.flexInput]} placeholder="—" placeholderTextColor={colors.textSecondary} value={formWeight} onChangeText={setFormWeight} keyboardType="decimal-pad" selectTextOnFocus />
                    <TouchableOpacity style={styles.unitToggle} onPress={() => setFormUnit((u) => (u === 'lbs' ? 'kg' : 'lbs'))}>
                      <Text style={styles.unitToggleText}>{formUnit}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {formType === 'cardio' && (
              <View style={styles.fieldsRow}>
                <View style={styles.numericGroup}>
                  <Text style={styles.numericLabel}>DURATION (optional)</Text>
                  <TextInput style={styles.numericInput} placeholder="30" placeholderTextColor={colors.textSecondary} value={formDuration} onChangeText={setFormDuration} keyboardType="number-pad" selectTextOnFocus />
                </View>
                <View style={[styles.numericGroup, styles.flexGroup]}>
                  <Text style={styles.numericLabel}>DISTANCE (optional)</Text>
                  <View style={styles.unitRow}>
                    <TextInput style={[styles.numericInput, styles.flexInput]} placeholder="—" placeholderTextColor={colors.textSecondary} value={formDistance} onChangeText={setFormDistance} keyboardType="decimal-pad" selectTextOnFocus />
                    <TouchableOpacity style={styles.unitToggle} onPress={() => setFormDistUnit((u) => (u === 'km' ? 'mi' : 'km'))}>
                      <Text style={styles.unitToggleText}>{formDistUnit}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {formType === 'other' && (
              <View style={styles.fieldsRow}>
                <View style={styles.numericGroup}>
                  <Text style={styles.numericLabel}>DURATION (min, optional)</Text>
                  <TextInput style={styles.numericInput} placeholder="—" placeholderTextColor={colors.textSecondary} value={formDuration} onChangeText={setFormDuration} keyboardType="number-pad" selectTextOnFocus />
                </View>
              </View>
            )}

          </View>
        )}

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

      {/* Action row — conditional rendering guarantees handlers always capture current state */}
      {showForm ? (
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
      ) : exercises.length > 0 ? (
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
          <Text style={styles.addExerciseBtnText}>Add another exercise</Text>
        </TouchableOpacity>
      ) : null}

      {/* ── Save button ─────────────────────────────────── */}
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
  exerciseName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.textPrimary },
  exerciseMeta: { fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary, marginTop: 3, letterSpacing: 0.3 },

  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm, borderWidth: 1 },
  typeBadge_strength: { borderColor: 'rgba(216,255,62,0.3)', backgroundColor: 'rgba(216,255,62,0.08)' },
  typeBadge_cardio:   { borderColor: 'rgba(255,106,61,0.3)', backgroundColor: 'rgba(255,106,61,0.08)' },
  typeBadge_other:    { borderColor: colors.border, backgroundColor: 'transparent' },
  typeBadgeText: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  typeBadgeText_strength: { color: colors.accent },
  typeBadgeText_cardio:   { color: colors.warmAccent },
  typeBadgeText_other:    { color: colors.textSecondary },

  addForm: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  typeSelector: { flexDirection: 'row', gap: spacing.sm },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
  },
  typePillSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  typePillText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  typePillTextSelected: { color: colors.backgroundPrimary },

  nameInput: {
    fontFamily: fonts.sansMedium,
    fontSize: 18,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
  nameInputFilled: {
    borderBottomColor: colors.accent,
  },

  fieldsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  numericGroup: { alignItems: 'center', gap: 4 },
  flexGroup: { flex: 1 },
  numericLabel: { fontFamily: fonts.mono, fontSize: 9, color: colors.textSecondary, letterSpacing: 1, textAlign: 'center' },
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
  times: { fontFamily: fonts.mono, fontSize: 18, color: colors.textSecondary, marginBottom: 6 },
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
  unitToggleText: { fontFamily: fonts.mono, fontSize: 12, color: colors.accent, letterSpacing: 0.5 },

  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundPrimary,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textSecondary },
  addBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: colors.backgroundPrimary, borderWidth: 1, borderColor: colors.border },
  addBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.backgroundPrimary },
  addBtnTextDisabled: { color: colors.textSecondary },

  // ── The button — plain, outside every container ──────────────────────
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundPrimary,
  },
  addExerciseBtnText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.accent },

  effortHint: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  effortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  effortChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  effortChipText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textSecondary },
  effortChipTextSelected: { color: colors.backgroundPrimary },

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

  // ── Mode toggle ─────────────────────────────────────────────────────────
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing['2xl'],
    gap: 3,
  },
  modePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  modePillActive: { backgroundColor: colors.accent },
  modePillText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  modePillTextActive: { color: colors.backgroundPrimary },

  // ── Natural language panel ────────────────────────────────────────────
  nlPanel: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.base,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  nlHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  nlInput: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    minHeight: 80,
    lineHeight: 22,
  },
  nlError: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warmAccent,
  },
  nlParseBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nlParseBtnDisabled: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nlParseBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.backgroundPrimary },

  // ── Name field ────────────────────────────────────────────────────────
  nameGroup: { gap: 6 },
  nameLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  nameRequired: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1,
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
  saveBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.backgroundPrimary },
  saveBtnTextDisabled: { color: colors.textSecondary },
});
