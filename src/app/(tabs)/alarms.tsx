import { router } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Card, TabHeader, Toggle, tap } from '@/components/ui';
import { LETTERS, clockText, inText, nextOccurrence, repText } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { useAlarms, type Alarm } from '@/store/alarms';
import { useSettings } from '@/store/settings';
import { alpha, shadow, useTheme } from '@/theme';

function AlarmCard({ a, now }: { a: Alarm; now: Date }) {
  const t = useTheme();
  const use24 = useSettings((s) => s.use24);
  const toggle = useAlarms((s) => s.toggle);
  const nx = a.on ? nextOccurrence(a.h, a.m, a.days, now) : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Editar alarme ${clockText(a.h, a.m, use24)} ${a.label}`} onPress={() => router.push(`/alarm/${a.id}`)}>
      {({ pressed }) => (
        <Card style={{ paddingVertical: 16, paddingRight: 18, paddingLeft: 22, opacity: pressed ? 0.85 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <Txt font="heading" size={40} color={a.on ? t.text : alpha(t.text, 45)} style={{ lineHeight: 44 }}>
                {clockText(a.h, a.m, use24)}
              </Txt>
              <Txt font="semibold" size={14} numberOfLines={1}>
                {a.label ? `${a.label} · ` : ''}
                {repText(a.days)}
              </Txt>
            </View>
            <Toggle value={a.on} onChange={(v) => toggle(a.id, v)} label={`Alarme ${clockText(a.h, a.m, use24)}`} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {a.days.map((on, i) => (
                <View
                  key={i}
                  style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? alpha(t.accent2, 45) : 'transparent' }}
                >
                  <Txt font={on ? 'bold' : 'semibold'} size={11} color={on ? t.text : alpha(t.text, 50)}>
                    {LETTERS[i]}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt font="semibold" size={12} color={alpha(t.text, 68)}>
              {nx ? inText(nx.getTime() - now.getTime()) : 'Desativado'}
            </Txt>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

export default function AlarmsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const alarms = useAlarms((s) => s.alarms);
  const now = useNow(30000);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.bg }}>
      <TabHeader title="Alarmes" icon="sliders" iconLabel="Configurações" onIcon={() => router.push('/settings')} />
      <FlatList
        data={alarms}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AlarmCard a={item} now={now} />}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 80 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: alpha(t.accent2, 30), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="alarm" size={40} />
            </View>
            <Txt font="heading" size={24}>
              Nenhum alarme
            </Txt>
            <Txt size={15} color={alpha(t.text, 70)}>
              Crie um alarme e ele toca mesmo com o app fechado.
            </Txt>
          </View>
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Novo alarme"
        onPress={() => {
          tap();
          router.push('/alarm/new');
        }}
        style={({ pressed }) => [
          {
            position: 'absolute',
            right: 20,
            bottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 60,
            paddingLeft: 18,
            paddingRight: 24,
            borderRadius: 999,
            backgroundColor: t.accent,
            opacity: pressed ? 0.88 : 1,
          },
          shadow.lg,
        ]}
      >
        <Icon name="plus" color={t.onAccent} />
        <Txt font="heading" size={16} color={t.onAccent}>
          Novo alarme
        </Txt>
      </Pressable>
    </View>
  );
}
