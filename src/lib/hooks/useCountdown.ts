'use client';

/**
 * Ticks a countdown derived from a SERVER-supplied deadline timestamp (docs/13 C-19) — never a
 * client-started duration. On reconnect the caller passes a fresh deadline and the display
 * corrects itself. Returns the formatted mm:ss, remaining ms, and a done flag.
 */
import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/format';

export function useCountdown(deadlineIso: string | undefined): {
  display: string;
  remainingMs: number;
  done: boolean;
} {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadlineIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  if (!deadlineIso) return { display: '0:00', remainingMs: 0, done: true };

  const remainingMs = Math.max(0, new Date(deadlineIso).getTime() - now);
  return {
    display: formatCountdown(deadlineIso, now),
    remainingMs,
    done: remainingMs <= 0,
  };
}
