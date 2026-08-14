'use client';

/**
 * Monetization upgrade screen (R29/R30) — the four plans with their price and what they unlock, and a
 * one-tap subscribe/active state. Business plans are keyed to the passed businessId; the AI assistant
 * is user-scoped.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Check, Sparkles } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Sheet } from '@/components/primitives/Sheet';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { PaymentSheet } from '@/features/payments/components/PaymentSheet';
import { formatCents } from '@/lib/money';
import {
  usePlans,
  useEntitlements,
  useSubscribe,
  useConfirmSubscription,
  useCancelSubscription,
  type PlanDef,
  type Entitlements,
} from './useSubscriptions';

/**
 * Exhaustive by construction: `Record<PlanDef['plan'], …>` fails the build if a plan is added to
 * the union without a key here, which is how `seller_plus` and `stock_waiver` came to be missing —
 * the union itself was short, so nothing complained.
 */
const ENTITLEMENT_KEY: Record<PlanDef['plan'], keyof Entitlements> = {
  pro: 'pro',
  featured: 'featured',
  verified_badge: 'verifiedBadge',
  ai_assistant: 'aiAssistant',
  seller_plus: 'sellerPlus',
  stock_waiver: 'stockWaiver',
};

export function PlansScreen({ businessId }: { businessId?: string }) {
  const { show } = useToast();
  const { data: plans, isLoading } = usePlans();
  const { data: entitlements } = useEntitlements(businessId);
  const subscribe = useSubscribe(businessId);
  const confirm = useConfirmSubscription(businessId);
  const cancel = useCancelSubscription(businessId);

  /** The plan whose first invoice is awaiting a card, and the secret that pays it. */
  const [pending, setPending] = useState<{ plan: PlanDef; clientSecret: string } | null>(null);

  return (
    <TabPage title="Upgrade" backHref="/vendor" backLabel="Back to dashboard">
      <Intro>
        <Sparkles size={18} aria-hidden /> Grow faster with a StreetServe plan.
      </Intro>
      {isLoading || !plans ? (
        <List>
          <Skeleton $h="120px" $radius={16} />
          <Skeleton $h="120px" $radius={16} />
        </List>
      ) : (
        <List>
          {plans.map((p) => {
            const active = entitlements?.[ENTITLEMENT_KEY[p.plan]] ?? false;
            return (
              <Card key={p.plan} $active={active}>
                <Row>
                  <Name>{p.name}</Name>
                  <Price className="tnum">
                    {formatCents(p.priceCents)}<Per>/mo</Per>
                  </Price>
                </Row>
                <Blurb>{p.blurb}</Blurb>
                {active ? (
                  <Actions>
                    <ActiveTag>
                      <Check size={14} /> Active
                    </ActiveTag>
                    <Button
                      size="compact"
                      variant="tertiary"
                      loading={cancel.isPending}
                      onClick={() =>
                        cancel.mutate(p.plan, { onSuccess: () => show('Subscription cancelled', 'default') })
                      }
                    >
                      Cancel
                    </Button>
                  </Actions>
                ) : (
                  <Button
                    size="compact"
                    loading={subscribe.isPending && subscribe.variables === p.plan}
                    onClick={() =>
                      subscribe.mutate(p.plan, {
                        onSuccess: (res) => {
                          // A plan is only live if Stripe says so; otherwise its first invoice needs a card.
                          if (res.clientSecret) {
                            setPending({ plan: p, clientSecret: res.clientSecret });
                          } else {
                            show(`${p.name} activated`, 'success');
                          }
                        },
                        /**
                         * The server's reason, not a blanket "try again". This screen used to discard
                         * the error entirely, which is how a hard Stripe misconfiguration looked
                         * identical to a network blip for as long as it did.
                         */
                        onError: (err) =>
                          show(err.message || 'Couldn’t start the subscription. Please try again.', 'danger'),
                      })
                    }
                  >
                    Subscribe · {formatCents(p.priceCents)}/mo
                  </Button>
                )}
              </Card>
            );
          })}
        </List>
      )}

      {/*
        The first month is charged here. Until this succeeds the subscription sits at Stripe as
        `incomplete` and grants nothing — which is the point: the plan is not "on" because the
        server said the word, it is on because the money moved.
      */}
      {pending && (
        <Sheet
          open
          onClose={() => setPending(null)}
          ariaLabel={`Pay for ${pending.plan.name}`}
          initialSnap="full"
        >
          <PayHead>
            <PayTitle>{pending.plan.name}</PayTitle>
            <PaySub>
              {formatCents(pending.plan.priceCents)} per month, starting today. Cancel any time.
            </PaySub>
          </PayHead>
          <PaymentSheet
            clientSecret={pending.clientSecret}
            amountCents={pending.plan.priceCents}
            onSuccess={() => {
              const plan = pending.plan;
              setPending(null);
              confirm.mutate(plan.plan, {
                onSuccess: (res) =>
                  show(
                    res.status === 'active' || res.status === 'trialing'
                      ? `${plan.name} activated`
                      : 'Payment received — activation is still settling. Refresh in a moment.',
                    res.status === 'active' || res.status === 'trialing' ? 'success' : 'default',
                  ),
                onError: () =>
                  show('Payment went through, but we couldn’t confirm the plan. Refresh in a moment.', 'danger'),
              });
            }}
          />
        </Sheet>
      )}
    </TabPage>
  );
}

const PayHead = styled.div`
  display: grid;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const PayTitle = styled.h2`
  font-size: 18px;
  font-weight: 800;
`;
const PaySub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Intro = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  svg {
    color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.div<{ $active: boolean }>`
  display: grid;
  gap: 8px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? `color-mix(in srgb, ${theme.color.statusLive} 35%, transparent)` : theme.color.line2};
`;
const Row = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 16px;
`;
const Price = styled.p`
  font-weight: 800;
  font-size: 18px;
`;
const Per = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Blurb = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const ActiveTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusLive};
`;
