'use client';

/**
 * ═══ FRANCHISE / MULTI-VENDOR — Phase 3 brand overview. ═══
 *
 * One screen the franchise owner opens when they want to know what's happening across their
 * trucks right now. Reads `GET /brands/:id/overview` which packages:
 *   • The brand's active operators with their live status (where known).
 *   • The policy mode (pooled / per_operator) + how splits are configured.
 *   • Pending invites.
 *   • 30-day earnings headline (paid vs fallback vs reversed).
 *
 * This page is distinct from the operator's own vendor dashboard — operators keep working from
 * `/vendor/*`. The brand overview is the owner's and manager's layer above that.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import Link from 'next/link';
import { Radio, Store, UserPlus, AlertTriangle, UserMinus } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useRequireAuth } from '@/lib/auth/guards';

interface Overview {
  brand: { id: string; name: string; slug: string; logoUrl: string | null; status: string };
  businesses: { id: string; name: string; status: string }[];
  operators: {
    operatorId: string;
    userId: string;
    businessId: string;
    displayName: string;
    stripeConnected: boolean;
    payoutsEnabled: boolean;
    approvedByOwner: boolean;
    live: { status: string; coordinates: number[] | null; lastPingAt: string | null } | null;
    earningsCents30d: number;
  }[];
  members: { userId: string; role: string; scopedBusinessIds: string[] }[];
  pendingInvites: { id: string; inviteeEmail: string; role: string; expiresAt: string }[];
  policy: { mode: 'pooled' | 'per_operator'; splits: { operatorId: string; shareBps: number }[] };
  earnings: { windowDays: number; paidCents: number; fallbackCents: number; reversedCents: number };
}

export function BrandOverview({ brandId }: { brandId: string }) {
  useRequireAuth();
  const qc = useQueryClient();
  const { show } = useToast();
  const { data, isLoading, isError, refetch } = useQuery<Overview>({
    queryKey: ['brand', brandId, 'overview'],
    queryFn: () => api.get<Overview>(endpoints.brandOverview(brandId)),
    staleTime: 30_000,
  });

  /**
   * 2026-10-28 — owner-self-serve retire. Owner clicks the small X on a truck card; the
   * operator is retired immediately, pin drops off the map, no admin step.
   */
  const retire = useMutation({
    mutationFn: (operatorId: string) =>
      api.post(endpoints.myBrandOperatorRetire(operatorId), {}),
    onSuccess: () => {
      show('Operator retired', 'success');
      void qc.invalidateQueries({ queryKey: ['brand', brandId, 'overview'] });
    },
    onError: (err) =>
      show(err instanceof AppApiError ? err.message : 'Could not retire operator', 'danger'),
  });

  if (isLoading) {
    return (
      <Page>
        <Skeleton $h="420px" $radius={16} />
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        <ErrorState title="Couldn't load this brand" onRetry={() => void refetch()} />
      </Page>
    );
  }

  const liveCount = data.operators.filter((o) => o.live && o.live.status !== 'away_closed').length;
  /**
   * 2026-10-28 — operator Stripe is auto-approved on completion, so the only remaining
   * "needs attention" state is Stripe KYC not yet done. The owner no longer has to approve
   * manually; approval flipped the moment the operator finished onboarding.
   */
  const needsAttention = data.operators.filter((o) => !o.payoutsEnabled).length;

  return (
    <Page>
      <Header>
        <h1>{data.brand.name}</h1>
        <Sub>
          {liveCount} of {data.operators.length} trucks live &middot; Policy:{' '}
          <strong>{data.policy.mode === 'per_operator' ? 'per-operator split' : 'pooled'}</strong>
        </Sub>
      </Header>

      <StatRow>
        <Stat>
          <StatLabel>Paid out (30d)</StatLabel>
          <StatValue className="tnum">{formatCents(data.earnings.paidCents)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Routed to owner (fallback)</StatLabel>
          <StatValue className="tnum">{formatCents(data.earnings.fallbackCents)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Reversed (refunds)</StatLabel>
          <StatValue className="tnum">{formatCents(data.earnings.reversedCents)}</StatValue>
        </Stat>
      </StatRow>

      {needsAttention > 0 ? (
        <AttentionBanner>
          <AlertTriangle size={16} aria-hidden />
          <span>
            {needsAttention} operator{needsAttention === 1 ? '' : 's'} haven&apos;t finished
            Stripe setup yet. Their share routes to your account until they do.
          </span>
        </AttentionBanner>
      ) : null}

      <Section>
        <SectionHead>
          <h2>Trucks</h2>
          <Link href={`/brand/${brandId}/members`} passHref legacyBehavior>
            <HeadCta>
              <UserPlus size={14} aria-hidden /> Invite + manage
            </HeadCta>
          </Link>
        </SectionHead>
        {data.operators.length === 0 ? (
          <Empty>
            No active trucks yet. Invite an operator and seat them at a business to put the first
            pin on the map.
          </Empty>
        ) : (
          <Grid>
            {data.operators.map((op) => (
              <TruckCard key={op.operatorId}>
                <TruckHead>
                  <Store size={14} aria-hidden />
                  <strong>{op.displayName}</strong>
                  {op.live ? (
                    <LiveChip $status={op.live.status}>
                      <Radio size={11} aria-hidden /> {op.live.status.replace('_', ' ')}
                    </LiveChip>
                  ) : (
                    <OfflineChip>Offline</OfflineChip>
                  )}
                </TruckHead>
                <TruckMeta>
                  <TruckRow>
                    <TruckKey>Earnings (30d)</TruckKey>
                    <TruckVal className="tnum">{formatCents(op.earningsCents30d)}</TruckVal>
                  </TruckRow>
                  <TruckRow>
                    <TruckKey>Stripe</TruckKey>
                    <TruckVal>
                      {!op.stripeConnected
                        ? 'Not connected'
                        : !op.payoutsEnabled
                          ? 'Pending Stripe approval'
                          : 'Ready to pay'}
                    </TruckVal>
                  </TruckRow>
                </TruckMeta>
                <RetireRow>
                  <RetireButton
                    type="button"
                    disabled={retire.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Retire ${op.displayName}? Their pin will drop off the map and they lose dashboard access. History stays intact.`,
                        )
                      ) {
                        retire.mutate(op.operatorId);
                      }
                    }}
                  >
                    <UserMinus size={13} aria-hidden /> Retire operator
                  </RetireButton>
                </RetireRow>
              </TruckCard>
            ))}
          </Grid>
        )}
      </Section>

      {data.pendingInvites.length > 0 ? (
        <Section>
          <SectionHead>
            <h2>Pending invites</h2>
          </SectionHead>
          <InviteList>
            {data.pendingInvites.map((inv) => (
              <InviteRow key={inv.id}>
                <span>{inv.inviteeEmail}</span>
                <span>{inv.role}</span>
                <span>Expires {new Date(inv.expiresAt).toDateString()}</span>
              </InviteRow>
            ))}
          </InviteList>
        </Section>
      ) : null}
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  max-width: 960px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Header = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  h1 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const Sub = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const StatRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Stat = styled.div`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const StatLabel = styled.p`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const StatValue = styled.p`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const AttentionBanner = styled.p`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
  svg {
    flex: none;
    margin-top: 2px;
  }
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  h2 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 20px;
    font-weight: 800;
  }
`;

const HeadCta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentPrimary};
  &:hover {
    text-decoration: underline;
  }
`;

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const TruckCard = styled.article`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const TruckHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 14px;
`;

const LiveChip = styled.span<{ $status: string }>`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $status }) =>
    $status === 'away_closed' ? theme.color.textSecondary : theme.color.statusLive};
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
`;

const OfflineChip = styled.span`
  margin-left: auto;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 11px;
  font-weight: 700;
`;

const TruckMeta = styled.div`
  display: grid;
  gap: 4px;
`;

const TruckRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const TruckKey = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const TruckVal = styled.span`
  font-size: 13.5px;
  font-weight: 700;
`;

const RetireRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;

const RetireButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
    color: ${({ theme }) => theme.color.textPrimary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
  line-height: 1.55;
`;

const InviteList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const InviteRow = styled.li`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  font-size: 13.5px;
`;

/** Button-styled link to avoid repeating the pattern in callers. */
export function BrandOverviewPrimaryCta({ href, label }: { href: string; label: string }) {
  return <PrimaryCtaLink href={href}>{label}</PrimaryCtaLink>;
}

const PrimaryCtaLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  &:hover {
    filter: brightness(1.05);
  }
`;

// Avoid unused-import lint when Button isn't referenced in this file after the refactor.
void Button;
