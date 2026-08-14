'use client';

/**
 * Multi-line TextArea (docs/06 §2.6b) — same field chrome + states as Input.
 */
import { forwardRef, type TextareaHTMLAttributes } from 'react';
import styled from 'styled-components';
import { Field } from './Field';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, required, rows = 4, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <StyledTextArea
          ref={ref}
          id={id}
          rows={rows}
          $invalid={invalid}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          required={required}
          {...rest}
        />
      )}
    </Field>
  );
});

const StyledTextArea = styled.textarea<{ $invalid: boolean }>`
  width: 100%;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: ${({ $invalid, theme }) =>
    $invalid ? `1.5px solid ${theme.color.statusDanger}` : `1px solid ${theme.color.line2}`};
  font-size: 16px;
  color: ${({ theme }) => theme.color.textPrimary};
  resize: vertical;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.color.textTertiary};
  }
  &:focus {
    border: 2px solid
      ${({ theme, $invalid }) => ($invalid ? theme.color.statusDanger : theme.color.accentSecondary)};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
