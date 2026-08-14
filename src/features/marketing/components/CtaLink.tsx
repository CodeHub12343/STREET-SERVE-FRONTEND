'use client';

/**
 * CtaLink — a Next.js Link visually identical to the Button primitive (docs/06 §2.6a).
 * Exists because nesting <button> inside <a> (the old Landing.tsx idiom) is a nested-interactive
 * a11y violation; navigation CTAs must BE links. Variants/sizes mirror Button exactly.
 */
import Link from 'next/link';
import styled, { css } from 'styled-components';

export type CtaVariant = 'primary' | 'secondary';
export type CtaSize = 'default' | 'compact';

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.color.accentPrimary};
    color: #fff;
    border: 1px solid transparent;
    &:hover {
      filter: brightness(1.08);
    }
    &:active {
      filter: brightness(0.92);
    }
  `,
  secondary: css`
    background: transparent;
    color: ${({ theme }) => theme.color.textPrimary};
    border: 1.5px solid ${({ theme }) => theme.color.textSecondary};
    &:hover {
      border-color: ${({ theme }) => theme.color.textPrimary};
    }
  `,
};

interface CtaStyleProps {
  $variant?: CtaVariant;
  $size?: CtaSize;
  $fullWidth?: boolean;
}

const ctaStyles = css<CtaStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: ${({ $size }) => ($size === 'compact' ? 36 : 44)}px;
  padding: 0 ${({ $size }) => ($size === 'compact' ? 16 : 22)}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  font-size: ${({ $size }) => ($size === 'compact' ? 14 : 15)}px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  transition: filter ${({ theme }) => theme.motion.micro}ms,
    border-color ${({ theme }) => theme.motion.micro}ms;
  ${({ $variant = 'primary' }) => variantStyles[$variant]}
`;

export const CtaLink = styled(Link)<CtaStyleProps>`
  ${ctaStyles}
`;

/** Same look as CtaLink for in-page actions (opening the pre-registration wizard). */
export const CtaButton = styled.button<CtaStyleProps>`
  ${ctaStyles}
`;
