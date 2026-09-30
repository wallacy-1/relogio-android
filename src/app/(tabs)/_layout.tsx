import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/BottomNav';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg }, animation: 'fade' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="alarms" />
      <Tabs.Screen name="timer" />
      <Tabs.Screen name="stopwatch" />
    </Tabs>
  );
}
