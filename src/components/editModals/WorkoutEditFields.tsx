import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Exercise, ExerciseType } from '../../services/workouts';
import { DateField } from '../DateField';
import { colors } from '../../constants/colors';
import { fonts, spacing, radii } from '../../constants/theme';

export type WorkoutDraft = {
  exercises: Exercise[];
  perceived_effort: number | null;
  notes: string;
  date: string;
};

const TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio',   label: 'Cardio'   },
  { value: 'other',    label: 'Other'    },
];

const EFFORT_LABELS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Light', 4: 'Moderate', 5: 'Challenging',
  6: 'Hard', 7: 'Very hard', 8: 'Heavy', 9: 'Max effort', 10: 'All out',
};

interface Props {
  draft: WorkoutDraft;
  onChange: (d: WorkoutDraft) => void;
}

export function WorkoutEditFields({ draft, onChange }: Props) {
  const set = (patch: Partial<WorkoutDraft>) => onChange({ ...draft, ...patch });

  const [showForm,     setShowForm]     = useState(false);
  const [formType,     setFormType]     = useState<ExerciseType>('strength');
  const [formName,     setFormName]     = useState('');
  const [formSets,     setFormSets]     = useState('3');
  const [formReps,     setFormReps]     = useState('10');
  const [formWeight,   setFormWeight]   = useState('');
  const [formUnit,     setFormUnit]     = useState<'lbs' | 'kg'>('lbs');
  const [formDuration, setFormDuration] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formDistUnit, setFormDistUnit] = useState<'km' | 'mi'>('km');

  const resetForm = () => {
    setFormType('strength'); setFormName('');
    setFormSets('3'); setFormReps('10');
    setFormWeight(''); setFormDuration(''); setFormDistance('');
  };

  const handleAddExercise = () => {
    if (!formName.trim()) return;
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
    set({ exercises: [...draft.exercises, ex] });
    resetForm();
    setShowForm(false);
  };

  const removeExercise = (i: number) =>
    set({ exercises: draft.exercises.filter((_, idx) => idx !== i) });

  const summary = (ex: Exercise): string => {
    if (!ex.type || ex.type === 'strength') {
      const wt = ex.weight ? ` · ${ex.weight} ${ex.unit ?? 'lbs'}` : '';
      return `${ex.sets} × ${ex.reps}${wt}`;
    }
    if (ex.type === 'cardio') {
      const dur  = ex.duration_minutes ? `${ex.duration_minutes} min` : '';
      const dist = ex.distance ? ` · ${ex.distance} ${ex.distance_unit ?? 'km'}` : '';
      return `${dur}${dist}`.trim();
    }
    return ex.duration_minutes ? `${ex.duration_minutes} min` : '';
  };

  return (
    <>
      {/* ── Exercises ───────────────────────────────────────────── */}
      <View style={styles.field}>
        <Text style={styles.label}>EXERCISES</Text>

        {draft.exercises.map((ex, i) => (
          <View key={i} style={styles.exRow}>
            <View style={styles.exInfo}>
              <View style={styles.exNameRow}>
                <Text style={styles.exName}>{ex.name}</Text>
                <View style={[styles.badge, styles[`badge_${ex.type ?? 'strength'}`]]}>
                  <Text style={[styles.badgeText, styles[`badgeText_${ex.type ?? 'strength'}`]]}>
                    {(ex.type ?? 'strength').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.exMeta}>{summary(ex)}</Text>
            </View>
            <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}

        {showForm ? (
          <View style={styles.addForm}>
            <View style={styles.typeSelector}>
              {TYPES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.typePill, formType === value && styles.typePillSelected]}
                  onPress={() => setFormType(value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typePillText, formType === value && styles.typePillTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.nameGroup}>
              <Text style={styles.nameLabel}>NAME</Text>
              <TextInput
                style={[styles.nameInput, formName.trim() && styles.nameInputFilled]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Exercise name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            {formType === 'strength' && (
              <View style={styles.fieldsRow}>
                <View style={styles.numGroup}>
                  <Text style={styles.numLabel}>SETS</Text>
                  <TextInput style={styles.numInput} value={formSets} onChangeText={setFormSets} keyboardType="number-pad" selectTextOnFocus />
                </View>
                <Text style={styles.times}>×</Text>
                <View style={styles.numGroup}>
                  <Text style={styles.numLabel}>REPS</Text>
                  <TextInput style={styles.numInput} value={formReps} onChangeText={setFormReps} keyboardType="number-pad" selectTextOnFocus />
                </View>
                <View style={[styles.numGroup, styles.flex1]}>
                  <Text style={styles.numLabel}>WEIGHT</Text>
                  <View style={styles.unitRow}>
                    <TextInput style={[styles.numInput, styles.flex1]} placeholder="—" placeholderTextColor={colors.textSecondary} value={formWeight} onChangeText={setFormWeight} keyboardType="decimal-pad" selectTextOnFocus />
                    <TouchableOpacity style={styles.unitToggle} onPress={() => setFormUnit((u) => u === 'lbs' ? 'kg' : 'lbs')}>
                      <Text style={styles.unitToggleText}>{formUnit}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {formType === 'cardio' && (
              <View style={styles.fieldsRow}>
                <View style={styles.numGroup}>
                  <Text style={styles.numLabel}>DURATION</Text>
                  <TextInput style={styles.numInput} placeholder="30" placeholderTextColor={colors.textSecondary} value={formDuration} onChangeText={setFormDuration} keyboardType="number-pad" selectTextOnFocus />
                </View>
                <View style={[styles.numGroup, styles.flex1]}>
                  <Text style={styles.numLabel}>DISTANCE</Text>
                  <View style={styles.unitRow}>
                    <TextInput style={[styles.numInput, styles.flex1]} placeholder="—" placeholderTextColor={colors.textSecondary} value={formDistance} onChangeText={setFormDistance} keyboardType="decimal-pad" selectTextOnFocus />
                    <TouchableOpacity style={styles.unitToggle} onPress={() => setFormDistUnit((u) => u === 'km' ? 'mi' : 'km')}>
                      <Text style={styles.unitToggleText}>{formDistUnit}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {formType === 'other' && (
              <View style={styles.fieldsRow}>
                <View style={styles.numGroup}>
                  <Text style={styles.numLabel}>DURATION (min)</Text>
                  <TextInput style={styles.numInput} placeholder="—" placeholderTextColor={colors.textSecondary} value={formDuration} onChangeText={setFormDuration} keyboardType="number-pad" selectTextOnFocus />
                </View>
              </View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setShowForm(false); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, !formName.trim() && styles.addBtnDisabled]}
                onPress={handleAddExercise}
                disabled={!formName.trim()}
              >
                <Text style={[styles.addBtnText, !formName.trim() && styles.addBtnTextDisabled]}>
                  Add exercise
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addExBtn} onPress={() => setShowForm(true)} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={17} color={colors.accent} />
            <Text style={styles.addExBtnText}>Add exercise</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Perceived effort ────────────────────────────────────── */}
      <View style={styles.field}>
        <Text style={styles.label}>EFFORT</Text>
        {draft.perceived_effort != null && (
          <Text style={styles.effortHint}>
            {draft.perceived_effort}/10 — {EFFORT_LABELS[draft.perceived_effort]}
          </Text>
        )}
        <View style={styles.effortRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.effortChip, draft.perceived_effort === n && styles.effortChipOn]}
              onPress={() => set({ perceived_effort: draft.perceived_effort === n ? null : n })}
              activeOpacity={0.7}
            >
              <Text style={[styles.effortChipText, draft.perceived_effort === n && styles.effortChipTextOn]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Notes ───────────────────────────────────────────────── */}
      <View style={styles.field}>
        <Text style={styles.label}>NOTES</Text>
        <TextInput
          style={styles.notesInput}
          value={draft.notes}
          onChangeText={(v) => set({ notes: v })}
          multiline
          textAlignVertical="top"
          placeholder="Session notes…"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* ── Date ────────────────────────────────────────────────── */}
      <DateField value={draft.date} onChange={(v) => set({ date: v })} />
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5 },

  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  exInfo:    { flex: 1 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  exName:    { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.textPrimary },
  exMeta:    { fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary, marginTop: 2, letterSpacing: 0.3 },

  badge:              { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm, borderWidth: 1 },
  badge_strength:     { borderColor: 'rgba(216,255,62,0.3)', backgroundColor: 'rgba(216,255,62,0.08)' },
  badge_cardio:       { borderColor: 'rgba(255,106,61,0.3)', backgroundColor: 'rgba(255,106,61,0.08)' },
  badge_other:        { borderColor: colors.border, backgroundColor: 'transparent' },
  badgeText:          { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  badgeText_strength: { color: colors.accent },
  badgeText_cardio:   { color: colors.warmAccent },
  badgeText_other:    { color: colors.textSecondary },

  addForm: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.base,
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
  typePillSelected:     { backgroundColor: colors.accent, borderColor: colors.accent },
  typePillText:         { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  typePillTextSelected: { color: colors.backgroundPrimary },

  nameGroup:      { gap: 6 },
  nameLabel:      { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 1 },
  nameInput:      { fontFamily: fonts.sansMedium, fontSize: 17, color: colors.textPrimary, borderBottomWidth: 2, borderBottomColor: colors.border, paddingBottom: spacing.sm, paddingTop: 2 },
  nameInputFilled:{ borderBottomColor: colors.accent },

  fieldsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  numGroup:  { alignItems: 'center', gap: 4 },
  flex1:     { flex: 1 },
  numLabel:  { fontFamily: fonts.mono, fontSize: 9, color: colors.textSecondary, letterSpacing: 1, textAlign: 'center' },
  numInput: {
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
  times:          { fontFamily: fonts.mono, fontSize: 18, color: colors.textSecondary, marginBottom: 6 },
  unitRow:        { flexDirection: 'row', gap: spacing.xs },
  unitToggle:     { backgroundColor: colors.backgroundPrimary, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  unitToggleText: { fontFamily: fonts.mono, fontSize: 12, color: colors.accent, letterSpacing: 0.5 },

  formActions:        { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:          { flex: 1, paddingVertical: 11, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText:      { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  addBtn:             { flex: 2, paddingVertical: 11, borderRadius: radii.md, backgroundColor: colors.accent, alignItems: 'center' },
  addBtnDisabled:     { backgroundColor: colors.backgroundPrimary, borderWidth: 1, borderColor: colors.border },
  addBtnText:         { fontFamily: fonts.sansBold, fontSize: 13, color: colors.backgroundPrimary },
  addBtnTextDisabled: { color: colors.textSecondary },

  addExBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.base, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.backgroundSecondary },
  addExBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.accent },

  effortHint:       { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary },
  effortRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  effortChip:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  effortChipOn:     { backgroundColor: colors.accent, borderColor: colors.accent },
  effortChipText:   { fontFamily: fonts.sansBold, fontSize: 13, color: colors.textSecondary },
  effortChipTextOn: { color: colors.backgroundPrimary },

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
});
