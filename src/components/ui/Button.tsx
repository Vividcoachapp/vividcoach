import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fonts, spacing, radii } from '../../constants/theme';

type Variant = 'primary' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const variantContainer: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(244, 241, 234, 0.25)',
  },
};

const variantTextColor: Record<Variant, string> = {
  primary: colors.backgroundPrimary,
  secondary: colors.textPrimary,
};

const sizeContainer: Record<Size, ViewStyle> = {
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
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantContainer[variant],
        sizeContainer[size],
        (disabled || loading) && styles.muted,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.backgroundPrimary : colors.accent}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            { color: variantTextColor[variant], fontSize: sizeFontSize[size] },
          ]}
        >
          {label}
        </Text>
      )}
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
