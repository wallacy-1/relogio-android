import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';

import { dark, light, type Theme } from './tokens';

export * from './tokens';

export function useTheme(): Theme {
  const pref = useSettings((s) => s.theme);
  const system = useColorScheme();
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return isDark ? dark : light;
}
