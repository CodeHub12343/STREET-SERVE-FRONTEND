'use client';

/**
 * Shared field chrome for inputs (docs/06 §2.6b): label ABOVE the control (never
 * placeholder-as-label), optional hint, and an inline error announced via aria-live — never
 * toast-only. Input/TextArea/Select compose this.
 */
import { useId, type ReactNode } from 'react';
import styled from 'styled-components';
import { AlertCircle } from 'lucide-react';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Render-prop receives the wiring the control must spread for a11y. */
  children: (aria: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <Wrap>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {required ? <Req aria-hidden> *</Req> : null}
        </Label>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? <Hint id={hintId}>{hint}</Hint> : null}
      {error ? (
        <ErrorText id={errorId} role="alert" aria-live="polite">
          <AlertCircle size={14} aria-hidden />
          {error}
        </ErrorText>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  /* Shrinkable in any flex/grid parent: without these, the control's intrinsic width (~180px
     for a native input) becomes the field's minimum and forces phone layouts to clip. */
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: 6px;
`;
const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Req = styled.span`
  color: ${({ theme }) => theme.color.statusDanger};
`;
const Hint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const ErrorText = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.statusDanger};
`;

/** Shared control styling used by Input/TextArea/Select. */
export const controlStyles = `
  width: 100%;
  min-height: 44px;
  border-radius: 8px;
  padding: 10px 12px;
`;
