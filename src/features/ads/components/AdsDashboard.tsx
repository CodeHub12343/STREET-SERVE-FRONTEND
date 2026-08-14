'use client';

/**
 * The advertiser's dashboard (M-11 / RV-17). Six working endpoints had no screen at all, so a
 * business could be sold a promotion and then had no way to see whether it did anything.
 *
 * The design decision that matters here: **delivery is reported, never implied.** A campaign shows
 * the impressions and clicks it actually got, and where it got none it says so plainly rather than
 * rendering an encouraging zero. Selling visibility while implying outcomes is how an ad product
 * loses the trust it depends on — and spec §32 says in as many words that promoted placement does
 * not guarantee sales.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { BarChart3, CreditCard, MousePointerClick, Pause, Play, Plus, Eye } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { AppApiError } from '@/lib/api/errors';
import { Sheet } from '@/components/primitives/Sheet';
import { PaymentSheet } from '@/features/payments';
import { usePlacements, usePausePlacement, useResumePlacementPayment } from '../hooks/useAds';
import type { CreatedPlacement, Placement } from '../types';
import { PromotedLabel } from './PromotedLabel';

const STATUS_COPY: Record<Placement['status'], { label: string; tone: 'live' | 'muted' | 'warn' }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'warn' },
  active: { label: 'Running', tone: 'live' },
  paused: { label: 'Paused', tone: 'muted' },
  exhausted: { label: 'Budget spent', tone: 'muted' },
  ended: { label: 'Finished', tone: 'muted' },
};

export function AdsDashboard({ businessId }: { businessId?: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data, isLoading, isError, refetch } = usePlacements(businessId);
  const pause = usePausePlacement(businessId);
  const resume = useResumePlacementPayment(businessId);
  /** Which card's button is spinning — so one "Pay now" does not spin every row. */
  const [payingId, setPayingId] = useState<string | null>(null);
  /** The re-opened charge, held while the card form is on screen. */
  const [paying, setPaying] = useState<{ placement: CreatedPlacement } | null>(null);

  const totals = useMemo(() => {
    const rows = data ?? [];
    return {
      spentCents: rows.reduce((s, p) => s + p.spentCents, 0),
      impressions: rows.reduce((s, p) => s + p.impressions, 0),
      clicks: rows.reduce((s, p) => s + p.clicks, 0),
      running: rows.filter((p) => p.status === 'active').length,
    };
  }, [data]);

  const newHref = businessId ? `/vendor/ads/new?businessId=${businessId}` : '/vendor/ads/new';

  return (
    <TabPage title="Promotions" backHref="/vendor" backLabel="Back to dashboard">
      <Intro>
        <PromotedLabel label="Promoted" />
        <span>
          Promoted placement gets you seen more often. It never hides anyone else — promoted items
          are always labelled and capped at a share of what people see.
        </span>
      </Intro>

      {isLoading ? (
        <List>
          <Skeleton $h="132px" $radius={16} />
          <Skeleton $h="132px" $radius={16} />
        </List>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={28} aria-hidden />}
          title="No promotions yet"
          description="Promote a product, a hub, or run an ad. From $5 for a day — you'll see exactly what it delivered."
          action={
            <Button onClick={() => router.push(newHref)}>Create a promotion</Button>
          }
        />
      ) : (
        <>
          <Summary aria-label="Across all promotions">
            <Stat>
              <dt>Spent</dt>
              <dd className="tnum">{formatCents(totals.spentCents)}</dd>
            </Stat>
            <Stat>
              <dt>Views</dt>
              <dd className="tnum">{totals.impressions.toLocaleString()}</dd>
            </Stat>
            <Stat>
              <dt>Taps</dt>
              <dd className="tnum">{totals.clicks.toLocaleString()}</dd>
            </Stat>
            <Stat>
              {/* Not "Running": that word already labels a single campaign's status below, and one
                  word meaning two things on one screen is how a summary gets misread as a status. */}
              <dt>Live now</dt>
              <dd className="tnum">{totals.running}</dd>
            </Stat>
          </Summary>

          <NewRow>
            <Button size="compact" onClick={() => router.push(newHref)}>
              <Plus size={15} aria-hidden /> New promotion
            </Button>
          </NewRow>

          <List>
            {(data ?? []).map((p) => (
              <Card key={p.id}>
                <CardHead>
                  <div>
                    <Name>{p.headline ?? subjectName(p)}</Name>
                    <Sub>{p.deliveryLabel}</Sub>
                  </div>
                  <Status $tone={STATUS_COPY[p.status].tone}>{STATUS_COPY[p.status].label}</Status>
                </CardHead>

                {p.awaitingPayment ? (
                  /* An unpaid placement delivers nothing, so showing it delivery stats would be a
                     lie of omission. Say what is actually true: it has not started. */
                  <Pending>
                    This promotion starts as soon as its payment goes through. Nothing has been
                    charged or shown yet.
                    {/*
                      The way out. Without this a buyer who closed the tab mid-checkout is stranded
                      for good — the client secret is only handed back at creation, so the promotion
                      sits here for ever holding a city slot it will never use. Re-opening the charge
                      is safe: the server keys it per placement, so Stripe returns the SAME
                      PaymentIntent rather than a second one.
                    */}
                    <PayRow>
                      <Button
                        size="compact"
                        loading={resume.isPending && payingId === p.id}
                        onClick={() => {
                          setPayingId(p.id);
                          resume.mutate(p.id, {
                            onSuccess: (res) => setPaying({ placement: res }),
                            onError: (e) =>
                              show(
                                e instanceof AppApiError ? e.message : 'Could not start the payment',
                                'danger',
                              ),
                          });
                        }}
                      >
                        <CreditCard size={15} aria-hidden /> Pay now
                      </Button>
                    </PayRow>
                  </Pending>
                ) : (
                  <Metrics>
                    <Metric>
                      <Eye size={14} aria-hidden />
                      <b className="tnum">{p.impressions.toLocaleString()}</b> views
                    </Metric>
                    <Metric>
                      <MousePointerClick size={14} aria-hidden />
                      <b className="tnum">{p.clicks.toLocaleString()}</b> taps
                    </Metric>
                    <Metric>
                      <b className="tnum">{(p.clickThroughRate * 100).toFixed(1)}%</b> tap rate
                    </Metric>
                  </Metrics>
                )}

                {!p.awaitingPayment && p.impressions === 0 ? (
                  <Quiet>No views yet. Promotions build up over the time you bought.</Quiet>
                ) : null}

                {p.status === 'active' || p.status === 'paused' ? (
                  <Actions>
                    <Button
                      size="compact"
                      variant="tertiary"
                      loading={pause.isPending}
                      onClick={() =>
                        pause.mutate(
                          { id: p.id, paused: p.status === 'active' },
                          {
                            onSuccess: () =>
                              show(p.status === 'active' ? 'Promotion paused' : 'Promotion resumed', 'default'),
                            onError: (e) =>
                              show(e instanceof AppApiError ? e.message : 'Could not update', 'danger'),
                          },
                        )
                      }
                    >
                      {p.status === 'active' ? (
                        <>
                          <Pause size={14} aria-hidden /> Pause
                        </>
                      ) : (
                        <>
                          <Play size={14} aria-hidden /> Resume
                        </>
                      )}
                    </Button>
                  </Actions>
                ) : null}
              </Card>
            ))}
          </List>
        </>
      )}
      {/*
        Paying for a promotion that was created earlier. Kept in a sheet rather than a route so the
        buyer keeps their place in the list — the whole point is that this is a small recovery, not
        a second checkout journey.
      */}
      <Sheet
        open={Boolean(paying)}
        onClose={() => {
          setPaying(null);
          setPayingId(null);
        }}
        ariaLabel="Pay for your promotion"
      >
        {paying ? (
          <SheetBody>
            <SheetTitle>Pay for your promotion</SheetTitle>
            <SheetRow>
              <span>{paying.placement.label}</span>
              <strong className="tnum">{formatCents(paying.placement.budgetCents)}</strong>
            </SheetRow>
            <PaymentSheet
              clientSecret={paying.placement.clientSecret ?? 'demo'}
              amountCents={paying.placement.budgetCents}
              onSuccess={() => {
                setPaying(null);
                setPayingId(null);
                /**
                 * Payment taken — NOT yet running. Delivery starts when Stripe's webhook reaches the
                 * server, so the wording promises the charge and the list refetch lets the card flip
                 * to "Running" on its own once that lands.
                 */
                show('Payment received — your promotion goes live in a moment.', 'success');
                void refetch();
              }}
            />
          </SheetBody>
        ) : null}
      </Sheet>
    </TabPage>
  );
}

