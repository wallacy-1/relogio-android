import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';

import { WD3, pad } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { alpha, mix, useTheme } from '@/theme';

import { Txt } from './Txt';

type Variant = 'seixo' | 'sol' | 'folha';

type Tick = { x1: number; y1: number; x2: number; y2: number };

function ticks(r1: number, r2: number, filter: (i: number) => boolean): Tick[] {
  const out: Tick[] = [];
  for (let i = 0; i < 60; i++) {
    if (!filter(i)) continue;
    const a = (i * Math.PI) / 30, s = Math.sin(a), c = Math.cos(a);
    out.push({ x1: 100 + r1 * s, y1: 100 - r1 * c, x2: 100 + r2 * s, y2: 100 - r2 * c });
  }
  return out;
}

const MINOR = ticks(88, 91, (i) => i % 5 !== 0);
const MAJOR = ticks(80, 91, (i) => i % 5 === 0);
const MAJOR_SHORT = ticks(86, 91, (i) => i % 5 === 0);
const DOTS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return { x: 100 + 86 * Math.sin(a), y: 100 - 86 * Math.cos(a), r: i % 3 === 0 ? 6 : 3.5 };
});
const NUMS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1, a = (n * Math.PI) / 6;
  return { l: String(n), x: (100 + 70 * Math.sin(a)) / 200, y: (100 - 70 * Math.cos(a)) / 200 };
});

type Props = {
  size?: number;
  variant?: Variant;
  numbers?: boolean;
  showDate?: boolean;
  showDigital?: boolean;
  use24?: boolean;
};

export const AnalogClock = memo(function AnalogClock({ size = 200, variant = 'seixo', numbers = false, showDate, showDigital, use24 = true }: Props) {
  const t = useTheme();
  const d = useNow(1000);
  const s = d.getSeconds();
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  const hh = d.getHours();
  const digital = use24 ? `${pad(hh)}:${pad(d.getMinutes())}` : `${hh % 12 || 12}:${pad(d.getMinutes())}`;
  const withNums = numbers || variant === 'folha';
  const k = size / 200;
  const label = `${hh}:${pad(d.getMinutes())}`;

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={`Relógio analógico, ${label}`}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {variant === 'seixo' && (
          <G>
            <Circle cx={100} cy={100} r={97} fill={t.bg} stroke={t.divider} strokeWidth={3} />
            {MINOR.map((p, i) => (
              <Line key={`n${i}`} {...p} stroke={t.divider} strokeWidth={2} strokeLinecap="round" />
            ))}
            {(withNums ? MAJOR_SHORT : MAJOR).map((p, i) => (
              <Line key={`j${i}`} {...p} stroke={t.text} strokeWidth={5} strokeLinecap="round" />
            ))}
          </G>
        )}
        {variant === 'sol' && (
          <G>
            <Circle cx={100} cy={100} r={99} fill={mix(t.accent, 28, t.bg)} />
            <Circle cx={100} cy={100} r={74} fill={mix(t.accent, 12, t.bg)} />
            {DOTS.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={t.text} />
            ))}
          </G>
        )}
        {variant === 'folha' && (
          <G>
            <Circle cx={100} cy={100} r={97} fill={mix(t.accent2, 30, t.bg)} />
            {MINOR.map((p, i) => (
              <Line key={i} {...p} stroke={alpha(t.text, 30)} strokeWidth={2} strokeLinecap="round" />
            ))}
          </G>
        )}
      </Svg>

      {withNums &&
        NUMS.map((n) => (
          <Txt
            key={n.l}
            font="heading"
            size={18 * k}
            style={{ position: 'absolute', left: n.x * size - 15 * k, top: n.y * size - 11 * k, width: 30 * k, textAlign: 'center', lineHeight: 22 * k }}
          >
            {n.l}
          </Txt>
        ))}
      {showDate && (
        <Txt
          font="bold"
          size={14 * k}
          style={{ position: 'absolute', top: size * 0.32 - 8 * k, width: size, textAlign: 'center', letterSpacing: 1.1 * k }}
        >
          {`${WD3[d.getDay()]} ${d.getDate()}`}
        </Txt>
      )}
      {showDigital && (
        <Txt font="bold" size={17 * k} style={{ position: 'absolute', top: size * 0.7 - 10 * k, width: size, textAlign: 'center' }}>
          {digital}
        </Txt>
      )}

      <Svg width={size} height={size} viewBox="0 0 200 200" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Line x1={100} y1={100} x2={100} y2={54} transform={`rotate(${h * 30} 100 100)`} stroke={t.text} strokeWidth={9} strokeLinecap="round" />
        <Line x1={100} y1={100} x2={100} y2={30} transform={`rotate(${m * 6} 100 100)`} stroke={t.text} strokeWidth={6} strokeLinecap="round" />
        <Line x1={100} y1={118} x2={100} y2={22} transform={`rotate(${s * 6} 100 100)`} stroke={t.accent} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={100} cy={100} r={8} fill={t.accent} />
        <Circle cx={100} cy={100} r={3} fill={t.bg} />
      </Svg>
    </View>
  );
});

