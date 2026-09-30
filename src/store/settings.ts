import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import ClockNative from '@/lib/native';

export const SOUNDS = ['Manhã', 'Brisa', 'Sino', 'Pássaros', 'Silencioso'] as const;
export type Sound = (typeof SOUNDS)[number];
export type ThemePref = 'light' | 'dark' | 'system';

type SettingsState = {
  use24: boolean;
  theme: ThemePref;
  alarmSound: Sound;
  alarmVibrate: boolean;
  snoozeMin: number;
  gradual: boolean;
  timerSound: Sound;
  timerVibrate: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      use24: true,
      theme: 'system',
      alarmSound: 'Manhã',
      alarmVibrate: true,
      snoozeMin: 10,
      gradual: true,
      timerSound: 'Sino',
      timerVibrate: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);

/** O serviço nativo precisa da soneca e do som do timer mesmo com o app fechado. */
export function syncSettingsToNative() {
  const s = useSettings.getState();
  ClockNative?.setSettings(JSON.stringify({ snoozeMin: s.snoozeMin, timerSound: s.timerSound, timerVibrate: s.timerVibrate }));
}

useSettings.subscribe(syncSettingsToNative);
