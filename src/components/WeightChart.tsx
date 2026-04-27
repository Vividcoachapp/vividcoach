import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { WeightLog } from '../services/weight';

interface Props {
  logs: WeightLog[];
  width: number;
  height?: number;
}

export function WeightChart({ logs, width, height = 150 }: Props) {
  const L = 38; // left pad for y labels
  const R = 8;
  const T = 8;
  const B = 18;
  const plotW = width - L - R;
  const plotH = height - T - B;

  if (logs.length === 0) return null;

  const vals = logs.map((l) => l.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const range = rawMax - rawMin;
  const pad = range < 1 ? 1.5 : range * 0.2;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const xOf = (i: number) =>
    L + (logs.length === 1 ? plotW / 2 : (i / (logs.length - 1)) * plotW);
  const yOf = (v: number) => T + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const pts = logs.map((l, i) => ({ x: xOf(i), y: yOf(l.value) }));
  const ptStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const ticks = [rawMax, (rawMin + rawMax) / 2, rawMin].map(
    (v) => Math.round(v * 10) / 10,
  );

  const fmt = (d: string) =>
    new Date(d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Svg width={width} height={height}>
      {ticks.map((t, i) => (
        <Line
          key={i} x1={L} y1={yOf(t)} x2={width - R} y2={yOf(t)}
          stroke="rgba(244,241,234,0.08)" strokeWidth={1}
        />
      ))}
      {ticks.map((t, i) => (
        <SvgText key={i} x={L - 4} y={yOf(t) + 4} textAnchor="end" fontSize={9} fill="#8c8a82">
          {t}
        </SvgText>
      ))}
      {logs.length > 1 && (
        <Polyline
          points={ptStr} fill="none" stroke="#d8ff3e" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#d8ff3e" />
      ))}
      {logs.length > 0 && (
        <SvgText x={L} y={height - 2} fontSize={9} fill="#8c8a82" textAnchor="middle">
          {fmt(logs[0].date)}
        </SvgText>
      )}
      {logs.length > 1 && (
        <SvgText x={width - R} y={height - 2} fontSize={9} fill="#8c8a82" textAnchor="end">
          {fmt(logs[logs.length - 1].date)}
        </SvgText>
      )}
    </Svg>
  );
}
