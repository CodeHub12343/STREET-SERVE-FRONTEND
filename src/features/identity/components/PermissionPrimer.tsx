'use client';

/**
 * Shared content for the permission primers (C-07 location, C-08 notifications) — explains the
 * value + policy BEFORE the OS prompt (docs/06 §1 friction-scales-with-money; the OS prompt should
 * never be the user's first context).
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface PrimerPoint {
  icon: ReactNode;
  text: string;
}

export function PermissionPrimer({
  icon,
  headline,
  points,
}: {
  icon: ReactNode;
  headline: string;
  points: PrimerPoint[];
}) {
  return (
    <Root>
      <IconWrap aria-hidden>{icon}</IconWrap>
      <p>{headline}</p>
      <Points>
        {points.map((p, i) => (
          <li key={i}>
            <span aria-hidden>{p.icon}</span>
            {p.text}
          </li>
        ))}
      </Points>
    </Root>
  );
}

const Root = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: 15px;
  }
`;
const IconWrap = styled.div`
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  color: ${({ theme }) => theme.color.accentSecondary};
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.accentSecondary} 14%, transparent)`};
`;
const Points = styled.ul`
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  li {
    display: flex;
    align-items: flex-start;
    gap: ${({ theme }) => theme.space[3]}px;
    font-size: 14px;
    span {
      display: inline-flex;
      color: ${({ theme }) => theme.color.statusLive};
      padding-top: 2px;
    }
  }
`;
