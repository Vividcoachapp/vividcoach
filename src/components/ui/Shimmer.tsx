import { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { radii } from '../../constants/theme';

interface ShimmerProps {
  /** Width — number (px) or percentage string. Defaults to "100%". */
  width?: number | string;
  /** Height in px. Defaults to 12. */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Simple skeleton placeholder. Static color, opacity oscillates 0.3↔0.7 over
 * ~1.2s. Used for content loading states (e.g., the daily observation while
 * AsyncStorage resolves on Home).
 */
export function Shimmer({ width = '100%', height = 12, style }: ShimmerProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.bar,
        { width: width as any, height, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.textSecondary,
    borderRadius: radii.sm,
  },
});
