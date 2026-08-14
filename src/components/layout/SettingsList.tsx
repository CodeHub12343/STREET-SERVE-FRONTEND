'use client';

/**
 * SettingsList template (docs/12 §1) — grouped list rows (label / value / chevron or toggle).
 * Destructive actions are isolated in a final group by convention. Composes SettingsGroup + Row.
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ChevronRight } from 'lucide-react';

export function SettingsList({ children }: { children: ReactNode }) {
  return <Root>{children}</Root>;
}

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Group>
      {title ? <GroupTitle>{title}</GroupTitle> : null}
      <Rows>{children}</Rows>
    </Group>
  );
}

export interface SettingsRowProps {
  label: string;
  /** One-line subtitle under the label ("Balance, payouts & history"). */
  description?: string;
  value?: ReactNode;
  /** Right-side control (e.g. a toggle). When set, no chevron is shown. */
  control?: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  icon?: ReactNode;
}

export function SettingsRow({
  label,
  description,
  value,
  control,
  onClick,
  destructive = false,
  icon,
}: SettingsRowProps) {
  const interactive = Boolean(onClick);
  return (
    <Row as={interactive ? 'button' : 'div'} onClick={onClick} $interactive={interactive} $destructive={destructive}>
      <Left>
        {icon ? <span aria-hidden>{icon}</span> : null}
        <LabelStack>
          <Label>{label}</Label>
          {description ? <Description>{description}</Description> : null}
        </LabelStack>
      </Left>
      <Right>
        {value ? <Value>{value}</Value> : null}
        {control ?? (interactive ? <ChevronRight size={18} aria-hidden /> : null)}
      </Right>
    </Row>
  );
}

const Root = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  /* Near edge-to-edge on phones; the wider gutter returns once the 640px cap kicks in. */
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[3]}px;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  min-width: 0;
  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space[4]}px;
  }
`;
const Group = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const GroupTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
  padding: 0 ${({ theme }) => theme.space[2]}px;
`;
const Rows = styled.div`
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  overflow: hidden;
`;
const Row = styled.div<{ $interactive: boolean; $destructive: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  min-height: 52px;
  padding: 0 ${({ theme }) => theme.space[4]}px;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  text-align: left;
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  color: ${({ theme, $destructive }) =>
    $destructive ? theme.color.statusDanger : theme.color.textPrimary};

  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme, $interactive }) => ($interactive ? theme.color.surfaceRaised2 : 'transparent')};
  }
`;
const Left = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const LabelStack = styled.span`
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 10px 0;
`;
const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
`;
const Description = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Right = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Value = styled.span`
  font-size: 14px;
`;
