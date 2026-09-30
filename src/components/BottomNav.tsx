import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';
import { tap } from './ui';

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Relógio', icon: 'clock' },
  alarms: { label: 'Alarmes', icon: 'alarm' },
  timer: { label: 'Timer', icon: 'timer' },
  stopwatch: { label: 'Cronômetro', icon: 'stopwatch' },
};

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', paddingTop: 10, paddingHorizontal: 8, paddingBottom: 14 + insets.bottom, backgroundColor: t.surface }}>
      {state.routes.map((route, i) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const active = state.index === i;
        const muted = alpha(t.text, 62);
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !e.defaultPrevented) {
                tap();
                navigation.navigate(route.name);
              }
            }}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <View style={{ width: 64, height: 34, alignItems: 'center', justifyContent: 'center' }}>
              {/* pílula montada só na aba ativa: trocar o fundo de uma view com raio perde o arredondamento no Fabric */}
              {active && (
                <View
                  key={`pill-${route.key}`}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 17, backgroundColor: alpha(t.accent, 26) }}
                />
              )}
              <Icon name={item.icon} size={22} color={active ? t.text : muted} />
            </View>
            <Txt font={active ? 'bold' : 'semibold'} size={12} color={active ? t.text : alpha(t.text, 68)}>
              {item.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
