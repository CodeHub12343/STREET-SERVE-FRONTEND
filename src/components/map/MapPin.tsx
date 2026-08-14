'use client';

/**
 * MapPin (docs/13 C-10, docs/06 §2.5) — a business's uploaded logo inside a colored status ring
 * (Driving / Parked / Away-Closed). Driving pins pulse (collapsed under prefers-reduced-motion via
 * GlobalStyle). Away pins desaturate AND shrink. An optional ETA chip sits below. Status is carried
 * by ring color + desaturation + scale + the chip text — never color alone (a11y §2.8).
 *
 * Elevation is per-theme (MAP_REDESIGN_SPECIFICATION §9.5). On the light "Paper" basemap the pin
 * separates via a white knockout ring — a solid halo between the status ring and the map that reads
 * over any land/road/park/water color underneath. The colored glow does nothing on pale land, so it
 * is a dark-mode-only device. A downward tail (§9.1) anchors the pin to its point: a ringed circle
 * with no tail hovers *near* a location; the tail marks *the* location, and connects the ring to the
 * ETA chip below it.
 *
 * Presentational: used both on the Map (as a portal node) and standalone in Storybook.
 */
import styled, { css, keyframes } from 'styled-components';
import { Avatar } from '@/components/primitives/Avatar';

export type PinStatus = 'driving' | 'parked' | 'away';

/**
 * Render order on the map: a live (driving) vendor must never be occluded by a closed one. Map.tsx
 * applies this to each marker's z-index; exported here so the ranking lives beside the visual it
 * ranks (docs §9.3).
 */
export const STATUS_PRIORITY: Record<PinStatus, number> = {
  driving: 30,
  parked: 20,
  away: 10,
};

export interface MapPinProps {
  name: string;
  logoUrl?: string;
  status: PinStatus;
  /** e.g. "2 min" when live; hidden/replaced by "Closed" for away. */
  etaLabel?: string;
  onClick?: () => void;
}

export function MapPin({ name, logoUrl, status, etaLabel, onClick }: MapPinProps) {
  const away = status === 'away';
  const chip = away ? 'Closed' : etaLabel;
  return (
    <Wrap
      type="button"
      onClick={onClick}
      $away={away}
      aria-label={`${name}, ${statusLabel(status)}${chip ? `, ${chip}` : ''}`}
    >
      <Ring $status={status}>
        {status === 'driving' && <PulseRing aria-hidden />}
        <Inner $away={away}>
          <Avatar name={name} src={logoUrl} size={40} />
        </Inner>
      </Ring>
      <Tail $status={status} aria-hidden />
      {chip ? <Eta className="tnum">{chip}</Eta> : null}
    </Wrap>
  );
}

function statusLabel(s: PinStatus): string {
  return s === 'driving' ? 'Driving' : s === 'parked' ? 'Parked' : 'Closed';
}

/* transform/opacity only — box-shadow animation is non-composited (Lighthouse audit + LP-2). */
const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.55; }
  70%, 100% { transform: scale(1.5); opacity: 0; }
`;

const Wrap = styled.button<{ $away: boolean }>`
  display: grid;
  justify-items: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  /* Away vendors shrink as well as desaturate — size is a stronger de-emphasis signal than color,
     and the one the pin field otherwise wasn't using (§9.3). Marker anchor is center, so scaling
     from the center keeps the pin fixed on its point. */
  transform: ${({ $away }) => ($away ? 'scale(0.8)' : 'none')};
  transform-origin: center top;
  transition: transform ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut};
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Ring = styled.div<{ $status: PinStatus }>`
  --ring: ${({ theme, $status }) => theme.status($status)};
  --ring-glow: ${({ theme, $status }) =>
    `color-mix(in srgb, ${theme.status($status)} 55%, transparent)`};
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--ring);
  /* Per-theme elevation (§9.5). Light: a 3px white knockout guarantees separation from ANY basemap
     color, plus a soft contact + ambient shadow. Dark: the colored glow that reads as depth on ink
     and is invisible on Paper. */
  box-shadow: ${({ theme }) =>
    theme.mode === 'light'
      ? `0 0 0 3px color-mix(in srgb, ${theme.color.surfaceRaised} 90%, transparent),
         0 2px 6px rgba(0, 0, 0, 0.14),
         0 6px 16px -4px rgba(0, 0, 0, 0.1)`
      : `0 0 14px var(--ring-glow), 0 2px 8px rgba(0, 0, 0, 0.45)`};
`;

const PulseRing = styled.span`
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: var(--ring-glow);
  animation: ${pulse} 2.4s cubic-bezier(0.2, 0, 0, 1) infinite;
  pointer-events: none;
`;
const Inner = styled.div<{ $away: boolean }>`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.surfaceRaised};
  filter: ${({ $away }) => ($away ? 'saturate(0.25) opacity(0.55)' : 'none')};
`;
/**
 * Downward tail in the ring color — the tip is the anchored point, the base tucks under the ring.
 * Rendered with a CSS triangle so it inherits no photographic content. A theme-aware drop-shadow
 * keeps its edge legible over the basemap (the ring's white knockout can't wrap a 0×0 element).
 */
const Tail = styled.span<{ $status: PinStatus }>`
  width: 0;
  height: 0;
  margin-top: -2px;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid ${({ theme, $status }) => theme.status($status)};
  ${({ theme }) =>
    theme.mode === 'light'
      ? css`
          filter: drop-shadow(0 1px 0.5px rgba(0, 0, 0, 0.16));
        `
      : css`
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
        `}
`;
const Eta = styled.span`
  margin-top: 5px;
  font-size: 11px;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  /* Light gets a hairline + soft lift (a heavy black shadow smudges on Paper); dark keeps the lift. */
  box-shadow: ${({ theme }) =>
    theme.mode === 'light'
      ? '0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.12)'
      : '0 1px 4px rgba(0, 0, 0, 0.3)'};
  white-space: nowrap;
`;
