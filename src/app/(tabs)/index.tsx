import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalogClock } from '@/components/AnalogClock';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Blob, Btn, Card, TabHeader, Tag } from '@/components/ui';
import { clockText, dateLong, dayWord, hhmm, inText, nextOccurrence, pad } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { useAlarms } from '@/store/alarms';
import { useSettings } from '@/store/settings';
import { useStopwatch } from '@/store/stopwatch';
import { useTimers } from '@/store/timers';
import { alpha, mix, useTheme } from '@/theme';

export default function ClockScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const use24 = useSettings((s) => s.use24);
  const alarms = useAlarms((s) => s.alarms);
  const snoozes = useAlarms((s) => s.snoozes);

  const H = now.getHours(), M = now.getMinutes();
  const minuteKey = Math.floor(now.getTime() / 60000);

  // soneca pendente conta como próximo toque (pode tocar antes dos alarmes normais)
  const next = useMemo(() => {
    const at = new Date(minuteKey * 60000);
    type Next = { a: (typeof alarms)[number]; when: Date; snooze: boolean };
    const regular = alarms
      .filter((a) => a.on)
      .map((a) => ({ a, when: nextOccurrence(a.h, a.m, a.days, at), snooze: false }))
      .filter((x): x is Next => !!x.when);
    const snoozed = Object.entries(snoozes).flatMap(([id, ms]): Next[] => {
      const a = alarms.find((x) => x.id === id);
      return a ? [{ a, when: new Date(ms), snooze: true }] : [];
    });
    return [...regular, ...snoozed].sort((x, y) => x.when.getTime() - y.when.getTime())[0];
  }, [alarms, snoozes, minuteKey]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.bg }}>
      <Blob size={260} color={mix(t.accent2, t.dark ? 22 : 28, t.bg)} style={{ right: -90, top: 250 + insets.top }} />
      <TabHeader title="Relógio" icon="sliders" iconLabel="Configurações" onIcon={() => router.push('/settings')} />
      <ScrollView contentContainerStyle={{ gap: 22, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <Txt font="semibold" size={15} color={alpha(t.text, 70)}>
            {dateLong(now)}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }} accessible accessibilityLabel={`São ${clockText(H, M, use24)}`}>
            <Txt font="heading" size={92} style={{ lineHeight: 100 }}>
              {use24 ? `${pad(H)}:${pad(M)}` : `${H % 12 || 12}:${pad(M)}`}
            </Txt>
            <Txt font="heading" size={36} color={t.accent} style={{ lineHeight: 42 }}>
              {pad(now.getSeconds())}
            </Txt>
            {!use24 && (
              <Txt font="bold" size={18}>
                {H < 12 ? 'AM' : 'PM'}
              </Txt>
            )}
          </View>
        </View>

        <AnalogClock size={236} numbers use24={use24} />

        <Pressable accessibilityRole="button" onPress={() => router.push(next ? `/alarm/${next.a.id}` : '/alarm/new')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: alpha(t.accent, t.dark ? 30 : 26), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="alarm" size={20} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt kicker color={t.dark ? t.accent : t.accentText}>
                {next?.snooze ? 'Soneca' : 'Próximo alarme'}
              </Txt>
              <Txt font="bold" size={16} numberOfLines={1}>
                {next ? `${dayWord(next.when, now)}, ${hhmm(next.when.getTime(), use24)}${next.a.label ? ` · ${next.a.label}` : ''}` : 'Nenhum alarme ativo'}
              </Txt>
            </View>
            {next ? <Tag label={inText(next.when.getTime() - now.getTime())} /> : <Icon name="plus" size={20} />}
            {next?.snooze && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar soneca"
                hitSlop={8}
                onPress={() => useAlarms.getState().cancelSnooze(next.a.id)}
                style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(t.text, 10) }}
              >
                <Icon name="close" size={16} />
              </Pressable>
            )}
          </Card>
        </Pressable>

        <View style={{ gap: 8 }}>
          <Txt kicker color={alpha(t.text, 65)}>
            Ações rápidas
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn
              label="Timer 5 min"
              variant="primary"
              onPress={() => {
                useTimers.getState().start(5 * 60000, 'Timer 5 min');
                router.navigate('/timer');
              }}
            />
            <Btn
              label="Cronômetro"
              onPress={() => {
                useStopwatch.getState().start();
                router.navigate('/stopwatch');
              }}
            />
            <Btn label="Novo alarme" onPress={() => router.push('/alarm/new')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
