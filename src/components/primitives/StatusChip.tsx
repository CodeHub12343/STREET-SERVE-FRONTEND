'use client';

/**
 * StatusChip (docs/06 §2.6, §2.8) — status is ALWAYS carried by color + icon + text, never color
 * alone (colorblind-safe). Drives the shared status vocabulary: Driving / Parked / Away-Closed /
 * Pop-Up / Free / Discount. The color resolves from the theme's semantic status map.
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Navigation, ParkingSquare, Moon, Zap, Gift, Percent } from 'lucide-react';
import type { StatusKey } from '@/styles/tokens';

export type StatusVariant = 'driving' | 'parked' | 'away' | 'popup' | 'free' | 'discount';

const config: Record<
  StatusVariant,
  { statusKey: StatusKey; label: string; icon: ReactNode }
> = {
  driving: { statusKey: 'driving', label: 'Driving', icon: <Navigation size={13} /> },
  parked: { statusKey: 'parked', label: 'Parked', icon: <ParkingSquare size={13} /> },
  away: { statusKey: 'away', label: 'Closed', icon: <Moon size={13} /> },
  popup: { statusKey: 'warning', label: 'Pop-Up', icon: <Zap size={13} /> },
  free: { statusKey: 'live', label: 'Free', icon: <Gift size={13} /> },
  discount: { statusKey: 'discount', label: 'Discount', icon: <Percent size={13} /> },
};

export interface StatusChipProps {
  status: StatusVariant;
  /** Override the default label (e.g. "15% off", "Closed — opens 10 AM"). */
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusChip({ status, label, size = 'md' }: StatusChipProps) {
  const c = config[status];
  return (
    <Root $status={c.statusKey} $size={size}>
      <span aria-hidden>{c.icon}</span>
      {label ?? c.label}
    </Root>
  );
}

const Root = styled.span<{ $status: StatusKey; $size: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: ${({ $size }) => ($size === 'sm' ? 22 : 26)}px;
  padding: 0 ${({ $size }) => ($size === 'sm' ? 8 : 10)}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: ${({ $size }) => ($size === 'sm' ? 11 : 12)}px;
  font-weight: 700;
  white-space: nowrap;
  /* Text is a same-hue mix toward the theme's text color so it meets WCAG AA on the tint:
     it darkens the hue in light mode, lightens it in dark mode. The status token itself stays
     vibrant for the tinted background (and for pins/dots elsewhere). */
  color: ${({ theme, $status }) =>
    `color-mix(in srgb, ${theme.status($status)} 55%, ${theme.color.textPrimary})`};
  background: ${({ theme, $status }) =>
    `color-mix(in srgb, ${theme.status($status)} 16%, transparent)`};

  svg {
    flex: none;
  }
`;
