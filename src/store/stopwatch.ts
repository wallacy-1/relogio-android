import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import ClockNative from '@/lib/native';

import { useHistory } from './history';

type StopwatchState = {
  running: boolean;
  /** Instante (epoch) do início da corrida atual. */
  since: number;
  /** Tempo acumulado antes da corrida atual. */
  accMs: number;
  /** Totais no fim de cada volta, em ordem. */
  laps: number[];
  firstStart: number;
  start: () => void;
  pause: () => void;
  lap: () => void;
  reset: () => void;
};

export const elapsedOf = (s: Pick<StopwatchState, 'running' | 'since' | 'accMs'>, now = Date.now()) =>
  s.accMs + (s.running ? now - s.since : 0);

export const useStopwatch = create<StopwatchState>()(
  persist(
    (set, get) => {
      const notify = () => {
        const s = get();
        const e = elapsedOf(s);
        if (e === 0 && !s.running) ClockNative?.cancelStopwatchNotification();
        else ClockNative?.showStopwatchNotification(e, s.running, s.laps.length);
      };
      return {
        running: false,
        since: 0,
        accMs: 0,
        laps: [],
        firstStart: 0,
        start: () => {
          if (get().running) return;
          const now = Date.now();
          set((s) => ({ running: true, since: now, firstStart: s.accMs === 0 ? now : s.firstStart }));
          notify();
        },
        pause: () => {
          const s = get();
          if (!s.running) return;
          set({ running: false, accMs: elapsedOf(s) });
          notify();
        },
        lap: () => {
          const s = get();
          if (!s.running) return;
          set({ laps: [...s.laps, elapsedOf(s)] });
          notify();
        },
        reset: () => {
          const s = get();
          const e = elapsedOf(s);
          if (e > 0) {
            useHistory.getState().add({
              kind: 'stopwatch', at: Date.now(), label: 'Cronômetro', elapsedMs: e,
              laps: s.laps.length ? s.laps.length + 1 : 0, startedAt: s.firstStart,
            });
          }
          set({ running: false, since: 0, accMs: 0, laps: [], firstStart: 0 });
          ClockNative?.cancelStopwatchNotification();
        },
      };
    },
    {
      name: 'stopwatch',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ running, since, accMs, laps, firstStart }) => ({ running, since, accMs, laps, firstStart }),
    },
  ),
);
