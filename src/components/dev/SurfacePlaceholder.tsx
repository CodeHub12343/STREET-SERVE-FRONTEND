'use client';

/**
 * Placeholder body for a route-group surface in Milestone 0 (no screens yet). Names the surface
 * and its intended layout template so the shells are self-documenting until real screens land.
 */
import Link from 'next/link';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';

export function SurfacePlaceholder({
  title,
  template,
  note,
}: {
  title: string;
  template: string;
  note?: string;
}) {
  return (
    <Wrap>
      <Kicker>{template}</Kicker>
      <h1>{title}</h1>
      {note ? <p>{note}</p> : null}
      <Link href="/">
        <Button variant="tertiary" size="compact">
          ← Foundation home
        </Button>
      </Link>
    </Wrap>
  );
}

const Wrap = styled.div`
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  h1 {
    font-size: 26px;
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: 14px;
    max-width: 52ch;
  }
`;
const Kicker = styled.span`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
