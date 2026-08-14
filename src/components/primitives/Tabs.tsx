'use client';

/**
 * Tabs (docs/06 §2.5a) — horizontally scrollable tab row (category tabs, sub-nav). The active tab
 * inverts. Controlled via `value`/`onChange`. Keyboard: arrow keys move focus, Enter/Space select.
 */
import { useRef } from 'react';
import styled, { css } from 'styled-components';
import { glassSurface } from '@/styles/glass';

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  /** `glass` renders inactive chips as translucent map chrome (§8.1); default opaque `solid`. */
  surface?: 'solid' | 'glass';
}

export function Tabs({ items, value, onChange, ariaLabel = 'Tabs', surface = 'solid' }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + dir + items.length) % items.length;
    refs.current[next]?.focus();
    const nextItem = items[next];
    if (nextItem) onChange(nextItem.value);
  };

  return (
    <Row role="tablist" aria-label={ariaLabel}>
      {items.map((item, i) => (
        <Tab
          key={item.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          aria-selected={item.value === value}
          tabIndex={item.value === value ? 0 : -1}
          $active={item.value === value}
          $surface={surface}
          onClick={() => onChange(item.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {item.label}
        </Tab>
      ))}
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;
const Tab = styled.button<{ $active: boolean; $surface: 'solid' | 'glass' }>`
  flex: none;
  height: 36px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.standard}ms;

  ${({ theme, $active, $surface }) =>
    $active
      ? css`
          /* Selected fills solid — the one high-contrast anchor in the row (§8.2). */
          background: ${theme.color.textPrimary};
          color: ${theme.color.surfaceBase};
          border: 1px solid transparent;
        `
      : $surface === 'glass'
        ? css`
            ${glassSurface(theme)}
            color: ${theme.color.textSecondary};
          `
        : css`
            background: ${theme.color.surfaceRaised};
            border: 1px solid ${theme.color.line2};
            color: ${theme.color.textSecondary};
          `}
`;
