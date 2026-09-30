import { NativeModule, requireOptionalNativeModule } from 'expo';

export type RingInfo = {
  kind: 'alarm' | 'timer';
  id: string;
  label: string;
  time: string;
  sound: string;
  snoozeMin: number;
};

export type NativeAlarm = {
  id: string;
  h: number;
  m: number;
  label: string;
  days: number[]; // domingo..sábado, 0/1
  on: boolean;
  sound: string;
  vibrate: boolean;
  gradual: boolean;
};

export type Permissions = { notifications: boolean; exactAlarms: boolean; fullScreen: boolean };

type Events = {
  onRingStart: (info: RingInfo) => void;
  onRingStop: (info: RingInfo) => void;
  onSnoozeChange: () => void;
};

declare class ClockNativeModule extends NativeModule<Events> {
  setAlarms(json: string): void;
  getAlarms(): string;
  setSettings(json: string): void;
  scheduleTimer(id: string, endAt: number, label: string): void;
  cancelTimer(id: string): void;
  getTimers(): string;
  showTimerNotification(id: string, label: string, endAt: number, totalMs: number, remainingMs: number, paused: boolean): void;
  cancelTimerNotification(id: string): void;
  showStopwatchNotification(elapsedMs: number, running: boolean, laps: number): void;
  cancelStopwatchNotification(): void;
  /** JSON: id do alarme -> instante (ms) da soneca pendente. */
  getSnoozes(): string;
  cancelSnooze(id: string): void;
  getRinging(): RingInfo | null;
  stopRinging(): void;
  snoozeRinging(): void;
  addMinuteRinging(): void;
  setShowWhenLocked(enabled: boolean): void;
  getPermissions(): Permissions;
  requestNotifications(): void;
  openNotificationSettings(): void;
  openExactAlarmSettings(): void;
  openFullScreenSettings(): void;
  updateWidgets(): void;
}

// Opcional: sem o módulo (ex.: Expo Go) o app ainda abre, só sem alarmes do sistema.
export default requireOptionalNativeModule<ClockNativeModule>('ClockNative');
