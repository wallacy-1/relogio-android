// Tokens do design system Organic (styles.css) e o mapeamento do modo escuro do design.

export const ramps = {
  neutral: { 100: '#f9f4ed', 200: '#eee7db', 300: '#dcd3c4', 400: '#c0b6a5', 500: '#a19786', 600: '#82796a', 700: '#645c50', 800: '#474238', 900: '#2e2b25' },
  accent: { 100: '#fff2eb', 200: '#ffe1d0', 300: '#ffc6a5', 400: '#f6a06b', 500: '#d67f48', 600: '#b2622d', 700: '#8c491a', 800: '#643312', 900: '#402310' },
  accent2: { 100: '#f0fae1', 200: '#e1eecc', 300: '#ccdbb2', 400: '#aebf92', 500: '#8fa073', 600: '#728157', 700: '#56633f', 800: '#3d472b', 900: '#272e1b' },
} as const;

export const fonts = {
  heading: 'Caprasimo_400Regular',
  body: 'Figtree_400Regular',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

export const radius = { sm: 8, md: 16, lg: 28, pill: 999 } as const;

export type Theme = {
  dark: boolean;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  accent2: string;
  divider: string;
  /** --color-accent-700: texto de destaque legível sobre o fundo */
  accentText: string;
  accent2Text: string;
  onAccent: string;
  tagAccent2Bg: string;
  tagAccentBg: string;
  tagAccentText: string;
  tagNeutralBg: string;
  tagNeutralText: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** Equivalente a color-mix(in srgb, a pct%, b). */
export function mix(a: string, pct: number, b: string): string {
  const x = hexToRgb(a), y = hexToRgb(b), p = pct / 100;
  return `#${toHex(x[0] * p + y[0] * (1 - p))}${toHex(x[1] * p + y[1] * (1 - p))}${toHex(x[2] * p + y[2] * (1 - p))}`;
}

/** Equivalente a color-mix(in srgb, c pct%, transparent). */
export function alpha(c: string, pct: number): string {
  return `${c}${toHex((pct / 100) * 255)}`;
}

export const light: Theme = {
  dark: false,
  bg: '#f5ead8',
  surface: '#ebddc5',
  text: '#201e1d',
  accent: '#c67139',
  accent2: '#7a8a5e',
  divider: alpha('#201e1d', 16),
  accentText: ramps.accent[700],
  accent2Text: ramps.accent2[800],
  onAccent: ramps.neutral[900],
  tagAccent2Bg: ramps.accent2[100],
  tagAccentBg: ramps.accent[100],
  tagAccentText: ramps.accent[800],
  tagNeutralBg: ramps.neutral[100],
  tagNeutralText: ramps.neutral[800],
};

export const dark: Theme = {
  dark: true,
  bg: ramps.neutral[900],
  surface: ramps.neutral[800],
  text: ramps.neutral[100],
  accent: ramps.accent[400],
  accent2: ramps.accent2[400],
  divider: alpha(ramps.neutral[100], 18),
  accentText: ramps.accent[300],
  accent2Text: ramps.accent2[300],
  onAccent: ramps.neutral[900],
  tagAccent2Bg: alpha(ramps.accent2[400], 26),
  tagAccentBg: alpha(ramps.accent[400], 24),
  tagAccentText: ramps.accent[200],
  tagNeutralBg: alpha(ramps.neutral[100], 12),
  tagNeutralText: ramps.neutral[200],
};

export const shadow = {
  sm: { elevation: 1, shadowColor: '#2e2b25', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  md: { elevation: 4, shadowColor: '#2e2b25', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  lg: { elevation: 10, shadowColor: '#2e2b25', shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
} as const;
