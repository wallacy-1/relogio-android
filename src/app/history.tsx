import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Btn, Seg, StackHeader } from '@/components/ui';
import { MONTHS, dayWord, fmtDuration, fmtStopwatchFull, hhmm } from '@/lib/time';
import { useHistory, type HistoryItem } from '@/store/history';
import { useTimers } from '@/store/timers';
import { alpha, useTheme } from '@/theme';

type Filter = 'all' | 'timer' | 'stopwatch';

function dayTitle(ms: number) {
  const d = new Date(ms);
  const w = dayWord(d);
  return w === 'Hoje' || w === 'Ontem' ? w : `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function subtitle(h: HistoryItem) {
  if (h.kind === 'timer') {
    return h.status === 'done' ? `${h.label} · concluído às ${hhmm(h.at)}` : `${h.label} · cancelado aos ${fmtDuration(h.elapsedMs)}`;
  }
  const laps = h.laps ? ` · ${h.laps} voltas` : '';
  return `${h.label}${laps} · ${hhmm(h.startedAt || h.at)}`;
}

function Row({ h }: { h: HistoryItem }) {
  const t = useTheme();
  const isTimer = h.kind === 'timer';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, paddingLeft: 14, borderRadius: 24, backgroundColor: t.surface }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isTimer ? alpha(t.accent, 26) : alpha(t.accent2, 36),
        }}
      >
        <Icon name={isTimer ? 'timer' : 'stopwatch'} size={20} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt font="heading" size={20}>
          {isTimer ? fmtDuration(h.totalMs) : fmtStopwatchFull(h.elapsedMs)}
        </Txt>
        <Txt size={13} color={alpha(t.text, 70)} numberOfLines={2}>
          {subtitle(h)}
        </Txt>
      </View>
      {isTimer && (
        <Btn
          label="Repetir"
          style={{ paddingVertical: 8, paddingHorizontal: 14 }}
          onPress={() => {
            useTimers.getState().start(h.totalMs, h.label);
            router.navigate('/timer');
          }}
        />
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const items = useHistory((s) => s.items);
  const [filter, setFilter] = useState<Filter>('all');

  const sections = useMemo(() => {
    const groups: { title: string; data: HistoryItem[] }[] = [];
    for (const it of items) {
      if (filter !== 'all' && it.kind !== filter) continue;
      const title = dayTitle(it.at);
      const g = groups[groups.length - 1];
      if (g?.title === title) g.data.push(it);
      else groups.push({ title, data: [it] });
    }
    return groups;
  }, [items, filter]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.bg }}>
      <StackHeader title="Histórico" />
      <SectionList
        sections={sections}
        keyExtractor={(h) => h.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 + insets.bottom, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ alignSelf: 'flex-start', marginBottom: 6 }}>
            <Seg
              options={[
                { value: 'all', label: 'Tudo' },
                { value: 'timer', label: 'Timers' },
                { value: 'stopwatch', label: 'Cronômetros' },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Txt kicker color={alpha(t.text, 65)} style={{ paddingTop: 14, paddingHorizontal: 4, paddingBottom: 8 }}>
            {section.title}
          </Txt>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => <Row h={item} />}
        ListEmptyComponent={
          <Txt size={15} color={alpha(t.text, 70)} style={{ paddingTop: 24, paddingHorizontal: 4 }}>
            Timers concluídos e cronômetros zerados aparecem aqui.
          </Txt>
        }
        ListFooterComponent={
          items.length > 0 ? (
            <Btn label="Limpar histórico" variant="ghost" size={15} style={{ alignSelf: 'flex-start', marginTop: 16 }} onPress={() => useHistory.getState().clear()} />
          ) : null
        }
      />
    </View>
  );
}
