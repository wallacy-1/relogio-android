import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Btn, Card, RoundAction, TabHeader, Tag, tap } from '@/components/ui';
import { fmtDuration, hhmm } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { useHistory } from '@/store/history';
import { useSettings } from '@/store/settings';
import { remainingOf, useTimers, type Timer } from '@/store/timers';
import { alpha, shadow, useTheme } from '@/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const;
const PRESETS = [1, 5, 10, 25];

/** Dígitos digitados (até 6) → h, m, s alinhados à direita, como no relógio do Android. */
function split(digits: string) {
  const d = digits.padStart(6, '0');
  return { h: d.slice(0, 2), m: d.slice(2, 4), s: d.slice(4, 6) };
}
const toMs = (digits: string) => {
  const { h, m, s } = split(digits);
  return (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000;
};
const fromMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}${String(m).padStart(2, '0')}${String(sec).padStart(2, '0')}`.replace(/^0+/, '');
};

function SetDuration({ onCancel, onStarted }: { onCancel?: () => void; onStarted: (id: string) => void }) {
  const t = useTheme();
  const [digits, setDigits] = useState('500');
  const history = useHistory((s) => s.items);
  const ms = toMs(digits);
  const { h, m, s } = split(digits);
  const lead = digits.length;

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: { totalMs: number; label: string }[] = [];
    for (const it of history) {
      if (it.kind !== 'timer') continue;
      const key = `${it.totalMs}|${it.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ totalMs: it.totalMs, label: it.label });
      if (out.length === 3) break;
    }
    return out;
  }, [history]);

  const press = (k: (typeof KEYS)[number]) => {
    tap();
    if (k === 'del') return setDigits((d) => d.slice(0, -1));
    setDigits((d) => (d + k).replace(/^0+/, '').slice(0, 6));
  };
  const start = (total: number, label?: string) => {
    if (total <= 0) return;
    onStarted(useTimers.getState().start(total, label));
  };

  const part = (v: string, unit: string, digitsIn: number, last?: boolean) => {
    const dim = lead < digitsIn;
    return (
      <>
        <Txt font="heading" size={60} color={dim ? alpha(t.text, 40) : t.text} style={{ lineHeight: 68 }}>
          {v}
        </Txt>
        <Txt font="heading" size={20} color={dim ? alpha(t.text, 50) : t.text} style={{ marginRight: last ? 0 : 10 }}>
          {unit}
        </Txt>
      </>
    );
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }} accessible accessibilityLabel={`Duração ${Number(h)} horas ${Number(m)} minutos ${Number(s)} segundos`}>
        {part(h, 'h', 5)}
        {part(m, 'm', 3)}
        {part(s, 's', 1, true)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map((p) => (
          <Btn key={p} label={`${p} min`} variant={ms === p * 60000 ? 'primary' : 'secondary'} onPress={() => setDigits(`${p}00`)} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={k === 'del' ? 'Apagar' : k}
            onPress={() => press(k)}
            onLongPress={() => k === 'del' && setDigits('')}
            style={({ pressed }) => ({
              width: '31.5%',
              flexGrow: 1,
              height: 58,
              borderRadius: 999,
              backgroundColor: pressed ? alpha(t.accent, 26) : t.surface,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            {k === 'del' ? <Icon name="backspace" size={24} /> : <Txt font="heading" size={24}>{k}</Txt>}
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Iniciar"
          disabled={ms <= 0}
          onPress={() => {
            tap();
            start(ms);
          }}
          style={[{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', opacity: ms > 0 ? 1 : 0.45 }, shadow.md]}
        >
          <Icon name="play" size={28} color={t.onAccent} />
        </Pressable>
        <Txt font="heading" size={18} style={{ flex: 1 }}>
          Iniciar
        </Txt>
        {onCancel && <Btn label="Voltar" variant="ghost" onPress={onCancel} />}
      </View>
      {recents.length > 0 && (
        <View style={{ gap: 8 }}>
          <Txt kicker color={alpha(t.text, 65)}>
            Recentes
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recents.map((r) => (
              <Pressable
                key={`${r.totalMs}${r.label}`}
                accessibilityRole="button"
                accessibilityLabel={`Iniciar ${r.label} ${fmtDuration(r.totalMs)}`}
                onPress={() => {
                  tap();
                  start(r.totalMs, r.label);
                }}
                onLongPress={() => setDigits(fromMs(r.totalMs))}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 8,
                  paddingLeft: 8,
                  paddingRight: 14,
                  borderRadius: 999,
                  backgroundColor: alpha(t.accent2, pressed ? 40 : 28),
                })}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="play" size={12} />
                </View>
                <View>
                  <Txt font="bold" size={14} style={{ lineHeight: 16 }}>
                    {fmtDuration(r.totalMs)}
                  </Txt>
                  <Txt size={11} style={{ lineHeight: 13 }}>
                    {r.label}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const R = 128, C = 2 * Math.PI * R;

function MainTimer({ timer, now }: { timer: Timer; now: number }) {
  const t = useTheme();
  const use24 = useSettings((s) => s.use24);
  const { pause, resume, cancel, addMinute, restart } = useTimers.getState();
  const rem = remainingOf(timer, now);
  const frac = timer.totalMs ? rem / timer.totalMs : 0;
  const endAt = timer.running ? timer.endAt : now + rem;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ width: 280, height: 280, alignSelf: 'center' }}>
        <Svg width={280} height={280} viewBox="0 0 280 280">
          <Circle cx={140} cy={140} r={R} fill={t.surface} />
          <Circle cx={140} cy={140} r={R} fill="none" stroke={alpha(t.text, 10)} strokeWidth={14} />
          <Circle
            cx={140}
            cy={140}
            r={R}
            fill="none"
            stroke={timer.running ? t.accent : t.accent2}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            transform="rotate(-90 140 140)"
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Tag label={timer.running ? timer.label : `${timer.label} · pausado`} variant={timer.running ? 'accent' : 'neutral'} style={{ alignSelf: 'center' }} />
          <Txt font="heading" size={rem >= 3600000 ? 48 : 64} style={{ lineHeight: 70 }} accessibilityLiveRegion="none">
            {fmtDuration(rem)}
          </Txt>
          <Txt size={14} color={alpha(t.text, 68)}>
            de {fmtDuration(timer.totalMs)} · termina {hhmm(endAt, use24)}
          </Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <RoundAction icon="close" label="Cancelar" onPress={() => cancel(timer.id)} />
        <RoundAction
          icon={timer.running ? 'pause' : 'play'}
          label={timer.running ? 'Pausar' : 'Retomar'}
          primary
          size={84}
          onPress={() => (timer.running ? pause(timer.id) : resume(timer.id))}
        />
        <RoundAction text="+1:00" label="Adicionar" onPress={() => addMinute(timer.id)} />
        <RoundAction icon="restart" label="Reiniciar" onPress={() => restart(timer.id)} />
      </View>
    </View>
  );
}

function MiniTimer({ timer, now, onSelect }: { timer: Timer; now: number; onSelect: () => void }) {
  const t = useTheme();
  const rem = remainingOf(timer, now);
  return (
    <Pressable onPress={onSelect} accessibilityRole="button" accessibilityLabel={`Mostrar ${timer.label}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingRight: 14, paddingLeft: 20 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt font="bold" size={15} numberOfLines={1} style={{ flexShrink: 1 }}>
              {timer.label}
            </Txt>
            {!timer.running && <Tag label="Pausado" variant="neutral" />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Txt font="heading" size={28}>
              {fmtDuration(rem)}
            </Txt>
            <Txt size={13} color={alpha(t.text, 68)}>
              de {fmtDuration(timer.totalMs)}
            </Txt>
          </View>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: alpha(t.text, 10) }}>
            <View style={{ width: `${Math.round((rem / timer.totalMs) * 100)}%`, height: '100%', borderRadius: 999, backgroundColor: t.accent2 }} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={timer.running ? 'Pausar' : 'Retomar'}
          onPress={() => {
            tap();
            (timer.running ? useTimers.getState().pause : useTimers.getState().resume)(timer.id);
          }}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.accent2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={timer.running ? 'pause' : 'play'} size={20} color={t.onAccent} />
        </Pressable>
      </Card>
    </Pressable>
  );
}

export default function TimerScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const timers = useTimers((s) => s.timers);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const now = useNow(250, timers.length > 0).getTime();
  const params = useLocalSearchParams<{ action?: string; id?: string; sec?: string }>();

  // Ações vindas de notificação ou atalho do ícone (relogio://timer?action=...)
  useEffect(() => {
    const { action, id, sec } = params;
    if (!action) return;
    const s = useTimers.getState();
    if (action === 'start' && sec) {
      const total = Number(sec) * 1000;
      setSelected(s.start(total, `Timer ${Math.round(total / 60000)} min`));
      setAdding(false);
    } else if (id) {
      if (action === 'pause') s.pause(id);
      if (action === 'resume') s.resume(id);
      if (action === 'add') s.addMinute(id);
      if (action === 'cancel') s.cancel(id);
      setSelected(id);
    }
    router.setParams({ action: undefined, id: undefined, sec: undefined });
  }, [params]);

  const main = timers.find((x) => x.id === selected) ?? timers[0];
  const others = timers.filter((x) => x !== main);
  const showSet = adding || !main;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.bg }}>
      <TabHeader title="Timer" icon="history" iconLabel="Histórico" onIcon={() => router.push('/history')} />
      <ScrollView contentContainerStyle={{ gap: 20, paddingHorizontal: 24, paddingTop: 6, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {showSet ? (
          <SetDuration
            onCancel={main ? () => setAdding(false) : undefined}
            onStarted={(id) => {
              setSelected(id);
              setAdding(false);
            }}
          />
        ) : (
          <>
            <MainTimer timer={main} now={now} />
            {others.map((x) => (
              <MiniTimer key={x.id} timer={x} now={now} onSelect={() => setSelected(x.id)} />
            ))}
            <Btn label="Novo timer" icon="plus" onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start' }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
