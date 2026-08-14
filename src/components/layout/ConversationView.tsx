'use client';

/**
 * ConversationView template (docs/12 §1) — message list + composer, with a system/context banner
 * slot at the top. Used by message threads (C-33), dispute case threads (A-02), and AI coaching
 * (S-12). Purely structural; message bubbles + composer wiring are feature-level.
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface ConversationViewProps {
  /** Context/system banner pinned above the message list (e.g. business-context banner). */
  banner?: ReactNode;
  /** The scrollable message list (typically virtualized at the feature level). */
  children: ReactNode;
  /** The composer row pinned to the bottom. */
  composer: ReactNode;
}

export function ConversationView({ banner, children, composer }: ConversationViewProps) {
  return (
    <Root>
      {banner ? <BannerSlot>{banner}</BannerSlot> : null}
      <Messages>{children}</Messages>
      <Composer>{composer}</Composer>
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;
const BannerSlot = styled.div`
  flex: none;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;
const Messages = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
`;
const Composer = styled.div`
  flex: none;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px
    calc(${({ theme }) => theme.space[3]}px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;
