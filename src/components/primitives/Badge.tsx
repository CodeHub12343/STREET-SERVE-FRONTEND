'use client';

/**
 * Badge (docs/06 §2.6) — small count/tier/unread indicator. `dot` renders a bare status dot;
 * otherwise a numeric/text pill (counts cap at `max`, default 99+).
 */
import styled from 'styled-components';
import type { StatusKey } from '@/styles/tokens';

export interface BadgeProps {
  count?: number;
  max?: number;
  dot?: boolean;
  tone?: StatusKey | 'accent';
  children?: string;
}

export function Badge({ count, max = 99, dot = false, tone = 'danger', children }: BadgeProps) {
  if (dot) return <Dot $tone={tone} aria-hidden />;
  const label = children ?? (count !== undefined ? (count > max ? `${max}+` : String(count)) : '');
  return (
    <Pill $tone={tone} className="tnum">
      {label}
    </Pill>
  );
}

function resolve(theme: import('styled-components').DefaultTheme, tone: StatusKey | 'accent') {
  return tone === 'accent' ? theme.color.accentPrimary : theme.status(tone);
}

const Pill = styled.span<{ $tone: StatusKey | 'accent' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme, $tone }) => resolve(theme, $tone)};
`;
const Dot = styled.span<{ $tone: StatusKey | 'accent' }>`
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ theme, $tone }) => resolve(theme, $tone)};
`;
