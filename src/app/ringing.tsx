import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Blob, tap } from '@/components/ui';
import ClockNative, { type RingInfo } from '@/lib/native';
import { dateLong } from '@/lib/time';
import { useTimers } from '@/store/timers';
import { alpha, dark as t, ramps } from '@/theme';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** Tela cheia de alarme/timer tocando: sempre escura, aparece sobre o bloqueio. */
export default function RingingScreen() {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<RingInfo | null>(() => ClockNative?.getRinging() ?? null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!info) {
      leave();
      return;
    }
    ClockNative?.setShowWhenLocked(true);
    const sub = ClockNative?.addListener('onRingStop', () => {
      setInfo(null);
    });
    const start = ClockNative?.addListener('onRingStart', (i) => setInfo(i));
    const back = BackHandler.addEventListener('hardwareBackPress', () => true);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      ClockNative?.setShowWhenLocked(false);
      sub?.remove();
      start?.remove();
      back.remove();
      loop.stop();
    };
  }, [info, pulse]);

  if (!info) return <View style={{ flex: 1, backgroundColor: ramps.accent2[900] }} />;

  const isAlarm = info.kind === 'alarm';
  const now = new Date();

  const stop = () => {
    tap();
    ClockNative?.stopRinging();
  };
  const secondary = () => {
    tap();
    if (isAlarm) ClockNative?.snoozeRinging();
    else {
      ClockNative?.addMinuteRinging();
      // o nativo reagenda o timer; traz ele de volta para a lista
      setTimeout(() => useTimers.getState().reconcile(), 300);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: ramps.accent2[900], paddingBottom: insets.bottom }}>
      <StatusBar style="light" />
      <Blob size={560} color={alpha(t.accent2, 14)} style={{ left: -74, top: 150 }} />
      <Blob size={420} color={alpha(t.accent2, 16)} style={{ left: -4, top: 220 }} />
      <Blob size={280} color={alpha(t.accent2, 22)} style={{ left: 66, top: 290 }} />

      <View style={{ gap: 6, paddingTop: 48 + insets.top, paddingHorizontal: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={isAlarm ? 'alarm' : 'timer'} size={18} color={t.accent} />
          <Txt kicker size={14} color={t.accent} style={{ fontSize: 14, letterSpacing: 1.1 }}>
            {isAlarm ? 'Alarme' : 'Timer'}
          </Txt>
        </View>
        <Txt font="heading" size={isAlarm ? 112 : 64} color={t.text} style={{ lineHeight: isAlarm ? 118 : 72 }} adjustsFontSizeToFit numberOfLines={1}>
          {isAlarm ? info.time : 'Tempo esgotado'}
        </Txt>
        <Txt font="heading" size={28} color={t.text}>
          {info.label}
        </Txt>
        <Txt size={15} color={alpha(t.text, 72)}>
          {dateLong(now)}
          {isAlarm && info.sound !== 'Silencioso' ? ` · ${info.sound}` : ''}
        </Txt>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: 172,
            height: 172,
            borderRadius: 86,
            backgroundColor: alpha(t.accent, 25),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Parar"
          onPress={stop}
          style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={isAlarm ? 'alarm' : 'timer'} size={56} color={t.onAccent} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32 }}>
        <Pressable
          accessibilityRole="button"
          onPress={secondary}
          style={({ pressed }) => ({
            flex: 1,
            height: 72,
            borderRadius: 999,
            backgroundColor: alpha(t.text, pressed ? 22 : 14),
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Txt font="heading" size={20} color={t.text}>
            {isAlarm ? 'Soneca' : '+1 min'}
          </Txt>
          {isAlarm && (
            <Txt size={12} color={alpha(t.text, 75)}>
              {info.snoozeMin} min
            </Txt>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={stop}
          style={({ pressed }) => ({ flex: 1, height: 72, borderRadius: 999, backgroundColor: t.accent, opacity: pressed ? 0.88 : 1, alignItems: 'center', justifyContent: 'center' })}
        >
          <Txt font="heading" size={20} color={t.onAccent}>
            Parar
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}
