import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../constants/colors';

interface ProgressRingProps {
  size: number;
  strokeWidth?: number;
  /** 0..1 — values outside the range are clamped. */
  progress: number;
  trackColor?: string;
  fillColor?: string;
  children?: React.ReactNode;
}

/**
 * Simple SVG progress ring. Track is the full circle in `trackColor`; fill is
 * an arc in `fillColor` swept clockwise from 12 o'clock based on `progress`.
 * Children render in the center over the SVG.
 */
export function ProgressRing({
  size,
  strokeWidth = 6,
  progress,
  trackColor = 'rgba(244, 241, 234, 0.12)',
  fillColor = colors.accent,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
