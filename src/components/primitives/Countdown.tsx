'use client';

/**
 * Countdown (docs/13 C-19) — renders a server-deadline timer in tabular numerals so it never
 * jitters. Stays calm (no alarming color) until it actually expires, per the wave-down spec.
 * role="timer" with an accessible label; not spammed to aria-live every tick.
 */
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useCountdown } from '@/lib/hooks/useCountdown';

export interface CountdownProps {
  /** ISO-8601 UTC deadline from the server. */
  deadline: string | undefined;
  /** Turn danger-colored only at expiry (default) or when under this many ms remain. */
  urgentAtMs?: number;
  onDone?: () => void;
}

export function Countdown({ deadline, urgentAtMs = 0, onDone }: CountdownProps) {
  const { display, remainingMs, done } = useCountdown(deadline);
  const firedRef = useRef(false);

  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      onDone?.();
    }
    if (!done) firedRef.current = false;
  }, [done, onDone]);

  const urgent = remainingMs <= urgentAtMs;
  return (
    <Time className="tnum" role="timer" aria-label={`${display} remaining`} $urgent={urgent}>
      {display}
    </Time>
  );
}

const Time = styled.span<{ $urgent: boolean }>`
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme, $urgent }) => ($urgent ? theme.color.statusDanger : theme.color.textPrimary)};
`;
