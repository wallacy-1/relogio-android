import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ClockNative from '@/lib/native';
import { useAlarms } from '@/store/alarms';
import { syncSettingsToNative } from '@/store/settings';
import { useTimers } from '@/store/timers';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Mantém JS e nativo em dia: alarmes, timers vencidos e toque em andamento. */
function useNativeSync() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const goRinging = () => {
      if (pathRef.current !== '/ringing') router.navigate('/ringing');
    };
    const refresh = () => {
      useAlarms.getState().load();
      useTimers.getState().reconcile();
      useTimers.getState().sweep();
      if (ClockNative?.getRinging()) goRinging();
    };
    syncSettingsToNative();
    // espera a navegação montar; num cold start pelo toque o deep link já abre /ringing
    const first = setTimeout(refresh, 300);
    const perms = ClockNative?.getPermissions();
    if (perms && !perms.notifications) ClockNative?.requestNotifications();

    const appSub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const ringSub = ClockNative?.addListener('onRingStart', goRinging);
    const snoozeSub = ClockNative?.addListener('onSnoozeChange', () => useAlarms.getState().loadSnoozes());
    const sweep = setInterval(() => useTimers.getState().sweep(), 1000);
    return () => {
      clearTimeout(first);
      appSub.remove();
      ringSub?.remove();
      snoozeSub?.remove();
      clearInterval(sweep);
    };
  }, []);
}

export default function RootLayout() {
  const t = useTheme();
  const [loaded] = useFonts({ Caprasimo_400Regular, Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold });

  useNativeSync();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alarm/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ringing" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  );
}
