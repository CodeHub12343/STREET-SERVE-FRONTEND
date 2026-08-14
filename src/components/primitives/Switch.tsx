'use client';

/**
 * Switch (docs/06 §2.6b toggles) — an accessible on/off control for settings rows.
 */
import styled from 'styled-components';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <Track
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      $checked={checked}
      onClick={() => onChange(!checked)}
    >
      <Thumb $checked={checked} />
    </Track>
  );
}

const Track = styled.button<{ $checked: boolean }>`
  width: 44px;
  height: 26px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  padding: 3px;
  display: flex;
  justify-content: ${({ $checked }) => ($checked ? 'flex-end' : 'flex-start')};
  background: ${({ theme, $checked }) => ($checked ? theme.color.statusLive : theme.color.line2)};
  transition: background ${({ theme }) => theme.motion.standard}ms;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
const Thumb = styled.span<{ $checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;
