'use client';

/**
 * Skeleton shimmer (docs/06 §2.6e) — used for loading content, never a spinner. Matches the
 * target component's geometry via width/height/radius props.
 */
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const Skeleton = styled.div<{ $w?: string; $h?: string; $radius?: number }>`
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h ?? '16px'};
  border-radius: ${({ theme, $radius }) => $radius ?? theme.radius.control}px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.surfaceRaised} 25%,
    ${({ theme }) => theme.color.surfaceRaised2} 37%,
    ${({ theme }) => theme.color.surfaceRaised} 63%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;
