'use client';

/**
 * Chip (docs/06 §2.4/§2.6) — a full-round pill for filters/selections. Selectable variant toggles
 * an active fill. Distinct from cards by its pill radius.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  leadingIcon?: ReactNode;
}

export function Chip({ selected = false, leadingIcon, children, ...rest }: ChipProps) {
  return (
    <Root $selected={selected} aria-pressed={selected} {...rest}>
      {leadingIcon ? <span aria-hidden>{leadingIcon}</span> : null}
      {children}
    </Root>
  );
}

const Root = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background ${({ theme }) => theme.motion.micro}ms;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.textPrimary : theme.color.surfaceRaised};
  color: ${({ theme, $selected }) =>
    $selected ? theme.color.surfaceBase : theme.color.textSecondary};
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? 'transparent' : theme.color.line2)};

  &:active {
    filter: brightness(0.95);
  }
`;
