export const pad = (n: number) => String(n).padStart(2, '0');

export const WEEK = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const WSHORT = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
export const WD3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const dateLong = (d: Date) => `${WEEK[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
export const dateShort = (d: Date) => `${WSHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

/** "07:30" ou "7:30 AM" conforme o formato escolhido. */
export function clockText(h: number, m: number, use24: boolean): string {
  return use24 ? `${pad(h)}:${pad(m)}` : `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

export type Days = boolean[]; // domingo..sábado

export function nextOccurrence(h: number, m: number, days: Days, now = new Date()): Date | null {
  const any = days.some(Boolean);
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(h, m, 0, 0);
    if (d <= now) continue;
    if (!any || days[d.getDay()]) return d;
  }
  return null;
}

export function inText(ms: number): string {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d) return h ? `em ${d} d ${h} h` : `em ${d} d`;
  return h ? `em ${h} h ${m} min` : `em ${m} min`;
}

export function repText(days: Days): string {
  const n = days.filter(Boolean).length;
  if (!n) return 'Uma vez';
  if (n === 7) return 'Todos os dias';
  if (n === 5 && !days[0] && !days[6]) return 'Dias úteis';
  if (n === 2 && days[0] && days[6]) return 'Fins de semana';
  return days
    .map((v, i) => (v ? WSHORT[i].replace('.', '') : null))
    .filter((s): s is string => !!s)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(', ');
}

/** "Hoje", "Amanhã" ou "qua." relativo a agora. */
export function dayWord(d: Date, now = new Date()): string {
  const a = new Date(d).setHours(0, 0, 0, 0), b = new Date(now).setHours(0, 0, 0, 0);
  const diff = Math.round((a - b) / 86400000);
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff === -1 ? 'Ontem' : WSHORT[d.getDay()];
}

/** Duração de timer: "05:00" ou "1:05:00". */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Tempo de cronômetro: principal "01:23" e centésimos ".45". */
export function fmtStopwatch(ms: number): { main: string; cs: string } {
  const cs = Math.floor(ms / 10) % 100;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return { main: h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`, cs: `.${pad(cs)}` };
}

export const fmtStopwatchFull = (ms: number) => {
  const f = fmtStopwatch(ms);
  return f.main + f.cs;
};

export const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
