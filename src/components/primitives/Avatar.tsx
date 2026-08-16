'use client';

/**
 * Avatar (docs/06 §2.5/§2.6g) — circular user/business image with initials fallback. 1:1 source
 * with circular crop. Used for profiles and (larger) as the source for map logo pins.
 */
import { useState } from 'react';
import styled from 'styled-components';

export interface AvatarProps {
  src?: string;
  /**
   * Nullable on purpose. This was typed `string`, which TypeScript happily believed — but every
   * caller feeds it a name straight off an API response, and a business or seller with no name set
   * sends `null`. `initials(null)` then threw on `.trim()` DURING RENDER, which React escalates to
   * the route's error boundary: one unnamed record on the map took out the entire /map page with
   * "This didn't load".
   *
   * A missing name is a cosmetic problem. It must never be a page-level crash, and a shared
   * primitive rendered from server data in a dozen places is exactly where that has to be enforced.
   */
  name: string | null | undefined;
  size?: number;
}

function initials(name: string | null | undefined): string {
  return (name ?? '')
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
    <Root $size={size} role="img" aria-label={name ?? 'No name'} title={name ?? undefined}>
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
