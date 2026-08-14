'use client';

/**
 * ProgressRail (docs/13 C-20) — the queue dot rail. Served positions are faded, the customer's own
 * dot is rendered larger in the discount violet so it reads at a glance, outdoors, one-handed.
 * Accessible: exposes position/total via aria on a progressbar role.
 */
import styled from 'styled-components';

export interface ProgressRailProps {
  /** Total people in line. */
  total: number;
  /** The customer's 1-based position. */
  position: number;
  /** How many have been served (dots before this render faded). Defaults to position-1. */
  served?: number;
  maxDots?: number;
}

export function ProgressRail({ total, position, served, maxDots = 12 }: ProgressRailProps) {
  const servedCount = served ?? Math.max(0, position - 1);
  const count = Math.min(total, maxDots);
  const dots = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <Rail
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={position}
      aria-label={`Position ${position} of ${total} in line`}
    >
      {dots.map((n) => {
        const state = n <= servedCount ? 'served' : n === position ? 'me' : 'ahead';
        return <Dot key={n} $state={state} />;
      })}
      {total > maxDots ? <More className="tnum">+{total - maxDots}</More> : null}
    </Rail>
  );
}

const Rail = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;
const Dot = styled.span<{ $state: 'served' | 'me' | 'ahead' }>`
  border-radius: 50%;
  flex: none;
  width: ${({ $state }) => ($state === 'me' ? 16 : 10)}px;
  height: ${({ $state }) => ($state === 'me' ? 16 : 10)}px;
  background: ${({ theme, $state }) =>
    $state === 'me'
      ? theme.color.statusDiscount
      : $state === 'served'
        ? theme.color.line2
        : theme.color.textTertiary};
  opacity: ${({ $state }) => ($state === 'served' ? 0.45 : 1)};
  box-shadow: ${({ theme, $state }) =>
    $state === 'me' ? `0 0 0 4px color-mix(in srgb, ${theme.color.statusDiscount} 24%, transparent)` : 'none'};
`;
const More = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;
