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
import { useState, useEffect, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { useAuthStore } from '../src/stores/authStore';
import { ALL_COACHES } from '../src/constants/coaches';
import { CoachAvatar } from '../src/components/CoachAvatar';
import {
  CoachMemoryRow,
  fetchCoachNotes,
  updateCoachNote,
  deleteCoachNote,
  addCoachNote,
} from '../src/services/profile';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

// ── Section config ────────────────────────────────────────────────────────
const SECTIONS: { type: string; label: string; addLabel: string; canAdd: boolean }[] = [
  { type: 'goal',       label: 'YOUR GOAL',              addLabel: '+ Add a goal',        canAdd: true  },
  { type: 'constraint', label: 'CONSTRAINTS',             addLabel: '+ Add a constraint',  canAdd: true  },
  { type: '_observed',  label: 'WHAT YOUR COACH NOTICED', addLabel: '',                   canAdd: false },
];

function isObserved(type: string) {
  return type !== 'goal' && type !== 'constraint';
}

// ── Note row ─────────────────────────────────────────────────────────────
function NoteRow({
  note,
  isEditing,
  editText,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
  saving,
}: {
  note: CoachMemoryRow;
  isEditing: boolean;
  editText: string;
  onEditStart: () => void;
  onEditChange: (t: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  if (isEditing) {
    return (
      <View style={styles.noteCardEditing}>
        <TextInput
          style={styles.noteEditInput}
          value={editText}
          onChangeText={onEditChange}
          multiline
          autoFocus
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.editActions}>
          <TouchableOpacity style={styles.editCancelBtn} onPress={onEditCancel}>
            <Text style={styles.editCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editSaveBtn, (!editText.trim() || saving) && styles.editSaveBtnDisabled]}
            onPress={onEditSave}
            disabled={!editText.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.backgroundPrimary} size="small" />
            ) : (
              <Text style={styles.editSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.noteCard}>
      <Text style={styles.noteText}>{note.content}</Text>
      <View style={styles.noteActions}>
        <TouchableOpacity onPress={onEditStart} hitSlop={10} style={styles.noteActionBtn}>
          <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={10} style={styles.noteActionBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Add row ───────────────────────────────────────────────────────────────
function AddRow({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  placeholder,
}: {
  value: string;
  onChange: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  placeholder: string;
}) {
  return (
    <View style={styles.noteCardEditing}>
      <TextInput
        style={styles.noteEditInput}
        value={value}
        onChangeText={onChange}
        multiline
        autoFocus
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
      />
      <View style={styles.editActions}>
        <TouchableOpacity style={styles.editCancelBtn} onPress={onCancel}>
          <Text style={styles.editCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editSaveBtn, (!value.trim() || saving) && styles.editSaveBtnDisabled]}
          onPress={onSave}
          disabled={!value.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.backgroundPrimary} size="small" />
          ) : (
            <Text style={styles.editSaveText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────
export default function CoachNotesScreen() {
  const router = useRouter();
  const { selectedCoachId, coachCustomName } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = ALL_COACHES.find((c) => c.id === selectedCoachId) ?? ALL_COACHES[0];
  const displayName = coachCustomName || coach.name;

  const [notes, setNotes] = useState<CoachMemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addingType, setAddingType] = useState<string | null>(null);
  const [addText, setAddText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const rows = await fetchCoachNotes(user.id);
      setNotes(rows);
    } catch {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, []);

  // ── Edit ────────────────────────────────────────────────────────────────
  const startEdit = (note: CoachMemoryRow) => {
    setAddingType(null);
    setEditingId(note.id);
    setEditText(note.content);
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    setSaving(true);
    try {
      await updateCoachNote(editingId, editText.trim());
      setNotes((prev) => prev.map((n) => n.id === editingId ? { ...n, content: editText.trim() } : n));
      setEditingId(null);
      setEditText('');
    } catch {
      Alert.alert('Error', 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const confirmDelete = (note: CoachMemoryRow) => {
    Alert.alert(
      'Remove this fact?',
      `"${note.content.slice(0, 60)}${note.content.length > 60 ? '…' : ''}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCoachNote(note.id);
              setNotes((prev) => prev.filter((n) => n.id !== note.id));
            } catch {
              Alert.alert('Error', 'Could not remove. Try again.');
            }
          },
        },
      ],
    );
  };

  // ── Add ─────────────────────────────────────────────────────────────────
  const startAdd = (type: string) => {
    setEditingId(null);
    setAddingType(type);
    setAddText('');
  };

  const cancelAdd = () => { setAddingType(null); setAddText(''); };

  const saveAdd = async () => {
    if (!addingType || !addText.trim() || !user?.id) return;
    setSaving(true);
    try {
      await addCoachNote(user.id, coach.id, addingType, addText.trim());
      await load();
      setAddingType(null);
      setAddText('');
    } catch {
      Alert.alert('Error', 'Could not add. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render section ───────────────────────────────────────────────────────
  const renderSection = (
    type: string,
    label: string,
    addLabel: string,
    canAdd: boolean,
    sectionNotes: CoachMemoryRow[],
  ) => {
    const isEmpty = sectionNotes.length === 0 && addingType !== type;
    const placeholder =
      type === 'goal' ? 'e.g. Lose 10 lbs and run a 5K' :
      type === 'constraint' ? 'e.g. Bad knees, no gym access' :
      'What has your coach noticed?';

    return (
      <View key={type} style={styles.section}>
        <Text style={styles.sectionLabel}>{label.replace('YOUR COACH', displayName.toUpperCase())}</Text>

        {isEmpty && (
          <Text style={styles.emptyHint}>
            {type === '_observed'
              ? `${displayName} hasn't logged any observations yet. They'll appear here as you chat.`
              : 'Nothing here yet.'}
          </Text>
        )}

        {sectionNotes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            isEditing={editingId === note.id}
            editText={editText}
            onEditStart={() => startEdit(note)}
            onEditChange={setEditText}
            onEditSave={saveEdit}
            onEditCancel={cancelEdit}
            onDelete={() => confirmDelete(note)}
            saving={saving}
          />
        ))}

        {addingType === type && (
          <AddRow
            value={addText}
            onChange={setAddText}
            onSave={saveAdd}
            onCancel={cancelAdd}
            saving={saving}
            placeholder={placeholder}
          />
        )}

        {canAdd && addingType !== type && (
          <TouchableOpacity style={styles.addLink} onPress={() => startAdd(type)}>
            <Ionicons name="add-circle-outline" size={15} color={colors.accent} />
            <Text style={styles.addLinkText}>{addLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const goalNotes       = notes.filter((n) => n.memory_type === 'goal');
  const constraintNotes = notes.filter((n) => n.memory_type === 'constraint');
  const observedNotes   = notes.filter((n) => isObserved(n.memory_type));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CoachAvatar coach={coach} variant="small" size={72} style={{ marginBottom: spacing.xs }} />
          <Text style={styles.headerTitle}>Coach's Notes</Text>
          <Text style={styles.headerSub}>What {displayName} knows about you</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {SECTIONS.map(({ type, label, addLabel, canAdd }) =>
            renderSection(
              type, label, addLabel, canAdd,
              type === 'goal' ? goalNotes :
              type === 'constraint' ? constraintNotes :
              observedNotes,
            )
          )}

          {/* GDPR / trust footer */}
          <View style={styles.trustCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.accent} />
            <Text style={styles.trustText}>
              This is everything {displayName} knows about you. You can edit or remove anything at any time. Your data belongs to you.
            </Text>
          </View>
        </ScrollView>
      )}
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
  headerSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.3 },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['5xl'],
    gap: spacing['2xl'],
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: { gap: spacing.sm },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: 2,
  },

  // ── Note card ─────────────────────────────────────────────────────────────
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingTop: 2,
  },
  noteActionBtn: { padding: 4 },

  // ── Editing card ──────────────────────────────────────────────────────────
  noteCardEditing: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.base,
    gap: spacing.md,
  },
  noteEditInput: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
    minHeight: 48,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  editCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editCancelText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  editSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    minWidth: 64,
    alignItems: 'center',
  },
  editSaveBtnDisabled: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editSaveText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.backgroundPrimary,
  },

  // ── Add link ─────────────────────────────────────────────────────────────
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  addLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.accent,
  },

  // ── Trust / GDPR footer ───────────────────────────────────────────────────
  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(216,255,62,0.06)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.2)',
    padding: spacing.base,
  },
  trustText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
