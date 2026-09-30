import { useEffect, useState } from 'react';

/**
 * Hora atual re-renderizada a cada [intervalMs]. Para 1 s, alinha na virada
 * do segundo para o ponteiro e os dígitos mudarem juntos com o sistema.
 */
export function useNow(intervalMs = 1000, active = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      const wait = intervalMs >= 1000 ? intervalMs - (d.getMilliseconds() % 1000) + 5 : intervalMs;
      timer = setTimeout(tick, wait);
    };
    tick();
    return () => clearTimeout(timer);
  }, [intervalMs, active]);
  return now;
}
