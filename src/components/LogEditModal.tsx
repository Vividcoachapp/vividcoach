import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './ui/Button';
import { colors } from '../constants/colors';
import { fonts, spacing, radii } from '../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  /** Omit in "add" mode — no entry to delete yet. */
  onDelete?: () => void;
  children: React.ReactNode;
}

export function LogEditModal({
  visible, title, saving, onCancel, onSave, onDelete, children,
}: Props) {
  const insets = useSafeAreaInsets();

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onCancel}
            hitSlop={8}
            style={styles.headerSide}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{title}</Text>

          <TouchableOpacity
            onPress={onSave}
            hitSlop={8}
            style={[styles.headerSide, styles.headerRight]}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Text style={styles.saveText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}

          {/* Secondary delete — less prominent than the long-press path. Hidden in "add" mode. */}
          {onDelete && (
            <Button
              label="Delete this entry"
              onPress={confirmDelete}
              variant="destructive"
              disabled={saving}
              style={{ marginTop: spacing.xl }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerSide: { width: 64, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  cancelText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.textSecondary },
  saveText:   { fontFamily: fonts.sansBold,   fontSize: 15, color: colors.accent },

  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
    gap: spacing.xl,
  },

  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    marginTop: spacing.xl,
  },
  deleteText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.warmAccent },
});
