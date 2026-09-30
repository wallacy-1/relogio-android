import { Text, type TextProps, type TextStyle } from 'react-native';

import { fonts, useTheme } from '@/theme';

type Props = TextProps & {
  font?: keyof typeof fonts;
  size?: number;
  color?: string;
  /** Rótulos em caixa alta com espaçamento (padrão "Próximo alarme", "Ações rápidas"). */
  kicker?: boolean;
  tabular?: boolean;
};

export function Txt({ font = 'body', size = 15, color, kicker, tabular, style, ...rest }: Props) {
  const t = useTheme();
  const base: TextStyle = {
    fontFamily: fonts[font],
    fontSize: size,
    color: color ?? t.text,
    includeFontPadding: false,
  };
  if (font === 'heading') base.lineHeight = Math.round(size * 1.12);
  if (kicker) Object.assign(base, { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.96, textTransform: 'uppercase' });
  if (tabular) base.fontVariant = ['tabular-nums'];
  return <Text style={[base, style]} {...rest} />;
}
