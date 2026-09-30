import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, radius, ramps, shadow, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export const tap = () => Haptics.selectionAsync().catch(() => {});

type BtnProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Btn({ label, variant = 'secondary', icon, size = 14, color, style, onPress, ...rest }: BtnProps) {
  const t = useTheme();
  const fg = color ?? (variant === 'primary' ? t.bg : variant === 'ghost' ? t.accentText : t.text);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          paddingHorizontal: variant === 'ghost' ? 12 : 16,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: variant === 'secondary' ? t.divider : 'transparent',
          backgroundColor:
            variant === 'primary'
              ? pressed ? (t.dark ? ramps.accent[300] : ramps.accent[600]) : t.accent
              : pressed
                ? alpha(variant === 'ghost' ? t.accent : t.text, variant === 'ghost' ? 18 : 12)
                : 'transparent',
        },
        style,
      ]}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} color={fg} />}
      <Txt font="heading" size={size} color={fg} style={{ lineHeight: size * 1.25 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Tag({ label, variant = 'accent2', style }: { label: string; variant?: 'accent' | 'accent2' | 'neutral'; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [bg, fg] =
    variant === 'accent' ? [t.tagAccentBg, t.tagAccentText] : variant === 'neutral' ? [t.tagNeutralBg, t.tagNeutralText] : [t.tagAccent2Bg, t.accent2Text];
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }, style]}>
      <Txt font="bold" size={11} color={fg} style={{ letterSpacing: 0.22 }}>
        {label}
      </Txt>
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  const t = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 6, speed: 18 }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onChange(!value);
      }}
    >
      <Animated.View
        style={{
          width: 56,
          height: 34,
          borderRadius: radius.pill,
          padding: 4,
          backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [alpha(t.text, 16), t.accent] }),
        }}
      >
        <Animated.View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: t.bg,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  bg,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  bg?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: t.divider, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: bg }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={({ pressed }) => ({
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderLeftWidth: i ? 1 : 0,
              borderLeftColor: t.divider,
              backgroundColor: on ? t.accent : pressed ? alpha(t.text, 7) : 'transparent',
            })}
          >
            <Txt size={13} font={on ? 'semibold' : 'body'} color={on ? t.bg : t.text}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderRadius: radius.lg * 1.15, padding: 16, gap: 10 }, style]}>{children}</View>;
}

export function Blob({ size, color, style }: { size: number; color: string; style: ViewStyle }) {
  return <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

export function IconButton({ name, onPress, label, size = 22, color }: { name: IconName; onPress: () => void; label: string; size?: number; color?: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? alpha(t.text, 10) : 'transparent' })}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

export function TabHeader({ title, icon, iconLabel, onIcon }: { title: string; icon: IconName; iconLabel: string; onIcon: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingRight: 16, paddingBottom: 4, paddingLeft: 24 }}>
      <Txt font="heading" size={28} accessibilityRole="header">
        {title}
      </Txt>
      <IconButton name={icon} label={iconLabel} onPress={onIcon} />
    </View>
  );
}

export function StackHeader({ title, close, right }: { title: string; close?: boolean; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingRight: 16, paddingBottom: 4, paddingLeft: 12 }}>
      <IconButton name={close ? 'close' : 'back'} label={close ? 'Fechar' : 'Voltar'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Txt font="heading" size={20} style={{ flex: 1 }} accessibilityRole="header">
        {title}
      </Txt>
      {right}
    </View>
  );
}

export function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, gap: 12 }}>
      <Txt font="semibold" size={15} style={{ flex: 1 }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}

export function RoundAction({
  icon,
  text,
  label,
  onPress,
  size = 60,
  primary,
  color,
}: {
  icon?: IconName;
  text?: string;
  label: string;
  onPress: () => void;
  size?: number;
  primary?: boolean;
  color?: string;
}) {
  const t = useTheme();
  const bg = color ?? t.accent;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: primary ? 0 : 1.5,
            borderColor: t.divider,
            backgroundColor: primary ? bg : pressed ? alpha(t.text, 8) : 'transparent',
            opacity: primary && pressed ? 0.85 : 1,
          },
          primary && shadow.md,
        ]}
      >
        {icon ? <Icon name={icon} size={primary ? 30 : 22} color={primary ? t.onAccent : t.text} /> : <Txt font="heading" size={15}>{text}</Txt>}
      </Pressable>
      <Txt font="semibold" size={12}>
        {label}
      </Txt>
    </View>
  );
}

