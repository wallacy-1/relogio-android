import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

// Ícones Lucide com traço 2.75, como pede o design system.
const PATHS = {
  clock: ['M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20', 'M12 6v6l4 2'],
  alarm: ['M12 5a8 8 0 1 0 0 16a8 8 0 1 0 0-16', 'M12 9v4l2 2', 'M5 3 2 6', 'm22 6-3-3'],
  alarmSmall: ['M12 5a8 8 0 1 0 0 16a8 8 0 1 0 0-16', 'M12 9v4l2 2'],
  alarmPlus: ['M12 5a8 8 0 1 0 0 16a8 8 0 1 0 0-16', 'M12 10v6', 'M9 13h6', 'M5 3 2 6', 'm22 6-3-3'],
  timer: [
    'M5 22h14', 'M5 2h14',
    'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22',
    'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2',
  ],
  stopwatch: ['M10 2h4', 'M12 14l3-3', 'M12 6a8 8 0 1 0 0 16a8 8 0 1 0 0-16'],
  sliders: ['M20 7h-9', 'M14 17H5', 'M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6', 'M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6'],
  history: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  restart: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  back: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronUp: ['m18 15-6-6-6 6'],
  chevronDown: ['m6 9 6 6 6-6'],
  plus: ['M5 12h14', 'M12 5v14'],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  backspace: [
    'M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
    'm12 9 6 6', 'm18 9-6 6',
  ],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
} as const;

export type IconName = keyof typeof PATHS | 'play' | 'pause';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 22, color, strokeWidth = 2.75 }: Props) {
  const t = useTheme();
  const c = color ?? t.text;
  if (name === 'play') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M7 4l13 8-13 8z" fill={c} stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      </Svg>
    );
  }
  if (name === 'pause') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={6} y={4} width={4.5} height={16} rx={1.5} fill={c} />
        <Rect x={13.5} y={4} width={4.5} height={16} rx={1.5} fill={c} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d) => (
        <Path key={d} d={d} stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}
