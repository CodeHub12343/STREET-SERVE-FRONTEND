'use client';

/**
 * SegmentedControl (docs/13 C-21/context toggles) — a contained set of mutually exclusive options
 * with a sliding-feel active segment. Use for small in-context toggles (e.g. At-the-window vs
 * Order-ahead). For scrollable filters use Tabs instead.
 */
import styled from 'styled-components';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel = 'Options',
}: SegmentedControlProps<T>) {
  return (
    <Root role="group" aria-label={ariaLabel}>
      {segments.map((s) => (
        <Segment
          key={s.value}
          type="button"
          aria-pressed={s.value === value}
          $active={s.value === value}
          onClick={() => onChange(s.value)}
        >
          {s.label}
        </Segment>
      ))}
    </Root>
  );
}

const Root = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 3px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Segment = styled.button<{ $active: boolean }>`
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.surfaceRaised : 'transparent')};
  color: ${({ theme, $active }) =>
    $active ? theme.color.textPrimary : theme.color.textSecondary};
  box-shadow: ${({ $active, theme }) => ($active ? theme.color.shadow : 'none')};
  transition: background ${({ theme }) => theme.motion.standard}ms;
`;