function subjectName(p: Placement): string {
  if (p.kind === 'featured_hub') return 'Featured hub';
  if (p.kind === 'featured_product') return 'Featured product';
  return 'Ad';
}

const Intro = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;

const Summary = styled.dl`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;

const Stat = styled.div`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  dt {
    font-size: 11px;
    color: ${({ theme }) => theme.color.textTertiary};
  }
  dd {
    font-size: 16px;
    font-weight: 800;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const NewRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const Card = styled.article`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;

const CardHead = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const Name = styled.h2`
  font-size: 15px;
  font-weight: 800;
`;

const Sub = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Status = styled.span<{ $tone: 'live' | 'muted' | 'warn' }>`
  flex: none;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  color: ${({ theme, $tone }) =>
    $tone === 'live'
      ? theme.color.statusLive
      : $tone === 'warn'
        ? theme.color.statusWarning
        : theme.color.textTertiary};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;

const Metrics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[4]}px;
`;

const Metric = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    font-size: 14px;
    font-weight: 800;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  svg {
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;

const PayRow = styled.div`
  margin-top: ${({ theme }) => theme.space[3]}px;
`;

const SheetTitle = styled.h2`
  font-size: 17px;
  font-weight: 800;
`;

const SheetBody = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;

const SheetRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 14px;
  strong {
    font-size: 18px;
    font-weight: 800;
  }
`;

const Pending = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.statusWarning};
`;

const Quiet = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
