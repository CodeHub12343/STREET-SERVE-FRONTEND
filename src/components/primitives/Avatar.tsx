'use client';

/**
 * Avatar (docs/06 §2.5/§2.6g) — circular user/business image with initials fallback. 1:1 source
 * with circular crop. Used for profiles and (larger) as the source for map logo pins.
 */
import { useState } from 'react';
import styled from 'styled-components';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: number;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ src, name, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <Root $size={size} role="img" aria-label={name} title={name}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </Root>
  );
}

const Root = styled.div<{ $size: number }>`
  display: inline-grid;
  place-items: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  overflow: hidden;
  flex: none;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ $size }) => Math.round($size * 0.38)}px;
  font-weight: 700;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
