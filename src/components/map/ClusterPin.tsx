'use client';

/**
 * ClusterPin — the tap target rendered when individual pins would overlap (Map.tsx groups pins
 * within a screen-px radius at the current zoom). Tapping zooms in until the group separates.
 * Same 48px footprint and ring language as MapPin so clusters read as "several of those".
 */
import styled from 'styled-components';

export interface ClusterPinProps {
  count: number;
  onClick?: () => void;
}

export function ClusterPin({ count, onClick }: ClusterPinProps) {
  return (
    <Wrap
      type="button"
      onClick={onClick}
      aria-label={`${count} businesses here — zoom in to expand`}
    >
      <Ring>
        <Count className="tnum">{count}</Count>
      </Ring>
    </Wrap>
  );
}

const Wrap = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
`;

const Ring = styled.span`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 3px solid ${({ theme }) => theme.color.accentSecondary};
  box-shadow:
    0 0 12px
      ${({ theme }) => `color-mix(in srgb, ${theme.color.accentSecondary} 45%, transparent)`},
    0 2px 8px rgba(0, 0, 0, 0.35);
`;

const Count = styled.span`
  font-size: 15px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
`;
