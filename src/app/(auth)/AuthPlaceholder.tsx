'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';

/** Shown in dev when Clerk keys are absent — makes the shell fully navigable without auth. */
export function AuthPlaceholder({ title, continueTo = '/map' }: { title: string; continueTo?: string }) {
  return (
    <Card>
      <h1>{title}</h1>
      <p>
        Clerk isn&apos;t configured. Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{' '}
        <code>CLERK_SECRET_KEY</code> to <code>.env.local</code> to enable real auth.
      </p>
      <Link href={continueTo}>
        <Button variant="primary" fullWidth>
          Continue (dev)
        </Button>
      </Link>
    </Card>
  );
}

const Card = styled.div`
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  border-radius: ${({ theme }) => theme.radius.card}px;
  padding: ${({ theme }) => theme.space[6]}px;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;

  h1 {
    font-size: 24px;
  }
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  code {
    font-size: 12px;
    background: ${({ theme }) => theme.color.surfaceRaised2};
    padding: 1px 5px;
    border-radius: 4px;
  }
`;
