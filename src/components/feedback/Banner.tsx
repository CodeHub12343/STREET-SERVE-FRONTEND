'use client';

/**
 * Banner / inline alert (docs/06 §2.6d) — a persistent strip at the top of the affected surface:
 * status-colored left edge + icon + text + optional action. Used for Pop-Up delays, offline/stale
 * data, permission prompts. Persistent (unlike the transient Toast).
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

const toneIcon: Record<BannerTone, ReactNode> = {
  info: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertTriangle size={18} />,
  danger: <XCircle size={18} />,
};

export interface BannerProps {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function Banner({ tone = 'info', title, children, action }: BannerProps) {
  return (
    <Root $tone={tone} role={tone === 'danger' ? 'alert' : 'status'}>
      <IconWrap $tone={tone} aria-hidden>
        {toneIcon[tone]}
      </IconWrap>
      <Body>
        {title ? <Title>{title}</Title> : null}
        <Text>{children}</Text>
      </Body>
      {action ? <Action>{action}</Action> : null}
    </Root>
  );
}

function color(theme: import('styled-components').DefaultTheme, tone: BannerTone): string {
  switch (tone) {
    case 'info':
      return theme.color.accentSecondary;
    case 'success':
      return theme.status('live');
    case 'warning':
      return theme.status('warning');
    case 'danger':
      return theme.status('danger');
  }
}

const Root = styled.div<{ $tone: BannerTone }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-left: 3px solid ${({ theme, $tone }) => color(theme, $tone)};
`;
const IconWrap = styled.span<{ $tone: BannerTone }>`
  display: inline-flex;
  color: ${({ theme, $tone }) => color(theme, $tone)};
  padding-top: 1px;
`;
const Body = styled.div`
  flex: 1;
  min-width: 0;
`;
const Title = styled.p`
  font-size: 14px;
  font-weight: 700;
`;
const Text = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Action = styled.div`
  flex: none;
`;
