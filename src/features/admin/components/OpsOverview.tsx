'use client';

/**
 * A-01 Ops Overview (docs/13 A-01) — live city-health metrics. Needs the GAP-2 aggregate endpoint
 * (GET /admin/overview); demo serves representative numbers. Tiles link into their queues.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Radio, Store, Receipt, Scale, Flag, BadgeCheck, UserPlus, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatCents } from '@/lib/money';
import { useAdminOverview } from '../hooks/useAdmin';

export function OpsOverview() {
  const router = useRouter();
  const { data: o, isLoading } = useAdminOverview();

  if (isLoading || !o) {
    return <Grid>{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} $h="96px" $radius={16} />)}</Grid>;
  }

  const tiles: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string; href?: string }[] = [
    { icon: <DollarSign size={18} />, label: 'GMV today', value: formatCents(o.gmvTodayCents), tone: 'live' },
    { icon: <Receipt size={18} />, label: 'Orders today', value: o.ordersToday.toLocaleString() },
    { icon: <Radio size={18} />, label: 'Live sessions', value: o.liveSessions },
    { icon: <Store size={18} />, label: 'Active vendors', value: o.activeVendors },
    { icon: <UserPlus size={18} />, label: 'New sign-ups', value: o.newSignups },
    { icon: <Scale size={18} />, label: 'Open disputes', value: o.openDisputes, tone: 'warn', href: '/admin/disputes' },
    { icon: <Flag size={18} />, label: 'Fraud flags', value: o.fraudFlags, tone: 'danger', href: '/admin/fraud' },
    { icon: <BadgeCheck size={18} />, label: 'Pending licenses', value: o.pendingLicenses, tone: 'warn', href: '/admin/categories' },
  ];

  return (
    <>
      <City>{o.city}</City>
      <Grid>
        {tiles.map((t, i) => (
          <Tile key={i} as={t.href ? 'button' : 'div'} onClick={t.href ? () => router.push(t.href!) : undefined} $clickable={Boolean(t.href)}>
            <Icon $tone={t.tone}>{t.icon}</Icon>
            <Value className="tnum">{t.value}</Value>
            <Label>{t.label}</Label>
          </Tile>
        ))}
      </Grid>
    </>
  );
}

const City = styled.h1`
  font-size: 20px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 900px;
  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(4, 1fr);
  }
`;
const Tile = styled.div<{ $clickable: boolean }>`
  display: grid;
  gap: 4px;
  justify-items: start;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-align: left;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
`;
const Icon = styled.span<{ $tone?: string }>`
  display: inline-flex;
  color: ${({ theme, $tone }) =>
    $tone === 'live' ? theme.color.statusLive : $tone === 'warn' ? theme.color.statusWarning : $tone === 'danger' ? theme.color.statusDanger : theme.color.accentSecondary};
`;
const Value = styled.span`
  font-size: 26px;
  font-weight: 800;
`;
const Label = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
