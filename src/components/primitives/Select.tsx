'use client';

/**
 * Select (docs/06 §2.6b) — native select for reliable mobile UX + a11y, styled to match the kit.
 */
import { forwardRef, type SelectHTMLAttributes } from 'react';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { Field } from './Field';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, options, placeholder, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <Box $invalid={invalid}>
          <StyledSelect
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            required={required}
            defaultValue={placeholder ? '' : undefined}
            {...rest}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </StyledSelect>
          <ChevronDown size={18} aria-hidden />
        </Box>
      )}
    </Field>
  );
});

const Box = styled.div<{ $invalid: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: ${({ $invalid, theme }) =>
    $invalid ? `1.5px solid ${theme.color.statusDanger}` : `1px solid ${theme.color.line2}`};
  color: ${({ theme }) => theme.color.textSecondary};

  &:focus-within {
    border: 2px solid
      ${({ theme, $invalid }) => ($invalid ? theme.color.statusDanger : theme.color.accentSecondary)};
  }
  svg {
    position: absolute;
    right: 12px;
    pointer-events: none;
  }
`;
const StyledSelect = styled.select`
  appearance: none;
  width: 100%;
  min-height: 44px;
  padding: 0 40px 0 12px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 16px;
  color: ${({ theme }) => theme.color.textPrimary};

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
