'use client';

/**
 * SimPin (hero spec §4/§5) — the vendor pin rendered into a Mapbox DOM marker: emoji stand-in
 * logo inside a 3px status ring (docs/06 §2.5), Driving pulse (transform-only; collapses under
 * the global reduced-motion rule), timed chip label, wave flash, and keyboard focusability
 * (button semantics — the a11y overlay IS the marker).
 */
import styled, { css, keyframes } from 'styled-components';
import type { VendorFrame } from '../../sim/director';

export interface SimPinMarkerProps {
  vendor: VendorFrame;
  expanded: boolean;
  onToggle: () => void;
}

export function SimPinMarker({ vendor, expanded, onToggle }: SimPinMarkerProps) {
  return (
    <Root>
      {vendor.chip && <ChipLabel aria-hidden>{vendor.chip}</ChipLabel>}
      <PinButton
        type="button"
        $status={vendor.status}
        $flash={vendor.flash}
        aria-expanded={expanded}
        aria-label={`${vendor.name} — ${vendor.category}, ${statusLabel[vendor.status]}${
          vendor.chip ? `. ${vendor.chip}` : ''
        }`}
        onClick={onToggle}
      >
        {vendor.status === 'driving' && <Pulse aria-hidden $status={vendor.status} />}
        <Face aria-hidden>{vendor.emoji}</Face>
      </PinButton>
    </Root>
  );
}

const statusLabel: Record<VendorFrame['status'], string> = {
  driving: 'driving now',
  parked: 'parked and open',
  away: 'away',
};

const Root = styled.div`
  display: grid;
  justify-items: center;
  gap: 4px;
  /* Mapbox markers get pointer-events per element. */
  pointer-events: auto;
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(1.9); opacity: 0; }
`;

const flashRing = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.35); }
`;

const PinButton = styled.button<{ $status: VendorFrame['status']; $flash: boolean }>`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 3px solid ${({ theme, $status }) => theme.status($status)};
  box-shadow:
    0 0 12px ${({ theme, $status }) => `${theme.status($status)}55`},
    0 6px 18px rgba(0, 0, 0, 0.35);
  opacity: ${({ $status }) => ($status === 'away' ? 0.55 : 1)};
  ${({ $flash }) =>
    $flash &&
    css`
      animation: ${flashRing} 900ms ease-in-out infinite;
    `}
`;

const Pulse = styled.span<{ $status: VendorFrame['status'] }>`
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid ${({ theme, $status }) => theme.status($status)};
  animation: ${pulse} 2s cubic-bezier(0.2, 0, 0, 1) infinite;
  pointer-events: none;
`;

const Face = styled.span`
  font-size: 20px;
  line-height: 1;
`;

const ChipLabel = styled.span`
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.textPrimary};
  box-shadow: ${({ theme }) => theme.color.shadow};
`;
