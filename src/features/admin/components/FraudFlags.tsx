'use client';

/**
 * A-04 Fraud flags (docs/13 A-04) — ping anomalies, oversell attempts, and device duplicates, with
 * severity. Human-in-the-loop: place a hold or dismiss. (Ping/oversell/spot-me anomalies, Security §4.)
 */
import styled from 'styled-components';
import { Fingerprint, PackageX, Activity } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatRelativeMinutes } from '@/lib/format';
import { useFraudFlags } from '../hooks/useAdmin';
import type { DemoFraudFlag } from '@/lib/demo';

const ICON: Record<DemoFraudFlag['kind'], React.ReactNode> = {
  'device-duplicate': <Fingerprint size={16} />,
  oversell: <PackageX size={16} />,
  'ping-anomaly': <Activity size={16} />,
};

export function FraudFlags() {
  const { show } = useToast();
  const { data: flags, isLoading } = useFraudFlags();

  if (isLoading) return <Wrap><Skeleton $h="96px" $radius={16} /></Wrap>;
  if (!flags || flags.length === 0) return <EmptyState icon="🚩" title="No fraud flags" description="Anomalies from the ping/oversell/spot-me detectors surface here." />;

  return (
    <Wrap>
      {flags.map((f) => (
        <Card key={f.id} $sev={f.severity}>
          <Icon $sev={f.severity} aria-hidden>{ICON[f.kind]}</Icon>
          <Info>
            <Top>
              <Kind>{f.kind.replace('-', ' ')}</Kind>
              <Sev $sev={f.severity}>{f.severity}</Sev>
            </Top>
            <Detail>{f.detail}</Detail>
            <Meta>{f.subject} · {formatRelativeMinutes(f.at)}</Meta>
          </Info>
          <Actions>
            <Button size="compact" variant="secondary" onClick={() => show('Hold placed', 'warning')}>Hold</Button>
            <Button size="compact" variant="tertiary" onClick={() => show('Flag dismissed', 'default')}>Dismiss</Button>
          </Actions>
        </Card>
      ))}
    </Wrap>
  );
}

type Sev = 'low' | 'medium' | 'high';
const color = (theme: import('styled-components').DefaultTheme, sev: Sev) =>
  sev === 'high' ? theme.color.statusDanger : sev === 'medium' ? theme.color.statusWarning : theme.color.textSecondary;

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 720px;
`;
const Card = styled.div<{ $sev: Sev }>`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme, $sev }) => ($sev === 'high' ? theme.color.statusDanger : theme.color.line2)};
`;
const Icon = styled.span<{ $sev: Sev }>`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $sev }) => color(theme, $sev)};
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Top = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Kind = styled.p`
  font-weight: 700;
  font-size: 14px;
  text-transform: capitalize;
`;
const Sev = styled.span<{ $sev: Sev }>`
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme, $sev }) => color(theme, $sev)};
  background: ${({ theme, $sev }) => `color-mix(in srgb, ${color(theme, $sev)} 15%, transparent)`};
`;
const Detail = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Meta = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  align-items: center;
  flex: none;
`;
