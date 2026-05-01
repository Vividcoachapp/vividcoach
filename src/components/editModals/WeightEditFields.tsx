import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { WeightUnit } from '../../services/weight';
import { DateField } from '../DateField';
import { colors } from '../../constants/colors';
import { fonts, spacing, radii } from '../../constants/theme';

export type WeightDraft = { value: string; unit: WeightUnit; date: string };

interface Props {
  draft: WeightDraft;
  onChange: (d: WeightDraft) => void;
}

export function WeightEditFields({ draft, onChange }: Props) {
  const set = (patch: Partial<WeightDraft>) => onChange({ ...draft, ...patch });

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>WEIGHT</Text>
        <View style={styles.valueRow}>
          <TextInput
            style={styles.valueInput}
            value={draft.value}
            onChangeText={(v) => set({ value: v })}
            keyboardType="decimal-pad"
            selectTextOnFocus
            autoFocus
          />
          <View style={styles.unitToggle}>
            {(['lbs', 'kg'] as WeightUnit[]).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, draft.unit === u && styles.unitBtnActive]}
                onPress={() => set({ unit: u })}
                activeOpacity={0.7}
              >
                <Text style={[styles.unitBtnText, draft.unit === u && styles.unitBtnTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  valueInput: {
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
  unitBtnActive: { backgroundColor: colors.accent },
  unitBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textSecondary },
  unitBtnTextActive: { color: colors.backgroundPrimary },
});
