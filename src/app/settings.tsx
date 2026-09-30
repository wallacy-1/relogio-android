import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { AppState, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Btn, Seg, SettingRow, StackHeader, Tag, Toggle, tap } from '@/components/ui';
import ClockNative, { type Permissions } from '@/lib/native';
import { SOUNDS, useSettings, type Sound } from '@/store/settings';
import { alpha, radius, shadow, useTheme } from '@/theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 18, borderRadius: 28, backgroundColor: t.surface }}>
      <Txt kicker color={t.accentText} style={{ paddingTop: 8, paddingBottom: 2 }}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

function SoundPicker({ label, value, onChange }: { label: string; value: Sound; onChange: (s: Sound) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => setOpen(true)}>
        <SettingRow label={label}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt size={14}>{value}</Txt>
            <Icon name="chevronRight" size={18} />
          </View>
        </SettingRow>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, justifyContent: 'center', padding: 18, backgroundColor: alpha('#2e2b25', 50) }}>
          <Pressable style={[{ borderRadius: radius.lg * 1.15, backgroundColor: t.surface, padding: 18, gap: 4 }, shadow.lg]}>
            <Txt font="heading" size={20} style={{ marginBottom: 8 }}>
              {label}
            </Txt>
            {SOUNDS.map((s) => {
              const on = s === value;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    onChange(s);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 18,
                    backgroundColor: pressed ? alpha(t.text, 8) : 'transparent',
                  })}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: on ? 5 : 1.5,
                      borderColor: on ? t.accent : t.divider,
                    }}
                  />
                  <Txt font="semibold">{s}</Txt>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const [perms, setPerms] = useState<Permissions | null>(() => ClockNative?.getPermissions() ?? null);

  // relê as permissões ao voltar das telas do sistema
  useFocusEffect(
    useCallback(() => {
      setPerms(ClockNative?.getPermissions() ?? null);
      const sub = AppState.addEventListener('change', (st) => st === 'active' && setPerms(ClockNative?.getPermissions() ?? null));
      return () => sub.remove();
    }, []),
  );

  const allOk = !!perms && perms.notifications && perms.exactAlarms && perms.fullScreen;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.bg }}>
      <StackHeader title="Configurações" />
      <ScrollView contentContainerStyle={{ gap: 14, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 + insets.bottom }}>
        <Section title="Relógio">
          <SettingRow label="Formato">
            <Seg bg={t.bg} options={[{ value: '12', label: '12 h' }, { value: '24', label: '24 h' }]} value={s.use24 ? '24' : '12'} onChange={(v) => s.set({ use24: v === '24' })} />
          </SettingRow>
          <SettingRow label="Tema">
            <Seg
              bg={t.bg}
              options={[
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Escuro' },
                { value: 'system', label: 'Sistema' },
              ]}
              value={s.theme}
              onChange={(theme) => s.set({ theme })}
            />
          </SettingRow>
        </Section>

        <Section title="Alarmes">
          <SoundPicker label="Som padrão" value={s.alarmSound} onChange={(alarmSound) => s.set({ alarmSound })} />
          <SettingRow label="Vibrar">
            <Toggle value={s.alarmVibrate} onChange={(alarmVibrate) => s.set({ alarmVibrate })} label="Vibrar nos alarmes" />
          </SettingRow>
          <SettingRow label="Soneca">
            <Seg
              bg={t.bg}
              options={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15 min' },
              ]}
              value={s.snoozeMin}
              onChange={(snoozeMin) => s.set({ snoozeMin })}
            />
          </SettingRow>
          <SettingRow label="Aumentar volume aos poucos">
            <Toggle value={s.gradual} onChange={(gradual) => s.set({ gradual })} label="Aumentar volume aos poucos" />
          </SettingRow>
        </Section>

        <Section title="Timers">
          <SoundPicker label="Som do timer" value={s.timerSound} onChange={(timerSound) => s.set({ timerSound })} />
          <SettingRow label="Vibrar">
            <Toggle value={s.timerVibrate} onChange={(timerVibrate) => s.set({ timerVibrate })} label="Vibrar nos timers" />
          </SettingRow>
        </Section>

        <View style={{ gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 28, backgroundColor: allOk ? alpha(t.accent2, 26) : alpha(t.accent, 22) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Txt font="bold" size={15} style={{ flex: 1 }}>
              Alarmes com o app fechado
            </Txt>
            <Tag label={allOk ? 'Ativo' : 'Ação necessária'} variant={allOk ? 'accent2' : 'accent'} />
          </View>
          {!perms ? (
            <Txt size={13} style={{ lineHeight: 18 }}>
              Módulo nativo indisponível nesta build. Gere um development build para os alarmes tocarem com o app fechado.
            </Txt>
          ) : allOk ? (
            <Txt size={13} style={{ lineHeight: 18 }}>
              Alarmes exatos e notificações permitidos. Alarmes e timers tocam mesmo com o app fechado ou após reiniciar o celular.
            </Txt>
          ) : (
            <View style={{ gap: 6 }}>
              <Txt size={13} style={{ lineHeight: 18 }}>
                Falta permitir algumas coisas para os alarmes tocarem com o app fechado:
              </Txt>
              {!perms.notifications && <Btn label="Permitir notificações" variant="secondary" style={{ alignSelf: 'flex-start' }} onPress={() => ClockNative?.openNotificationSettings()} />}
              {!perms.exactAlarms && <Btn label="Permitir alarmes exatos" variant="secondary" style={{ alignSelf: 'flex-start' }} onPress={() => ClockNative?.openExactAlarmSettings()} />}
              {!perms.fullScreen && <Btn label="Permitir tela cheia" variant="secondary" style={{ alignSelf: 'flex-start' }} onPress={() => ClockNative?.openFullScreenSettings()} />}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
