'use client';

/**
 * Spinner (docs/06 §2.6e) — reserved for payment-in-flight and blocking submissions only.
 * Content loading uses Skeleton, not this.
 */
import styled, { keyframes } from 'styled-components';

const spin = keyframes`to { transform: rotate(360deg); }`;

export const Spinner = styled.span<{ $size?: number }>`
  display: inline-block;
  width: ${({ $size }) => $size ?? 24}px;
  height: ${({ $size }) => $size ?? 24}px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.color.line2};
  border-top-color: ${({ theme }) => theme.color.accentSecondary};
  animation: ${spin} 0.7s linear infinite;
`;
