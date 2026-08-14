'use client';

/**
 * Quantity Stepper (docs/06 §2.6b, used in cart C-21 / reserve S-05). Controlled −/value/+ with
 * min/max clamping; value uses tabular numerals so it never jitters.
 */
import styled from 'styled-components';
import { Minus, Plus } from 'lucide-react';
import { IconButton } from './IconButton';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  disabled = false,
  ariaLabel = 'Quantity',
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <Root role="group" aria-label={ariaLabel}>
      <IconButton
        label="Decrease"
        variant="outline"
        visualSize={36}
        icon={<Minus size={16} />}
        onClick={() => onChange(clamp(value - step))}
        disabled={disabled || value <= min}
      />
      <Value className="tnum" aria-live="polite">
        {value}
      </Value>
      <IconButton
        label="Increase"
        variant="outline"
        visualSize={36}
        icon={<Plus size={16} />}
        onClick={() => onChange(clamp(value + step))}
        disabled={disabled || value >= max}
      />
    </Root>
  );
}

const Root = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Value = styled.span`
  min-width: 2ch;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
`;
