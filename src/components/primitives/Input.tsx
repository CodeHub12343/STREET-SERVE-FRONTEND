'use client';

/**
 * Text Input (docs/06 §2.6b): 44px min height, label above, focus/filled/error/disabled states,
 * inline error via aria-live (through Field). ≥16px font to avoid iOS zoom-on-focus.
 */
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { glassSurface } from '@/styles/glass';
import { Field } from './Field';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  /**
   * `glass` renders the field as a translucent capsule for floating map chrome (§8.1). Forms keep
   * the default opaque `solid`.
   */
  surface?: 'solid' | 'glass';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, leadingIcon, surface = 'solid', ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <Box $invalid={invalid} $hasIcon={Boolean(leadingIcon)} $surface={surface}>
          {leadingIcon ? <Icon aria-hidden>{leadingIcon}</Icon> : null}
          <StyledInput
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            required={required}
            {...rest}
          />
        </Box>
      )}
    </Field>
  );
});

const Box = styled.div<{ $invalid: boolean; $hasIcon: boolean; $surface: 'solid' | 'glass' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  transition: border-color ${({ theme }) => theme.motion.micro}ms;

  ${({ theme, $surface }) =>
    $surface === 'glass'
      ? glassSurface(theme)
      : css`
          background: ${theme.color.surfaceRaised};
          border: 1px solid ${theme.color.line2};
        `}
  ${({ $invalid, theme }) =>
    $invalid && css`
      border: 1.5px solid ${theme.color.statusDanger};
    `}

  &:focus-within {
    border: 2px solid
      ${({ theme, $invalid }) => ($invalid ? theme.color.statusDanger : theme.color.accentSecondary)};
  }
`;
const Icon = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const StyledInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 16px;
  color: ${({ theme }) => theme.color.textPrimary};

  &::placeholder {
    color: ${({ theme }) => theme.color.textTertiary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
