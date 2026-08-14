'use client';

/**
 * PinPreviewCard (hero spec §5) — compact business-profile popover opened from a SimPin.
 * Focus moves in on open, Tab cycles within, Esc/outside-click closes and focus returns to the
 * pin (handled by the caller re-focusing via the marker button's aria-expanded flow).
 */
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { StatusChip } from '@/components/primitives/StatusChip';
import type { VendorFrame } from '../../sim/director';
import { glass } from '../../mk';
import { CtaLink } from '../CtaLink';

export interface PinPreviewCardProps {
  vendor: VendorFrame;
  /** Screen-space anchor within the scene container (map.project result). */
  x: number;
  y: number;
  onClose: () => void;
}

export function PinPreviewCard({ vendor, x, y, onClose }: PinPreviewCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [vendor.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  return (
    <Card
      ref={ref}
      role="dialog"
      aria-label={`${vendor.name} preview`}
      tabIndex={-1}
      style={{ left: x, top: y }}
    >
      <Header>
        <Logo aria-hidden>{vendor.emoji}</Logo>
        <HeaderText>
          <Name>{vendor.name}</Name>
          <Meta>
            {vendor.category} · ★ {vendor.rating}
          </Meta>
        </HeaderText>
        <Close type="button" aria-label="Close preview" onClick={onClose}>
          ✕
        </Close>
      </Header>
      <ChipRow>
        <StatusChip status={vendor.status} />
      </ChipRow>
      <CtaLink href="#cta" $variant="primary" $size="compact" $fullWidth onClick={onClose}>
        Join the line ↗
      </CtaLink>
    </Card>
  );
}

const Card = styled.div`
  position: absolute;
  z-index: 20;
  width: 240px;
  transform: translate(-50%, calc(-100% - 36px));
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  ${({ theme }) => glass(theme)}
  box-shadow: ${({ theme }) => theme.color.shadow};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Logo = styled.span`
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-size: 18px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  flex-shrink: 0;
`;

const HeaderText = styled.div`
  min-width: 0;
  flex: 1;
`;

const Name = styled.p`
  font-weight: 750;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Meta = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Close = styled.button`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.textSecondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.control}px;
  font-size: 12px;
  flex-shrink: 0;
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const ChipRow = styled.div`
  display: flex;
`;
