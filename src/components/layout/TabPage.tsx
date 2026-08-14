'use client';

/**
 * TabPage template (docs/12 §1) — standard header (title + optional actions) + scrollable content.
 * The bottom tab bar itself is provided by the route-group layout; this is the page body used by
 * Favorites, Orders, Messages, Profile, Earnings, My Inventory.
 *
 * `backHref` is for DRILL-DOWN screens only — pages the nav cannot reach, which the user got to by
 * tapping into something (a tax statement, a verification centre, an RTO agreement). Tab roots
 * deliberately omit it: they are already one tap away in the dock, and a back control on a root
 * would walk the user through their tab history, which is chronological and unpredictable.
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { BackLink } from '@/components/navigation/BackLink';

export interface TabPageProps {
  title: string;
  actions?: ReactNode;
  /** Parent route for the back control. Omit on tab roots — see the note above. */
  backHref?: string;
  /** Screen-reader label naming the destination, e.g. "Back to profile". */
  backLabel?: string;
  children: ReactNode;
}

export function TabPage({ title, actions, backHref, backLabel, children }: TabPageProps) {
  return (
    <Root>
      <Header>
        <Lead>
          {backHref ? <BackLink href={backHref} label={backLabel ?? 'Back'} /> : null}
          <h1>{title}</h1>
        </Lead>
        {actions ? <Actions>{actions}</Actions> : null}
      </Header>
      <Content>{children}</Content>
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
`;
const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
  background: ${({ theme }) => theme.color.surfaceBase};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  h1 {
    font-size: 22px;
    /* Titles here can be user data (a product name); truncate rather than shove the actions off. */
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
const Lead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  min-width: 0;
`;
const Actions = styled.div`
  display: flex;
  flex: none;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Content = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
`;
