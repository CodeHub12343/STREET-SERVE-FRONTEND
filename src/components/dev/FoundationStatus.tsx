'use client';

/**
 * Milestone 0 exit-criteria panel: proves the plumbing boots — a TanStack Query round-trips
 * (against the frontend /api/health route, so it works without the backend running), the socket
 * connection status is observable, and the theme toggle drives the design tokens. Remove/replace
 * with real screens in later milestones.
 */
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { useSocket } from '@/lib/socket/SocketProvider';
import { useThemeStore } from '@/stores/theme.store';
import { isAuthConfigured, isMapConfigured, isStripeConfigured } from '@/lib/env';
import { Button } from '@/components/primitives/Button';

interface HealthResponse {
  status: string;
  service: string;
  time: string;
}

export function FoundationStatus() {
  const setPreference = useThemeStore((s) => s.setPreference);
  const preference = useThemeStore((s) => s.preference);
  const { connected } = useSocket();

  const health = useQuery({
    queryKey: ['frontend-health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('health failed');
      return res.json() as Promise<HealthResponse>;
    },
  });

  return (
    <Card>
      <h2>Foundation status</h2>
      <Row>
        <span>TanStack Query</span>
        <Pill $ok={health.isSuccess}>
          {health.isLoading ? 'checking…' : health.isSuccess ? `ok · ${health.data.service}` : 'error'}
        </Pill>
      </Row>
      <Row>
        <span>Socket.IO</span>
        <Pill $ok={connected}>
          {isAuthConfigured ? (connected ? 'connected' : 'idle (sign in)') : 'not configured'}
        </Pill>
      </Row>
      <Row>
        <span>Auth (Clerk)</span>
        <Pill $ok={isAuthConfigured}>{isAuthConfigured ? 'configured' : 'dev — no keys'}</Pill>
      </Row>
      <Row>
        <span>Stripe · Mapbox</span>
        <Pill $ok={isStripeConfigured && isMapConfigured}>
          {isStripeConfigured ? 'stripe✓' : 'stripe—'} {isMapConfigured ? 'map✓' : 'map—'}
        </Pill>
      </Row>
      <Toggle>
        <span>Theme: {preference}</span>
        <Buttons>
          <Button size="compact" variant="secondary" onClick={() => setPreference('system')}>
            System
          </Button>
          <Button size="compact" variant="secondary" onClick={() => setPreference('dark')}>
            Dark
          </Button>
          <Button size="compact" variant="secondary" onClick={() => setPreference('light')}>
            Light
          </Button>
        </Buttons>
      </Toggle>
    </Card>
  );
}

const Card = styled.div`
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  border-radius: ${({ theme }) => theme.radius.card}px;
  padding: ${({ theme }) => theme.space[5]}px;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 480px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Pill = styled.span<{ $ok: boolean }>`
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme, $ok }) =>
    $ok ? `color-mix(in srgb, ${theme.color.statusLive} 55%, ${theme.color.textPrimary})` : theme.color.textTertiary};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Toggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
  padding-top: ${({ theme }) => theme.space[3]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  font-size: 13px;
`;
const Buttons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
