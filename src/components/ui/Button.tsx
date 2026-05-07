import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fonts, spacing, radii } from '../../constants/theme';

type Variant = 'primary' | 'vibe' | 'secondary' | 'destructive';
type Size = 'sm' | 'md' | 'lg';
type Vibe = 'warm' | 'direct' | 'intense';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  /** Required when variant='vibe'. Maps to the matched coach's vibe color. */
  vibe?: Vibe;
  style?: ViewStyle;
}

const VIBE_ACCENT: Record<Vibe, string> = {
  warm:    colors.accent,
  direct:  colors.textPrimary,
  intense: colors.warmAccent,
};

const sizePadding: Record<Size, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: 14, paddingHorizontal: spacing.xl },
  lg: { paddingVertical: spacing.base, paddingHorizontal: spacing['2xl'] },
};

const sizeFontSize: Record<Size, number> = {
  sm: 13,
  md: 15,
  lg: 17,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  vibe,
  style,
}: ButtonProps) {
  const isMuted = disabled || loading;
  const padding = sizePadding[size];
  const fontSize = sizeFontSize[size];

  // Text color per variant: dark on bright bg for primary/vibe/destructive,
  // textPrimary on transparent bg for secondary.
  const textColor =
    variant === 'secondary' ? colors.textPrimary : colors.backgroundPrimary;

  const inner = loading ? (
    <ActivityIndicator
      color={variant === 'secondary' ? colors.accent : colors.backgroundPrimary}
      size="small"
    />
  ) : (
    <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
  );

  // Resolve background per variant. All four variants render flat — the earlier
  // coral → chartreuse gradient on `primary` was backed out (read as destructive).
  let backgroundColor: string;
  let borderColor: string | undefined;

  if (variant === 'primary') {
    backgroundColor = colors.accent;
  } else if (variant === 'vibe') {
    backgroundColor = vibe ? VIBE_ACCENT[vibe] : colors.accent;
  } else if (variant === 'destructive') {
    backgroundColor = colors.warmAccent;
  } else {
    // secondary
    backgroundColor = 'transparent';
    borderColor = 'rgba(244, 241, 234, 0.25)';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isMuted}
      activeOpacity={0.85}
      style={[
        styles.base,
        padding,
        { backgroundColor },
        borderColor ? { borderWidth: 1, borderColor } : null,
        isMuted && styles.muted,
        style,
      ]}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 0.3,
  },
  muted: {
    opacity: 0.4,
  },
});
