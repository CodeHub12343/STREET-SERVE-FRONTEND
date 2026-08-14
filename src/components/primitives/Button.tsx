'use client';

/**
 * Button primitive (docs/06 §2.6a). Variants primary/secondary/tertiary/destructive; sizes
 * default(44px)/compact(36px); states default/pressed/disabled/loading (spinner replaces label,
 * width locked). One primary per screen region. Full kit lands in Milestone 1; this is the
 * foundation piece used by the shells + Storybook.
 */
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import styled, { css, keyframes } from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'default' | 'compact';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'default', loading = false, fullWidth = false, children, disabled, ...rest },
  ref,
) {
  return (
    <Root
      ref={ref}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $loading={loading}
      disabled={disabled ?? loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <Spinner aria-hidden /> : children}
    </Root>
  );
});

const spin = keyframes`to { transform: rotate(360deg); }`;

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.color.accentPrimary};
    color: #fff;
    border: 1px solid transparent;
  `,
  secondary: css`
    background: transparent;
    color: ${({ theme }) => theme.color.textPrimary};
    border: 1.5px solid ${({ theme }) => theme.color.textSecondary};
  `,
  tertiary: css`
    background: transparent;
    color: ${({ theme }) => theme.color.accentSecondary};
    border: 1px solid transparent;
  `,
  destructive: css`
    background: ${({ theme }) => theme.color.statusDanger};
    color: #fff;
    border: 1px solid transparent;
  `,
} as const;

const Root = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $loading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
  height: ${({ $size }) => ($size === 'compact' ? 36 : 44)}px;
  padding: 0 ${({ theme }) => theme.space[4]}px;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  border-radius: ${({ theme }) => theme.radius.control}px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: filter ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut};
  ${({ $variant }) => variantStyles[$variant]}

  &:active:not(:disabled) {
    filter: brightness(0.92);
  }
  &:disabled {
    opacity: ${({ $loading }) => ($loading ? 1 : 0.4)};
    cursor: ${({ $loading }) => ($loading ? 'progress' : 'not-allowed')};
  }
`;

const Spinner = styled.span`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: ${spin} 0.7s linear infinite;
`;
