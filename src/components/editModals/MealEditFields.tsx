import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MealType, MEAL_LABELS } from '../../services/nutrition';
import { DateField } from '../DateField';
import { colors } from '../../constants/colors';
import { fonts, spacing, radii } from '../../constants/theme';

export type MealDraft = {
  mealType: MealType;
  body: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  date: string;
};

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MACRO_FIELDS: { key: keyof MealDraft; label: string }[] = [
  { key: 'calories', label: 'kcal'      },
  { key: 'protein',  label: 'protein g' },
  { key: 'carbs',    label: 'carbs g'   },
  { key: 'fat',      label: 'fat g'     },
];

interface Props {
  draft: MealDraft;
  onChange: (d: MealDraft) => void;
}

export function MealEditFields({ draft, onChange }: Props) {
  const set = (patch: Partial<MealDraft>) => onChange({ ...draft, ...patch });

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>MEAL TYPE</Text>
        <View style={styles.typeRow}>
          {MEAL_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typePill, draft.mealType === t && styles.typePillActive]}
              onPress={() => set({ mealType: t })}
              activeOpacity={0.7}
            >
              <Text style={[styles.typePillText, draft.mealType === t && styles.typePillTextActive]}>
                {MEAL_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
          style={styles.descInput}
          value={draft.body}
          onChangeText={(v) => set({ body: v })}
          multiline
          textAlignVertical="top"
          placeholder="What did you eat?"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>MACROS (optional)</Text>
        <View style={styles.macroRow}>
          {MACRO_FIELDS.map(({ key, label }) => (
            <View key={key} style={styles.macroCell}>
              <Text style={styles.macroLabel}>{label}</Text>
              <TextInput
                style={styles.macroInput}
                value={draft[key] as string}
                onChangeText={(v) => set({ [key]: v } as Partial<MealDraft>)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholder="—"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>NOTES</Text>
        <TextInput
          style={styles.notesInput}
          value={draft.notes}
          onChangeText={(v) => set({ notes: v })}
          multiline
          textAlignVertical="top"
          placeholder="Optional notes…"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <DateField value={draft.date} onChange={(v) => set({ date: v })} />
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  typePillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typePillText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textSecondary },
  typePillTextActive: { color: colors.backgroundPrimary },
  descInput: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    minHeight: 100,
    lineHeight: 23,
  },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroCell: { flex: 1, alignItems: 'center', gap: 4 },
  macroLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  macroInput: {
    width: '100%',
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
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
