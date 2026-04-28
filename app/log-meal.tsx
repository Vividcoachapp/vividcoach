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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { useAuthStore } from '../src/stores/authStore';
import { FREE_COACHES } from '../src/constants/coaches';
import {
  saveMeal, MealType, MEAL_LABELS, defaultMealType,
  fetchProductByBarcode, MacroEstimate,
} from '../src/services/nutrition';
import { estimateMacros } from '../src/services/ai';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// ── Macro pill ─────────────────────────────────────────────────────────────────
function MacroPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillValue}>{value}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
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

  // Macro estimation
  const [macros, setMacros]           = useState<MacroEstimate | null>(null);
  const [estimating, setEstimating]   = useState(false);

  // Barcode scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const scanHandled                   = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const canSave = description.trim().length > 0 && !saving;

  // ── Macro estimation ──────────────────────────────────────────────────────
  const handleEstimate = async () => {
    if (!description.trim() || estimating) return;
    setEstimating(true);
    setMacros(null);
    try {
      const result = await estimateMacros(description.trim());
      if (result) {
        setMacros({ ...result, source: 'ai_estimate' });
      } else {
        Alert.alert('Could not estimate', 'Add more detail to your meal description and try again.');
      }
    } finally {
      setEstimating(false);
    }
  };

  // ── Barcode scanner ───────────────────────────────────────────────────────
  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Camera permission needed', 'Allow camera access in Settings to scan barcodes.');
        return;
      }
    }
    scanHandled.current = false;
    setShowScanner(true);
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanHandled.current || scanLoading) return;
    scanHandled.current = true;
    setScanLoading(true);
    try {
      const product = await fetchProductByBarcode(data);
      if (product) {
        setDescription(product.name);
        setMacros({
          calories: product.calories,
          protein:  product.protein,
          carbs:    product.carbs,
          fat:      product.fat,
          source:   'barcode',
        });
        setShowScanner(false);
      } else {
        Alert.alert(
          'Product not found',
          'This barcode isn\'t in the database. You can enter the meal manually.',
          [{ text: 'OK', onPress: () => { scanHandled.current = false; } }],
        );
      }
    } finally {
      setScanLoading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);
    try {
      await saveMeal(user.id, mealType, description, notes, macros ?? undefined);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save meal. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Barcode scanner screen ────────────────────────────────────────────────
  if (showScanner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {cameraPermission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanHandled.current ? undefined : handleBarcodeScan}
              barcodeScannerSettings={{ barcodeTypes: ['ean8', 'ean13', 'upc_a', 'upc_e'] }}
            />
          ) : null}

          {/* Frame overlay */}
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrameWrap}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>Point camera at a food barcode</Text>
            </View>
          </View>

          {/* Loading */}
          {scanLoading && (
            <View style={styles.scanSpinner}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.scanSpinnerText}>Looking up product…</Text>
            </View>
          )}

          {/* Cancel */}
          <TouchableOpacity style={styles.scanCancelBtn} onPress={() => setShowScanner(false)}>
            <Ionicons name="close" size={20} color={colors.textPrimary} />
            <Text style={styles.scanCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main log form ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Log Meal</Text>
          <Text style={styles.headerDate}>{today}</Text>
        </View>
        <TouchableOpacity style={styles.barcodeBtn} onPress={handleOpenScanner} hitSlop={8}>
          <Ionicons name="barcode-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        {/* ── Meal type ─────────────────────────────────── */}
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

        {/* ── Description ───────────────────────────────── */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>WHAT DID YOU EAT?</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder={`Describe your ${MEAL_LABELS[mealType].toLowerCase()} — be as specific as you like.\n\ne.g. "Grilled chicken with roasted veggies and a side salad"`}
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={(t) => { setDescription(t); setMacros(null); }}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        {/* ── Scan + Estimate row ───────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenScanner} activeOpacity={0.8}>
            <Ionicons name="barcode-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.actionBtnText}>Scan barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary, (!description.trim() || estimating) && styles.actionBtnDisabled]}
            onPress={handleEstimate}
            disabled={!description.trim() || estimating}
            activeOpacity={0.8}
          >
            {estimating ? (
              <ActivityIndicator color={colors.backgroundPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={15} color={!description.trim() ? colors.textSecondary : colors.backgroundPrimary} />
                <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary, !description.trim() && styles.actionBtnTextDisabled]}>
                  Estimate macros
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Macro estimate card ───────────────────────── */}
        {macros && (
          <View style={styles.macroCard}>
            <View style={styles.macroCardHeader}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
              <Text style={styles.macroCardLabel}>
                {macros.source === 'barcode' ? 'Barcode scan — per 100g' : 'AI estimate — approximate'}
              </Text>
            </View>
            <View style={styles.macroPills}>
              <MacroPill value={macros.calories} label="kcal" />
              <MacroPill value={macros.protein}  label="protein" />
              <MacroPill value={macros.carbs}    label="carbs" />
              <MacroPill value={macros.fat}       label="fat" />
            </View>
          </View>
        )}

        {/* ── Notes for coach ───────────────────────────── */}
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
  headerDate:  { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.3 },
  barcodeBtn: { width: 36, alignItems: 'flex-end' },

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

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typePill: {
    flex: 1, paddingVertical: 10,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.backgroundSecondary,
  },
  typePillSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  typePillText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textSecondary },
  typePillTextSelected: { color: colors.backgroundPrimary },

  descriptionInput: {
    fontFamily: fonts.sans, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.accent,
    padding: spacing.base, minHeight: 120, lineHeight: 24,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  actionBtnPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionBtnDisabled: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  actionBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  actionBtnTextPrimary: { color: colors.backgroundPrimary },
  actionBtnTextDisabled: { color: colors.textSecondary },

  // Macro estimate card
  macroCard: {
    marginTop: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.3)',
    padding: spacing.base,
    gap: spacing.md,
  },
  macroCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  macroCardLabel: {
    fontFamily: fonts.mono, fontSize: 10, color: colors.accent, letterSpacing: 1,
  },
  macroPills: { flexDirection: 'row', gap: spacing.sm },
  macroPill: {
    flex: 1, alignItems: 'center', gap: 3,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: radii.sm, paddingVertical: spacing.sm,
  },
  macroPillValue: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.textPrimary },
  macroPillLabel: { fontFamily: fonts.mono, fontSize: 9, color: colors.textSecondary, letterSpacing: 0.5 },

  // Notes
  notesInput: {
    fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.base, minHeight: 80, lineHeight: 22,
  },

  bottomSpacer: { height: spacing.xl },

  footer: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.base,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.backgroundPrimary,
  },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: radii.md,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  saveBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.backgroundPrimary },
  saveBtnTextDisabled: { color: colors.textSecondary },

  // ── Barcode scanner ────────────────────────────────────────────────────────
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrameWrap: { alignItems: 'center', gap: spacing.xl },
  scanFrame: {
    width: 240,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  scanHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: '#fff',
  },
  scanSpinner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
  },
  scanSpinnerText: { fontFamily: fonts.sansMedium, fontSize: 15, color: '#fff' },
  scanCancelBtn: {
    position: 'absolute',
    top: spacing['2xl'],
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  scanCancelText: { fontFamily: fonts.sansMedium, fontSize: 14, color: '#fff' },
});
