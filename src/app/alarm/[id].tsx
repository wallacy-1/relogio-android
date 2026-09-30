import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Btn, Seg, SettingRow, StackHeader, Tag, Toggle, tap } from '@/components/ui';
import { LETTERS, inText, nextOccurrence, pad, repText, uid } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { useAlarms, type Alarm } from '@/store/alarms';
import { SOUNDS, useSettings } from '@/store/settings';
import { alpha, fonts, radius, useTheme } from '@/theme';

/** Botão de seta que repete enquanto está pressionado. */
function Stepper({ dir, onStep, label }: { dir: 'up' | 'down'; onStep: () => void; label: string }) {
  const t = useTheme();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const repeat = () => {
    onStep();
    timer.current = setTimeout(repeat, 80);
  };
  useEffect(() => stop, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        tap();
        onStep();
      }}
      delayLongPress={400}
      onLongPress={() => {
        stop();
        repeat();
      }}
      onPressOut={stop}
      style={{ padding: 4 }}
    >
      <Icon name={dir === 'up' ? 'chevronUp' : 'chevronDown'} size={26} color={alpha(t.text, 55)} />
    </Pressable>
  );
}

function TimeBox({ value, selected, onSelect, onUp, onDown, name }: { value: string; selected: boolean; onSelect: () => void; onUp: () => void; onDown: () => void; name: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Stepper dir="up" onStep={onUp} label={`Aumentar ${name}`} />
      <Pressable
        onPress={onSelect}
        accessibilityRole="adjustable"
        accessibilityLabel={`${name}: ${value}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? onUp() : onDown())}
        style={{ width: 120, height: 104, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? alpha(t.accent, 24) : t.surface }}
      >
        <Txt font="heading" size={68} style={{ lineHeight: 76 }}>
          {value}
        </Txt>
      </Pressable>
      <Stepper dir="down" onStep={onDown} label={`Diminuir ${name}`} />
    </View>
  );
}

export default function EditAlarmScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings();
  const existing = useAlarms((s) => s.alarms.find((a) => a.id === id));
  const isNew = !existing;

  const [draft, setDraft] = useState<Alarm>(
    () =>
      existing ?? {
        id: uid(),
        h: 7,
        m: 0,
        label: '',
        days: [false, true, true, true, true, true, false],
        on: true,
        sound: settings.alarmSound,
        vibrate: settings.alarmVibrate,
        gradual: settings.gradual,
      },
  );
  const [focus, setFocus] = useState<'h' | 'm'>('h');
  const now = useNow(30000);
  const patch = (p: Partial<Alarm>) => setDraft((d) => ({ ...d, ...p }));
  const stepH = (n: number) => setDraft((d) => ({ ...d, h: (d.h + n + 24) % 24 }));
  const stepM = (n: number) => setDraft((d) => ({ ...d, m: (d.m + n + 60) % 60 }));
  const next = nextOccurrence(draft.h, draft.m, draft.days, now);

  const save = () => {
    useAlarms.getState().upsert({ ...draft, on: true });
    router.back();
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.bg }}>
      <StackHeader title={isNew ? 'Novo alarme' : 'Editar alarme'} close right={<Btn label="Salvar" variant="primary" onPress={save} style={{ paddingHorizontal: 20 }} />} />
      <ScrollView contentContainerStyle={{ gap: 20, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 24 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TimeBox
              name="hora"
              value={settings.use24 ? pad(draft.h) : pad(draft.h % 12 || 12)}
              selected={focus === 'h'}
              onSelect={() => setFocus('h')}
              onUp={() => (setFocus('h'), stepH(1))}
              onDown={() => (setFocus('h'), stepH(-1))}
            />
            <Txt font="heading" size={56}>
              :
            </Txt>
            <TimeBox
              name="minutos"
              value={pad(draft.m)}
              selected={focus === 'm'}
              onSelect={() => setFocus('m')}
              onUp={() => (setFocus('m'), stepM(1))}
              onDown={() => (setFocus('m'), stepM(-1))}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {next && <Tag label={`Toca ${inText(next.getTime() - now.getTime())}`} />}
            {!settings.use24 && (
              <Seg
                options={[{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]}
                value={draft.h < 12 ? 'AM' : 'PM'}
                onChange={(v) => patch({ h: v === 'AM' ? draft.h % 12 : (draft.h % 12) + 12 })}
              />
            )}
          </View>
        </View>

        <View>
          <Txt size={12} color={alpha(t.text, 70)} style={{ marginBottom: 5 }}>
            Nome
          </Txt>
          <TextInput
            value={draft.label}
            onChangeText={(label) => patch({ label })}
            placeholder="Acordar"
            placeholderTextColor={alpha(t.text, 40)}
            cursorColor={t.accent}
            selectionColor={alpha(t.accent, 30)}
            maxLength={40}
            style={{
              minHeight: 48,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: t.divider,
              backgroundColor: t.surface,
              color: t.text,
              fontFamily: fonts.body,
              fontSize: 16,
            }}
          />
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt font="bold" size={15}>
              Repetir
            </Txt>
            <Txt size={13} color={alpha(t.text, 68)}>
              {repText(draft.days)}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {draft.days.map((on, i) => (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][i]}
                onPress={() => {
                  tap();
                  patch({ days: draft.days.map((d, j) => (j === i ? !d : d)) });
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? t.accent : 'transparent',
                  borderWidth: on ? 0 : 1.5,
                  borderColor: t.divider,
                }}
              >
                <Txt font={on ? 'bold' : 'semibold'} color={on ? t.onAccent : t.text}>
                  {LETTERS[i]}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Txt font="bold" size={15}>
            Som
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SOUNDS.map((s) => (
              <Btn key={s} label={s} variant={draft.sound === s ? 'primary' : 'secondary'} onPress={() => patch({ sound: s })} style={{ paddingVertical: 9 }} />
            ))}
          </View>
        </View>

        <View>
          <SettingRow label="Vibrar">
            <Toggle value={draft.vibrate} onChange={(vibrate) => patch({ vibrate })} label="Vibrar" />
          </SettingRow>
          <SettingRow label="Aumentar volume aos poucos">
            <Toggle value={draft.gradual} onChange={(gradual) => patch({ gradual })} label="Aumentar volume aos poucos" />
          </SettingRow>
        </View>

        {!isNew && (
          <Btn
            label="Excluir alarme"
            variant="ghost"
            icon="trash"
            size={15}
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
            onPress={() => {
              useAlarms.getState().remove(draft.id);
              router.back();
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}
