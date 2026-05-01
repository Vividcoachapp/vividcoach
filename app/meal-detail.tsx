import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { MealLog, fetchMealById, mealTypeFromDescription, formatMealDate,
         updateMealLog, deleteMealLog, MEAL_LABELS, MealType } from '../src/services/nutrition';
import { LogEditModal } from '../src/components/LogEditModal';
import { MealEditFields, MealDraft } from '../src/components/editModals/MealEditFields';
import { NavButton } from '../src/components/NavButton';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f5a623', lunch: '#7ed321', dinner: '#9b59b6', snack: '#4a90e2',
};

export default function MealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [meal,     setMeal]    = useState<MealLog | null>(null);
  const [loading,  setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [draft,    setDraft]   = useState<MealDraft | null>(null);
  const [saving,   setSaving]  = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    fetchMealById(id)
      .then(setMeal)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const mealType   = meal ? mealTypeFromDescription(meal.meal_description) : null;
  const colonIdx   = meal ? meal.meal_description.indexOf(':') : -1;
  const body       = meal
    ? (colonIdx !== -1 ? meal.meal_description.slice(colonIdx + 1).trim() : meal.meal_description)
    : '';
  const badgeColor = mealType ? (MEAL_COLORS[mealType] ?? colors.textSecondary) : colors.textSecondary;
  const title      = mealType
    ? mealType.charAt(0).toUpperCase() + mealType.slice(1)
    : 'Meal';

  const openEdit = () => {
    if (!meal) return;
    const colonIdx = meal.meal_description.indexOf(':');
    const mealType = mealTypeFromDescription(meal.meal_description) as MealType;
    const body = colonIdx !== -1
      ? meal.meal_description.slice(colonIdx + 1).trim()
      : meal.meal_description;
    setDraft({
      mealType,
      body,
      calories: meal.calories_kcal != null ? String(Math.round(meal.calories_kcal)) : '',
      protein:  meal.protein_g     != null ? String(Math.round(meal.protein_g))     : '',
      carbs:    meal.carbs_g       != null ? String(Math.round(meal.carbs_g))       : '',
      fat:      meal.fat_g         != null ? String(Math.round(meal.fat_g))         : '',
      notes:    meal.notes ?? '',
      date:     meal.date,
    });
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!meal || !draft) return;
    setSaving(true);
    try {
      const desc = `${MEAL_LABELS[draft.mealType]}: ${draft.body.trim()}`;
      await updateMealLog(meal.id, {
        meal_description: desc,
        date:             draft.date,
        notes:            draft.notes.trim() || null,
        calories_kcal:    draft.calories ? Math.round(parseFloat(draft.calories)) : null,
        protein_g:        draft.protein  ? parseFloat(draft.protein)              : null,
        carbs_g:          draft.carbs    ? parseFloat(draft.carbs)                : null,
        fat_g:            draft.fat      ? parseFloat(draft.fat)                  : null,
      });
      const fresh = await fetchMealById(meal.id);
      if (fresh) setMeal(fresh);
      setShowEdit(false);
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!meal) return;
    setSaving(true);
    try {
      await deleteMealLog(meal.id);
      router.back();
    } catch {
      Alert.alert('Could not delete', 'Try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <NavButton direction="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={openEdit} hitSlop={8} style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !meal ? (
        <View style={styles.loading}>
          <Text style={styles.notFound}>Meal not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date + type badge */}
          <View style={styles.metaRow}>
            <Text style={styles.metaDate}>{formatMealDate(meal.date)}</Text>
            <View style={[styles.badge, { borderColor: badgeColor + '55', backgroundColor: badgeColor + '18' }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>
                {(mealType ?? 'snack').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DESCRIPTION</Text>
            <Text style={styles.bodyText}>{body}</Text>
          </View>

          {/* Macros */}
          {meal.calories_kcal != null && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>MACROS · APPROXIMATE</Text>
              <View style={styles.macroGrid}>
                {[
                  { v: meal.calories_kcal,              label: 'kcal'    },
                  { v: Math.round(meal.protein_g ?? 0), label: 'protein' },
                  { v: Math.round(meal.carbs_g ?? 0),   label: 'carbs'   },
                  { v: Math.round(meal.fat_g ?? 0),     label: 'fat'     },
                ].map(({ v, label }) => (
                  <View key={label} style={styles.macroCell}>
                    <Text style={styles.macroValue}>{v}</Text>
                    <Text style={styles.macroLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          {meal.notes ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>NOTES</Text>
              <Text style={styles.notesText}>{meal.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
      {draft != null && (
        <LogEditModal
          visible={showEdit}
          title="Edit Meal"
          saving={saving}
          onCancel={() => setShowEdit(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        >
          <MealEditFields draft={draft} onChange={setDraft} />
        </LogEditModal>
      )}
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  editBtn: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.accent,
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary },

  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  metaDate: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textSecondary },
  badge: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },

  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  bodyText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 23,
  },

  macroGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  macroCell: { flex: 1, alignItems: 'center', gap: 3 },
  macroValue: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  macroLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  notesText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic',
  },
});
