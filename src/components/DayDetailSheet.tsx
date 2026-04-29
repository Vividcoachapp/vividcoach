import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WorkoutLog, exerciseMeta } from '../services/workouts';
import { MealLog, mealTypeFromDescription } from '../services/nutrition';
import { WeightLog } from '../services/weight';
import { colors } from '../constants/colors';
import { fonts, spacing, radii } from '../constants/theme';

const DOT_W  = '#d8ff3e';
const DOT_M  = '#f5a623';
const DOT_LB = '#7b9cff';

function friendlyDate(iso: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today)     return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return new Date(iso + 'T12:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export interface DayDetailSheetProps {
  date: string;
  workouts: WorkoutLog[];
  meals: MealLog[];
  weights: WeightLog[];
  onClose: () => void;
}

export function DayDetailSheet({
  date, workouts, meals, weights, onClose,
}: DayDetailSheetProps) {
  const insets = useSafeAreaInsets();

  const dayWorkouts = workouts.filter((w) => w.date === date);
  const dayMeals    = meals.filter((m) => m.date === date);
  const dayWeights  = weights.filter((w) => w.date === date);
  const isEmpty     = dayWorkouts.length === 0 && dayMeals.length === 0 && dayWeights.length === 0;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.pill} />
          <Text style={styles.dateText}>{friendlyDate(date)}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {isEmpty && (
            <Text style={styles.empty}>Nothing logged on this day.</Text>
          )}

          {dayWorkouts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <View style={[styles.dot, { backgroundColor: DOT_W }]} />
                <Text style={styles.sectionLabel}>WORKOUT</Text>
              </View>
              {dayWorkouts.map((w) => (
                <View key={w.id} style={styles.item}>
                  {w.exercises.map((e, i) => {
                    const meta = exerciseMeta(e);
                    return (
                      <Text key={i} style={styles.itemText}>
                        <Text style={styles.itemName}>{e.name}</Text>
                        {meta ? <Text style={styles.itemMeta}>{'  '}{meta}</Text> : null}
                      </Text>
                    );
                  })}
                  {w.perceived_effort != null && (
                    <Text style={styles.effort}>Effort {w.perceived_effort}/10</Text>
                  )}
                  {w.notes ? <Text style={styles.notes}>{w.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {dayMeals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <View style={[styles.dot, { backgroundColor: DOT_M }]} />
                <Text style={styles.sectionLabel}>MEALS</Text>
              </View>
              {dayMeals.map((m) => {
                const colonIdx = m.meal_description.indexOf(':');
                const body = colonIdx !== -1
                  ? m.meal_description.slice(colonIdx + 1).trim()
                  : m.meal_description;
                const type = mealTypeFromDescription(m.meal_description).toUpperCase();
                return (
                  <View key={m.id} style={styles.item}>
                    <Text style={styles.mealType}>{type}</Text>
                    <Text style={styles.itemText}>{body}</Text>
                    {m.calories_kcal != null && (
                      <Text style={styles.macros}>
                        ~{m.calories_kcal} kcal · {Math.round(m.protein_g ?? 0)}g protein
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {dayWeights.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <View style={[styles.dot, { backgroundColor: DOT_LB }]} />
                <Text style={styles.sectionLabel}>WEIGHT</Text>
              </View>
              {dayWeights.map((w) => (
                <Text key={w.id} style={styles.itemText}>
                  {w.value} {w.unit}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pill: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    left: '50%',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginLeft: -18,
  },
  dateText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  closeBtn: { width: 32, alignItems: 'flex-end' },
  scroll: { flexGrow: 0 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.base,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  section: { gap: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  item: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: 4,
  },
  itemText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  itemName: { fontFamily: fonts.sansMedium, color: colors.textPrimary },
  itemMeta: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary },
  effort: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent, letterSpacing: 0.5 },
  notes: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  mealType: { fontFamily: fonts.mono, fontSize: 10, color: DOT_M, letterSpacing: 1 },
  macros: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent, letterSpacing: 0.3 },
});
