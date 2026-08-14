'use client';

/**
 * H-03 Checkout Approvals (docs/13 H-03) — pending seller reservations with the seller's Trust Score
 * and the declared value in context: the hub is accepting real liability (goods leaving on someone
 * else's word), so both halves of that decision are front and centre. Approve releases the goods;
 * decline returns the held stock to the shelf. The auto-approve rule shown is the live server-side
 * policy, not a claim — anything it clears never reaches this queue.
 */
import styled from 'styled-components';
import { Check, X, Home } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Avatar } from '@/components/primitives/Avatar';
import { TrustScoreBadge } from '@/components/data/TrustScoreBadge';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { useApprovalPolicy, usePendingCheckouts, useRespondCheckout } from '../hooks/useHub';

export function HubApprovals({ hubId }: { hubId: string }) {
  const { data: pending, isLoading } = usePendingCheckouts(hubId);
  const { data: policy } = useApprovalPolicy(hubId);
  const { approve, decline } = useRespondCheckout(hubId);

  const rule = policy
    ? `Auto-approve: Trust ≥ ${policy.autoApproveMinTrust}${
        policy.autoApproveMaxValueCents === null
          ? ' (any value)'
          : ` and up to ${formatCents(policy.autoApproveMaxValueCents)}`
      }`
    : null;

  if (isLoading) return <Wrap><Skeleton $h="120px" $radius={16} /><Skeleton $h="120px" $radius={16} /></Wrap>;
  if (!pending || pending.length === 0) {
    return (
      <Wrap>
        {rule ? <Banner tone="info">{rule} — reservations that clear it never reach this queue.</Banner> : null}
        <EmptyState icon="✅" title="No pending approvals" description="Seller reservations awaiting review appear here." />
      </Wrap>
    );
  }

  return (
    <Wrap>
      {rule ? <Banner tone="info">{rule} · {pending.length} awaiting review.</Banner> : null}
      {pending.map((p) => (
        <Card key={p.id}>
          <Head>
            <Avatar name={p.sellerName} size={44} />
            <Info>
              <Seller>
                {p.sellerName}
                {p.shelterCosigned ? <Shelter><Home size={12} /> Shelter cosigned</Shelter> : null}
              </Seller>
              <Prod>{p.quantity}× {p.productName}</Prod>
              {p.declaredValueCents !== undefined ? (
                <Value className="tnum">{formatCents(p.declaredValueCents)} of stock</Value>
              ) : null}
            </Info>
            <TrustScoreBadge score={p.trustScore} size="sm" />
          </Head>
          <Actions>
            <Button fullWidth loading={approve.isPending && approve.variables === p.id} onClick={() => approve.mutate(p.id)}>
              <Check size={16} /> Approve
            </Button>
            <Button
              variant="secondary"
              loading={decline.isPending && decline.variables?.id === p.id}
              onClick={() => decline.mutate({ id: p.id })}
            >
              <X size={16} /> Decline
            </Button>
          </Actions>
        </Card>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Seller = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
`;
const Shelter = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
const Prod = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Value = styled.p`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.space[2]}px;
`;
