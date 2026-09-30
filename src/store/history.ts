import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { uid } from '@/lib/time';

export type HistoryItem =
  | { id: string; kind: 'timer'; at: number; label: string; totalMs: number; status: 'done' | 'canceled'; elapsedMs: number }
  | { id: string; kind: 'stopwatch'; at: number; label: string; elapsedMs: number; laps: number; startedAt: number };

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

type HistoryState = {
  items: HistoryItem[];
  add: (item: DistributiveOmit<HistoryItem, 'id'>) => void;
  clear: () => void;
};

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: [{ ...item, id: uid() } as HistoryItem, ...s.items].slice(0, 200) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'history', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
