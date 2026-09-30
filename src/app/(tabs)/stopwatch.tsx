import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { TabHeader, Tag, tap } from '@/components/ui';
import { fmtStopwatch, fmtStopwatchFull } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { elapsedOf, useStopwatch } from '@/store/stopwatch';
import { alpha, useTheme } from '@/theme';

function PillButton({ label, icon, primary, onPress }: { label: string; icon: IconName; primary?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        height: 60,
        paddingHorizontal: primary ? 32 : 28,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: primary ? 0 : 1.5,
        borderColor: t.divider,
        backgroundColor: primary ? t.accent : pressed ? alpha(t.text, 8) : 'transparent',
        opacity: primary && pressed ? 0.88 : 1,
      })}
    >
      <Icon name={icon} size={20} color={primary ? t.onAccent : t.text} />
      <Txt font="heading" size={18} color={primary ? t.onAccent : t.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function StopwatchScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const sw = useStopwatch();
  const now = useNow(33, sw.running).getTime();
  const elapsed = elapsedOf(sw, now);
  const params = useLocalSearchParams<{ action?: string }>();

  useEffect(() => {
    const a = params.action;
    if (!a) return;
    const s = useStopwatch.getState();
    if (a === 'start' || a === 'resume') s.start();
    if (a === 'pause') s.pause();
    if (a === 'lap') s.lap();
    if (a === 'reset') s.reset();
    router.setParams({ action: undefined });
  }, [params]);

  const laps = useMemo(() => {
    const splits = sw.laps.map((total, i) => ({ n: i + 1, total, lap: total - (i ? sw.laps[i - 1] : 0) }));
    const marks = splits.length >= 3;
    const min = Math.min(...splits.map((l) => l.lap)), max = Math.max(...splits.map((l) => l.lap));
    return splits.map((l) => ({ ...l, fast: marks && l.lap === min, slow: marks && l.lap === max })).reverse();
  }, [sw.laps]);

  const lastLap = sw.laps.length ? sw.laps[sw.laps.length - 1] : 0;
  const f = fmtStopwatch(elapsed);
  const angle = ((elapsed % 60000) / 60000) * 2 * Math.PI;
  const idle = elapsed === 0 && !sw.running;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.bg }}>
      <TabHeader title="Cronômetro" icon="history" iconLabel="Histórico" onIcon={() => router.push('/history')} />
      <View style={{ gap: 18, paddingHorizontal: 24, paddingTop: 10 }}>
        <View style={{ width: 260, height: 260, alignSelf: 'center' }}>
          <Svg width={260} height={260} viewBox="0 0 260 260">
            <Circle cx={130} cy={130} r={120} fill={t.surface} />
            <Circle cx={130} cy={130} r={120} fill="none" stroke={alpha(t.text, 10)} strokeWidth={4} />
            <Circle cx={130 + 120 * Math.sin(angle)} cy={130 - 120 * Math.cos(angle)} r={10} fill={t.accent} />
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Txt font="heading" size={f.main.length > 5 ? 46 : 62} style={{ lineHeight: 70 }} tabular>
                {f.main}
              </Txt>
              <Txt font="heading" size={28} color={t.accent} tabular>
                {f.cs}
              </Txt>
            </View>
            {sw.laps.length > 0 && (
              <Txt size={14} color={alpha(t.text, 68)} tabular>
                Volta {sw.laps.length + 1} · {fmtStopwatchFull(elapsed - lastLap)}
              </Txt>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          {idle ? (
            <PillButton label="Iniciar" icon="play" primary onPress={sw.start} />
          ) : sw.running ? (
            <>
              <PillButton label="Volta" icon="flag" onPress={sw.lap} />
              <PillButton label="Pausar" icon="pause" primary onPress={sw.pause} />
            </>
          ) : (
            <>
              <PillButton label="Zerar" icon="restart" onPress={sw.reset} />
              <PillButton label="Retomar" icon="play" primary onPress={sw.start} />
            </>
          )}
        </View>
      </View>
      {laps.length > 0 && (
        <View style={{ flexDirection: 'row', paddingTop: 18, paddingHorizontal: 28, paddingBottom: 8 }}>
          {['Volta', 'Tempo', 'Total'].map((h, i) => (
            <Txt key={h} kicker color={alpha(t.text, 65)} style={{ flex: 1, textAlign: i === 2 ? 'right' : 'left' }}>
              {h}
            </Txt>
          ))}
        </View>
      )}
      <FlatList
        data={laps}
        keyExtractor={(l) => String(l.n)}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
        renderItem={({ item: l }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: t.divider }}>
            <Txt font="bold" style={{ flex: 1 }}>
              Volta {l.n}
            </Txt>
            <View style={{ flex: 1, gap: 2, alignItems: 'flex-start' }}>
              <Txt tabular>{fmtStopwatchFull(l.lap)}</Txt>
              {l.fast && <Tag label="mais rápida" style={{ paddingVertical: 1, paddingHorizontal: 8 }} />}
              {l.slow && <Tag label="mais lenta" variant="accent" style={{ paddingVertical: 1, paddingHorizontal: 8 }} />}
            </View>
            <Txt tabular color={alpha(t.text, 75)} style={{ flex: 1, textAlign: 'right' }}>
              {fmtStopwatchFull(l.total)}
            </Txt>
          </View>
        )}
      />
    </View>
  );
}
