'use client';

/**
 * HubPin (C-1) — a consignment hub on the map.
 *
 * Deliberately a DIFFERENT shape from `MapPin`, not a recoloured one. A business pin is a round
 * ringed avatar meaning "someone is here now"; a hub is a fixed place that holds stock. Squaring
 * the corners and using a package glyph means the two layers stay distinguishable at a glance,
 * peripherally, and for anyone who can't rely on the colour difference (a11y §2.8) — which is the
 * whole reason to draw them on one map instead of two.
 *
 * The count badge is the pin's actual job. "Hub" tells a seller nothing about whether the trip is
 * worth making; "12 items" is a decision. A hub with nothing available says so plainly rather than
 * showing a zero, which reads as a loading bug.
 */
import styled, { css } from 'styled-components';
import { Package, PackageOpen } from 'lucide-react';

export interface HubPinProps {
  name: string;
  /** Distinct products currently checkoutable here. */
  itemCount: number;
  /** Cheapest unit, for the "from $x" hint. */
  fromUnitValueCents?: number | null;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Hubs sit BELOW live business pins. A vendor who is physically present and serving right now is
 * more time-critical than a shopfront that will still be there in an hour.
 */
export const HUB_PIN_PRIORITY = 5;

export function HubPin({ name, itemCount, fromUnitValueCents, selected, onClick }: HubPinProps) {
  const empty = itemCount <= 0;
  const label = empty
    ? `${name}, consignment hub, nothing available right now`
    : `${name}, consignment hub, ${itemCount} item${itemCount === 1 ? '' : 's'} available`;

  return (
    <Wrap type="button" onClick={onClick} aria-label={label} $selected={Boolean(selected)}>
      <Badge $empty={empty}>
        {empty ? <PackageOpen size={15} aria-hidden /> : <Package size={15} aria-hidden />}
        {!empty ? <Count className="tnum">{itemCount}</Count> : null}
      </Badge>
      <Tail $empty={empty} aria-hidden />
      <Caption $empty={empty}>
        {empty
          ? 'Empty'
          : fromUnitValueCents != null
            ? `from $${(fromUnitValueCents / 100).toFixed(0)}`
            : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
      </Caption>
    </Wrap>
  );
}

const Wrap = styled.button<{ $selected: boolean }>`
  display: grid;
  justify-items: center;
  gap: 0;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  transform: ${({ $selected }) => ($selected ? 'scale(1.08)' : 'none')};
  transition: transform 160ms ease;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accentPrimary};
    outline-offset: 3px;
    border-radius: 10px;
  }
`;

/**
 * Squared-off rather than round — the shape difference from a business pin is the primary signal,
 * carrying the distinction without relying on colour.
 */
const Badge = styled.span<{ $empty: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 9px;
  font-weight: 800;
  ${({ theme, $empty }) =>
    $empty
      ? css`
          background: ${theme.color.surfaceRaised};
          color: ${theme.color.textTertiary};
          border: 1px solid ${theme.color.line2};
        `
      : css`
          background: ${theme.color.accentSecondary};
          color: #fff;
          border: 1px solid transparent;
        `}
  /* Knockout ring: separates the pin from any basemap colour underneath (§9.5). */
  box-shadow:
    0 0 0 2px ${({ theme }) => theme.color.surfaceBase},
    ${({ theme }) => theme.color.shadow};
`;

const Count = styled.span`
  font-size: 12px;
  line-height: 1;
`;

/** Anchors the badge to its actual point — a floating badge marks *near*, a tail marks *the* spot. */
const Tail = styled.span<{ $empty: boolean }>`
  width: 2px;
  height: 7px;
  background: ${({ theme, $empty }) =>
    $empty ? theme.color.line2 : theme.color.accentSecondary};
`;

const Caption = styled.span<{ $empty: boolean }>`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 5px;
  white-space: nowrap;
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme, $empty }) => ($empty ? theme.color.textTertiary : theme.color.textSecondary)};
  box-shadow: ${({ theme }) => theme.color.shadow};
`;
