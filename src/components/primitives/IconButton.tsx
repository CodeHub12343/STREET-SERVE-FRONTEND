'use client';

/**
 * IconButton (docs/06 §2.6a) — icon-only action with a guaranteed 44px hit area even when the
 * visual is smaller. An accessible label is required (a11y §2.8).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { glassSurface } from '@/styles/glass';

export type IconButtonVariant = 'ghost' | 'filled' | 'outline' | 'glass';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — announced to screen readers. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  /** Visual diameter in px (hit area stays ≥44). */
  visualSize?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', visualSize = 40, ...rest },
  ref,
) {
  return (
    <Root ref={ref} $variant={variant} $visual={visualSize} aria-label={label} title={label} {...rest}>
      {icon}
    </Root>
  );
});

const variants = {
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.color.textPrimary};
  `,
  filled: css`
    background: ${({ theme }) => theme.color.surfaceRaised2};
    color: ${({ theme }) => theme.color.textPrimary};
  `,
  outline: css`
    background: transparent;
    color: ${({ theme }) => theme.color.textPrimary};
    border: 1px solid ${({ theme }) => theme.color.line2};
  `,
  glass: css`
    ${({ theme }) => glassSurface(theme)}
    color: ${({ theme }) => theme.color.textPrimary};
  `,
} as const;

const Root = styled.button<{ $variant: IconButtonVariant; $visual: number }>`
  position: relative;
  display: inline-grid;
  place-items: center;
  width: ${({ $visual }) => $visual}px;
  height: ${({ $visual }) => $visual}px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  cursor: pointer;
  ${({ $variant }) => variants[$variant]}

  /* Guarantee a 44px minimum touch target regardless of visual size. */
  &::after {
    content: '';
    position: absolute;
    inset: 50%;
    width: max(44px, 100%);
    height: max(44px, 100%);
    transform: translate(-50%, -50%);
  }
  &:active:not(:disabled) {
    filter: brightness(0.92);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
