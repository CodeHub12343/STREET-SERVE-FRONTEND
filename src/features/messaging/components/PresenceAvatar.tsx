'use client';

/**
 * An Avatar with an online-presence dot — the counterparty's picture plus a live/idle indicator.
 * Shared by the inbox rows and the thread header so the dot looks identical in both places.
 */
import styled from 'styled-components';
import { Avatar } from '@/components/primitives/Avatar';

export function PresenceAvatar({
  name,
  src,
  size = 44,
  online = false,
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
}) {
  return (
    <Wrap $size={size}>
      <Avatar name={name} src={src ?? undefined} size={size} />
      {online ? <Dot $size={size} aria-label="Active now" /> : null}
    </Wrap>
  );
}

const Wrap = styled.div<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: none;
`;
const Dot = styled.span<{ $size: number }>`
  position: absolute;
  right: 0;
  bottom: 0;
  width: ${({ $size }) => Math.max(9, Math.round($size * 0.24))}px;
  height: ${({ $size }) => Math.max(9, Math.round($size * 0.24))}px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.statusLive};
  /* A ring in the surface color so the dot reads as separate from the avatar behind it. */
  box-shadow: 0 0 0 2px ${({ theme }) => theme.color.surfaceBase};
`;
