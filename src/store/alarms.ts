import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import ClockNative, { type NativeAlarm } from '@/lib/native';
import type { Days } from '@/lib/time';

export type Alarm = {
  id: string;
  h: number;
  m: number;
  label: string;
  days: Days;
  on: boolean;
  sound: string;
  vibrate: boolean;
  gradual: boolean;
};

const toNative = (a: Alarm): NativeAlarm => ({ ...a, days: a.days.map((d) => (d ? 1 : 0)) });
const fromNative = (a: NativeAlarm): Alarm => ({ ...a, days: a.days.map(Boolean) });

const byTime = (a: Alarm, b: Alarm) => a.h * 60 + a.m - (b.h * 60 + b.m);

type AlarmsState = {
  alarms: Alarm[];
  /** Sonecas pendentes: id do alarme -> instante em que toca de novo. Só existem no nativo. */
  snoozes: Record<string, number>;
  loaded: boolean;
  /** Relê do nativo: alarmes de uma vez são desligados lá depois de tocar. */
  load: () => Promise<void>;
  loadSnoozes: () => void;
  cancelSnooze: (id: string) => void;
  upsert: (a: Alarm) => void;
  toggle: (id: string, on: boolean) => void;
  remove: (id: string) => void;
};

// Com o módulo nativo, a fonte da verdade é o armazenamento nativo (sobrevive a boot e disparos).
// Sem ele (ex.: Expo Go), cai para o AsyncStorage.
async function read(): Promise<Alarm[]> {
  if (ClockNative) return (JSON.parse(ClockNative.getAlarms()) as NativeAlarm[]).map(fromNative);
  const raw = await AsyncStorage.getItem('alarms');
  return raw ? JSON.parse(raw) : [];
}

function write(list: Alarm[]) {
  if (ClockNative) ClockNative.setAlarms(JSON.stringify(list.map(toNative)));
  else AsyncStorage.setItem('alarms', JSON.stringify(list));
}

export const useAlarms = create<AlarmsState>()((set, get) => {
  const commit = (list: Alarm[]) => {
    const sorted = [...list].sort(byTime);
    set({ alarms: sorted });
    write(sorted);
  };
  return {
    alarms: [],
    snoozes: {},
    loaded: false,
    load: async () => {
      set({ alarms: (await read()).sort(byTime), loaded: true });
      get().loadSnoozes();
    },
    loadSnoozes: () => set({ snoozes: ClockNative ? JSON.parse(ClockNative.getSnoozes()) : {} }),
    // o nativo avisa com onSnoozeChange e a lista é relida
    cancelSnooze: (id) => ClockNative?.cancelSnooze(id),
    upsert: (a) => {
      const list = get().alarms;
      commit(list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a]);
    },
    toggle: (id, on) => commit(get().alarms.map((x) => (x.id === id ? { ...x, on } : x))),
    remove: (id) => commit(get().alarms.filter((x) => x.id !== id)),
  };
});
