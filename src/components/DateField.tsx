import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { fonts, spacing, radii } from '../constants/theme';

interface Props {
  label?: string;
  value: string;            // ISO YYYY-MM-DD; empty string → defaults to today
  onChange: (iso: string) => void;
}

function isoToDate(iso: string): Date {
  const src = iso || new Date().toISOString().slice(0, 10);
  const d = new Date(src + 'T12:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplay(iso: string): string {
  return isoToDate(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function DateField({ label = 'DATE', value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (selected) onChange(dateToIso(selected));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.row, open && Platform.OS === 'ios' && styles.rowOpen]}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.dateText}>{formatDisplay(value)}</Text>
        <Ionicons
          name={open && Platform.OS === 'ios' ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <DateTimePicker
          value={isoToDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          maximumDate={new Date()}
          themeVariant="dark"
          style={Platform.OS === 'ios' ? styles.picker : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    paddingHorizontal: spacing.base,
  },
  rowOpen: {
    borderColor: colors.accent,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dateText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  picker: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.accent,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
});
