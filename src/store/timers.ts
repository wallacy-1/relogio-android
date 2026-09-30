import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import ClockNative from '@/lib/native';
import { uid } from '@/lib/time';

import { useHistory } from './history';

export type Timer = {
  id: string;
  label: string;
  totalMs: number;
  running: boolean;
  /** Quando roda: instante em que termina. */
  endAt: number;
  /** Quando pausado: quanto falta. */
  remainingMs: number;
};

export const remainingOf = (t: Timer, now = Date.now()) => (t.running ? Math.max(0, t.endAt - now) : t.remainingMs);

type TimersState = {
  timers: Timer[];
  start: (totalMs: number, label?: string) => string;
  pause: (id: string) => void;
  resume: (id: string) => void;
  addMinute: (id: string) => void;
  restart: (id: string) => void;
  cancel: (id: string) => void;
  /** Tira os timers que já acabaram (o toque em si é nativo) e registra no histórico. */
  sweep: () => void;
  /** Absorve timers criados pelo nativo (ex.: "+1 min" na notificação de tempo esgotado). */
  reconcile: () => void;
};

function notify(t: Timer) {
  ClockNative?.showTimerNotification(t.id, t.label, t.endAt, t.totalMs, remainingOf(t), !t.running);
}

function arm(t: Timer) {
  if (t.running) ClockNative?.scheduleTimer(t.id, t.endAt, t.label);
  else ClockNative?.cancelTimer(t.id);
  notify(t);
}

function disarm(id: string) {
  ClockNative?.cancelTimer(id);
  ClockNative?.cancelTimerNotification(id);
}

export const useTimers = create<TimersState>()(
  persist(
    (set, get) => {
      const update = (id: string, fn: (t: Timer) => Timer) => {
        let changed: Timer | undefined;
        set({ timers: get().timers.map((t) => (t.id === id ? (changed = fn(t)) : t)) });
        if (changed) arm(changed);
      };
      return {
        timers: [],
        start: (totalMs, label = 'Timer') => {
          const t: Timer = { id: uid(), label, totalMs, running: true, endAt: Date.now() + totalMs, remainingMs: totalMs };
          set({ timers: [t, ...get().timers] });
          arm(t);
          return t.id;
        },
        pause: (id) => update(id, (t) => (t.running ? { ...t, running: false, remainingMs: remainingOf(t) } : t)),
        resume: (id) => update(id, (t) => (t.running ? t : { ...t, running: true, endAt: Date.now() + t.remainingMs })),
        addMinute: (id) =>
          update(id, (t) =>
            t.running
              ? { ...t, totalMs: t.totalMs + 60000, endAt: t.endAt + 60000 }
              : { ...t, totalMs: t.totalMs + 60000, remainingMs: t.remainingMs + 60000 },
          ),
        restart: (id) => update(id, (t) => ({ ...t, running: true, endAt: Date.now() + t.totalMs, remainingMs: t.totalMs })),
        cancel: (id) => {
          const t = get().timers.find((x) => x.id === id);
          if (!t) return;
          set({ timers: get().timers.filter((x) => x.id !== id) });
          disarm(id);
          useHistory.getState().add({
            kind: 'timer', at: Date.now(), label: t.label, totalMs: t.totalMs, status: 'canceled',
            elapsedMs: t.totalMs - remainingOf(t),
          });
        },
        sweep: () => {
          const now = Date.now();
          const done = get().timers.filter((t) => t.running && t.endAt <= now);
          if (!done.length) return;
          set({ timers: get().timers.filter((t) => !done.includes(t)) });
          for (const t of done) {
            ClockNative?.cancelTimerNotification(t.id);
            useHistory.getState().add({ kind: 'timer', at: t.endAt, label: t.label, totalMs: t.totalMs, status: 'done', elapsedMs: t.totalMs });
          }
        },
        reconcile: () => {
          if (!ClockNative) return;
          const native = JSON.parse(ClockNative.getTimers()) as Record<string, { endAt: number; label: string }>;
          const known = new Set(get().timers.map((t) => t.id));
          const now = Date.now();
          const extra: Timer[] = Object.entries(native)
            .filter(([id, v]) => !known.has(id) && v.endAt > now)
            .map(([id, v]) => ({ id, label: v.label, totalMs: v.endAt - now, running: true, endAt: v.endAt, remainingMs: v.endAt - now }));
          if (!extra.length) return;
          set({ timers: [...extra, ...get().timers] });
          extra.forEach(notify);
        },
      };
    },
    { name: 'timers', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
