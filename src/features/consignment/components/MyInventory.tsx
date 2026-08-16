'use client';

/**
 * S-07 My Inventory (docs/13 S-07) — active checkouts with sold/total progress and return-deadline
 * urgency states. Each opens actions: log a sale, return, or view settlement.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOpenWorkThread } from '@/features/messaging/hooks/useWorkThread';
import { SellerLiveControl } from '@/features/seller/components/SellerLiveControl';
import { useMe } from '@/lib/auth/useMe';
import styled from 'styled-components';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import { useCheckouts, useCheckoutLifecycle } from '../hooks/useConsignment';
import type { Checkout } from '../types';

function urgency(deadlineIso: string): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  const hrs = (new Date(deadlineIso).getTime() - Date.now()) / 3_600_000;
  if (hrs < 24) return { label: `Return in ${Math.max(0, Math.round(hrs))}h`, tone: 'danger' };
  if (hrs < 72) return { label: `Return in ${Math.round(hrs / 24)}d`, tone: 'warn' };
  return { label: `Return in ${Math.round(hrs / 24)}d`, tone: 'ok' };
}

/** Days until the consignment TERM expires (R14) — distinct from the physical return deadline. */
function termCountdown(expiresIso?: string | null): string | null {
  if (!expiresIso) return 'No time limit';
  const days = Math.ceil((new Date(expiresIso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Term ended';
  return `Term ends in ${days}d`;
}

export function MyInventory() {
  const router = useRouter();
  const { principal } = useMe();
  const { data: checkouts, isLoading } = useCheckouts();
  // Pending reservations belong here too — the seller needs to see what they're waiting on (H-03).
  const active = (checkouts ?? []).filter((c) =>
    ['pending_approval', 'active', 'overdue', 'return_pending'].includes(c.status),
  );

  return (
    <TabPage title="My inventory">
      {/*
        Going live belongs HERE, next to the stock it is about. A seller carrying a hub's inventory
        is the one person whose position the hub is entitled to see, and until now nothing in the
        product could start a seller session at all — which is why the hub's "where my stock is" map
        was permanently empty. Hidden when nothing is checked out: there is no reason to ask someone
        to share their location when they are carrying nothing.
      */}
      {active.length > 0 && principal?.userId ? <SellerLiveControl userId={principal.userId} /> : null}
      {isLoading ? (
        <List><Skeleton $h="140px" $radius={16} /><Skeleton $h="140px" $radius={16} /></List>
      ) : active.length === 0 ? (
        <EmptyState icon="📦" title="Nothing checked out" description="Reserve inventory to start selling." action={<Button size="compact" onClick={() => router.push('/seller')}>Find inventory</Button>} />
      ) : (
        <List>
          {active.map((c) => (
            <Item key={c.id} checkout={c} router={router} />
          ))}
        </List>
      )}
    </TabPage>
  );
}

function Item({ checkout: c, router }: { checkout: Checkout; router: ReturnType<typeof useRouter> }) {
  const u = urgency(c.returnDeadline);
  const remaining = c.quantity - c.soldQty;
  const pct = Math.round((c.soldQty / c.quantity) * 100);
  const isReturnPending = c.status === 'return_pending';
  const isAwaitingApproval = c.status === 'pending_approval';
  const { extend, reducePrice, end, setAutoRenew } = useCheckoutLifecycle(c.id);
  /** The seller's side of the same channel the hub now has. */
  const message = useOpenWorkThread();
  const [priceEditing, setPriceEditing] = useState(false);
  const [priceStr, setPriceStr] = useState('');

  const submitReduce = () => {
    const cents = Math.round(Number(priceStr.replace(/[^0-9.]/g, '')) * 100);
    if (cents > 0) reducePrice.mutate(cents, { onSuccess: () => setPriceEditing(false) });
  };

  return (
    <Card>
      <Head>
        <div>
          <Name>{c.productName}</Name>
          <Hub>{c.hubName}</Hub>
        </div>
        <Deadline $tone={u.tone}>{u.label}</Deadline>
      </Head>

      {isAwaitingApproval ? (
        <Banner tone="info" title="Waiting on the hub">
          Your reservation is held for you. The hub is reviewing it — you’ll be notified as soon as
          they approve or decline, and you can collect the stock once it’s approved.
        </Banner>
      ) : null}

      {/* Consignment term (R14): a countdown distinct from the physical return deadline. */}
      <TermLine>
        <span>{termCountdown(c.expiresAt)}</span>
        {c.minimumAuthorizedPriceCents != null ? (
          <span>· Min {formatCents(c.minimumAuthorizedPriceCents)}</span>
        ) : null}
      </TermLine>

      {isReturnPending ? (
        <Banner tone="warning" title="Return pending">
          {c.returnTerms
            ? `Return within ${c.returnTerms.returnWindowDays} days (${c.returnTerms.returnResponsibility} ships).`
            : 'Please arrange the return of unsold items.'}
        </Banner>
      ) : null}

      {c.terminationEffectiveAt ? (
        /*
         * §37 — notice is running. The date is the whole point: "ending" without saying WHEN tells
         * a seller nothing about whether they need to act today or next week.
         */
        <Banner tone="warning" title="Ending soon">
          {c.terminatedBy === 'hub' ? 'The hub has recalled this stock. ' : 'You ended this. '}
          Unsold items are due back by {new Date(c.terminationEffectiveAt).toLocaleDateString()}.
        </Banner>
      ) : null}

      {c.autoRenew && !c.terminationEffectiveAt ? (
        // §39 — renewal must be visible and stoppable, not a surprise at the end of the term.
        <RenewRow>
          <span>
            Renews automatically
            {c.autoRenewTerm === 'until_sold'
              ? ' until the stock sells'
              : c.autoRenewTerm
                ? ` for another ${c.autoRenewTerm} days`
                : ''}
            .
          </span>
          <Button
            size="compact"
            variant="tertiary"
            loading={setAutoRenew.isPending}
            onClick={() => setAutoRenew.mutate({ enabled: false })}
          >
            Turn off
          </Button>
        </RenewRow>
      ) : null}

      {isAwaitingApproval ? null : (
        <Progress>
          <Bar><Fill style={{ width: `${pct}%` }} /></Bar>
          <ProgressText className="tnum">{c.soldQty}/{c.quantity} sold · {remaining} left</ProgressText>
        </Progress>
      )}

      {priceEditing ? (
        <PriceRow>
          <Input
            label="New price (per unit)"
            inputMode="decimal"
            placeholder="$0.00"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
          />
          <Button size="compact" loading={reducePrice.isPending} onClick={submitReduce}>Save</Button>
          <Button size="compact" variant="tertiary" onClick={() => setPriceEditing(false)}>Cancel</Button>
        </PriceRow>
      ) : null}

      <Actions>
        {isAwaitingApproval ? (
          // Nothing to sell, return, or settle until the hub releases the goods.
          <Pending>Awaiting hub approval</Pending>
        ) : isReturnPending ? (
          <Button size="compact" onClick={() => router.push(`/seller/checkout/${c.id}/return`)}>Return now</Button>
        ) : (
          <>
            {/* Digital first: card sales pay out automatically and cost the seller a lower fee. */}
            <Button size="compact" disabled={remaining === 0} onClick={() => router.push(`/seller/checkout/${c.id}/collect`)}>Sell an item</Button>
            <Button size="compact" variant="secondary" onClick={() => router.push(`/seller/checkout/${c.id}/return`)}>Return</Button>
            {/* Lifecycle actions (R15): extend the term, drop the price, or end early. */}
            <Button size="compact" variant="tertiary" loading={extend.isPending} onClick={() => extend.mutate(30)}>Extend 30d</Button>
            <Button size="compact" variant="tertiary" onClick={() => setPriceEditing((v) => !v)}>Reduce price</Button>
            {/*
              Talk to the hub. Deliberately OUTSIDE the notice conditional: a seller who has already
              been given notice is precisely the one who most needs to reach the hub — to arrange
              the return, or ask for more time — and hiding the channel at that point would leave
              them with the ending and no way to discuss it.
            */}
            <Button
              size="compact"
              variant="tertiary"
              loading={message.isPending}
              onClick={() => message.mutate({ subjectType: 'consignment', subjectRefId: c.id })}
            >
              Message hub
            </Button>
            {/* §37: this gives notice — the label says so, because "End" implies today. */}
            {!c.terminationEffectiveAt ? (
              <Button size="compact" variant="tertiary" loading={end.isPending} onClick={() => end.mutate()}>
                Give notice
              </Button>
            ) : null}
          </>
        )}
        {isAwaitingApproval ? null : (
          <Button size="compact" variant="tertiary" onClick={() => router.push(`/seller/checkout/${c.id}/settlement`)}>Settlement</Button>
        )}
      </Actions>
    </Card>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Pending = styled.p`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
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
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Hub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Deadline = styled.span<{ $tone: 'ok' | 'warn' | 'danger' }>`
  flex: none;
  font-size: 12px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme, $tone }) => ($tone === 'danger' ? theme.color.statusDanger : $tone === 'warn' ? theme.color.statusWarning : theme.color.statusLive)};
  background: ${({ theme, $tone }) => {
    const c = $tone === 'danger' ? theme.color.statusDanger : $tone === 'warn' ? theme.color.statusWarning : theme.color.statusLive;
    return `color-mix(in srgb, ${c} 15%, transparent)`;
  }};
`;
const TermLine = styled.div`
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const PriceRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space[2]}px;
  & > *:first-child {
    flex: 1;
    min-width: 0;
  }
`;
const Progress = styled.div`
  display: grid;
  gap: 4px;
`;
const Bar = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const Fill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.statusDiscount};
`;
const ProgressText = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  flex-wrap: wrap;
`;

const RenewRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
