'use client';

/**
 * U9 Rent-to-Own progress dashboard — where a customer sees exactly where they stand: how much they
 * own, what's next, and the live "pay off early" amount (the locked formula, R23). Supportive tone.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2, CreditCard, PackageOpen, PauseCircle } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { PaymentSheet } from '@/features/payments/components/PaymentSheet';
import type { RtoPayoffResult, RtoResumeResult } from '../types';
import {
  useRtoDashboard,
  useRtoStatements,
  usePayoff,
  useRtoReturnPreview,
  useRequestRtoReturn,
  useResumeInstallment,
} from '../hooks/useRto';

const PARTY_LABEL: Record<string, string> = {
  owner: 'Owner',
  managing_business: 'Managing business',
  platform: 'Platform fee',
  processor: 'Processing',
};

export function RtoDashboard({ id }: { id: string }) {
  const { show } = useToast();
  const { data, isLoading, isError } = useRtoDashboard(id);
  const statements = useRtoStatements(id, Boolean(data?.isConsignment));
  const payoff = usePayoff(id);
  const returnQuote = useRtoReturnPreview(id);
  const requestReturn = useRequestRtoReturn(id);
  /** Non-null once a payoff charge is open and the card is owed. */
  const [payingOff, setPayingOff] = useState<RtoPayoffResult | null>(null);
  const resume = useResumeInstallment(id);
  /** Non-null once a stuck instalment has an intent waiting for the card. */
  const [resuming, setResuming] = useState<RtoResumeResult | null>(null);

  if (isLoading) {
    return (
      <TabPage title="Rent-to-Own" backHref="/orders" backLabel="Back to orders">
        <Skeleton $h="160px" $radius={16} />
      </TabPage>
    );
  }
  if (isError || !data) {
    return (
      <TabPage title="Rent-to-Own" backHref="/orders" backLabel="Back to orders">
        <ErrorState title="Couldn’t load this agreement" />
      </TabPage>
    );
  }

  const done = data.status === 'completed';
  return (
    <TabPage title={data.productName} backHref="/orders" backLabel="Back to orders">
      {done ? (
        <Banner tone="success" title="It’s yours! 🎉">
          You’ve paid this off — ownership has transferred to you.
          {data.proofOfOwnership ? ` Proof: ${data.proofOfOwnership}` : ''}
        </Banner>
      ) : data.status === 'paused' ? (
        /* §50 — a remedy the customer cannot see is a remedy they will not rely on. */
        <Banner tone="info" title="Payments are paused">
          <PauseCircle size={14} aria-hidden /> Nothing is due
          {data.pausedUntil ? ` until ${new Date(data.pausedUntil).toLocaleDateString()}` : ''}. The
          seller agreed to hold this for you.
        </Banner>
      ) : data.status === 'arrangement' && data.arrangement ? (
        <Banner tone="info" title="You have a catch-up plan">
          {formatCents(data.arrangement.catchUpCents)} to clear
          {data.arrangement.dueAt ? ` by ${new Date(data.arrangement.dueAt).toLocaleDateString()}` : ''}.
          {data.arrangement.note ? ` ${data.arrangement.note}` : ''}
        </Banner>
      ) : data.status === 'return_pending' ? (
        <Banner tone="warning" title="Return in progress">
          {data.returnDisclosure ?? 'This item is going back to the seller.'}
        </Banner>
      ) : data.status === 'cancelled' ? (
        <Banner tone="info" title="Agreement closed">
          {data.returnDisclosure ?? 'This agreement has ended.'}
        </Banner>
      ) : data.paymentActionRequired ? (
        /*
          ═══ Stuck, but NOT delinquent. ═══

          Either the bank asked the customer to approve a scheduled payment, or we have no saved
          card to charge. Neither is their fault and neither is Grace, so this must not read like a
          warning about missing a payment — the customer has done nothing wrong and the copy says
          so. It sits above every other banner because it is the only one with an action that
          resolves it.
        */
        <Banner
          tone="info"
          title={
            data.paymentActionRequired.reason === 'authenticate'
              ? 'Your bank needs you to confirm a payment'
              : 'We need a payment method'
          }
        >
          {data.paymentActionRequired.reason === 'authenticate'
            ? 'There’s nothing wrong with your card — your bank just wants you to approve this one. You’re not late and no fee has been added.'
            : 'We don’t have a card saved for this agreement, so we couldn’t take the payment automatically. You’re not late and no fee has been added.'}
        </Banner>
      ) : data.status === 'grace' || data.status === 'late' ? (
        <Banner tone="warning" title={data.status === 'late' ? 'Payment is late' : 'Payment didn’t go through'}>
          {/*
            §50 closes with "encourage communication before cancellation". Naming the specific
            remedies a seller can grant is what makes that real — a customer who does not know a
            pause exists cannot ask for one.
          */}
          You’re still in good standing. Message the seller: they can give you more time, take a part
          payment, agree a catch-up plan, or pause this.
        </Banner>
      ) : null}

      <Card>
        <OwnLabel>You own</OwnLabel>
        <OwnValue className="tnum">{data.ownershipPercent}%</OwnValue>
        <Bar>
          <Fill style={{ width: `${data.ownershipPercent}%` }} $done={done} />
        </Bar>
        <OwnMeta>
          {formatCents(data.ownershipCreditedCents)} of {formatCents(data.cashPriceCents)} paid toward ownership
        </OwnMeta>
      </Card>

      <Grid>
        <Stat>
          <span>Payments made</span>
          <b className="tnum">{data.installmentsPaid}/{data.installmentCount}</b>
        </Stat>
        <Stat>
          <span>Each payment</span>
          <b className="tnum">{formatCents(data.installmentAmountCents)}</b>
        </Stat>
        <Stat>
          <span>Next due</span>
          <b>{data.nextDueAt ? new Date(data.nextDueAt).toLocaleDateString() : '—'}</b>
        </Stat>
        <Stat>
          <span>Total to own</span>
          <b className="tnum">{formatCents(data.totalToOwnCents)}</b>
        </Stat>
      </Grid>

      {/* Consignment-RTO (R19): how each payment splits across the three parties. */}
      {data.isConsignment && statements.data ? (
        <Splits aria-labelledby="rto-split-heading">
          <SplitHead id="rto-split-heading">Where each payment goes</SplitHead>
          {Object.entries(statements.data.parties).map(([party, p]) => (
            <SplitRow key={party}>
              <span>{PARTY_LABEL[party] ?? party}</span>
              <span className="tnum">{formatCents(p.totalCents)}</span>
            </SplitRow>
          ))}
          <SplitTotal>
            <span>Total collected</span>
            <span className="tnum">{formatCents(statements.data.reconciliation.grossCollectedCents)}</span>
          </SplitTotal>
        </Splits>
      ) : null}

      {/*
        The action that unblocks a stuck payment. Above the payoff block, because someone whose
        instalment could not be taken needs to fix that far more than they need to buy the item out.
      */}
      {data.paymentActionRequired && !done ? (
        <ActionNeeded>
          <div>
            <PayoffLabel>
              {data.paymentActionRequired.reason === 'authenticate'
                ? 'Confirm your payment'
                : 'Add a payment method'}
            </PayoffLabel>
            <PayoffHint>
              Payment #{data.paymentActionRequired.installmentNumber}
              {data.paymentActionRequired.reason === 'no_card'
                ? ' — we’ll save this card so future payments go through on their own.'
                : ' — one tap and it’s done.'}
            </PayoffHint>
          </div>
          {resuming ? (
            <PayoffPay>
              <PaymentSheet
                clientSecret={resuming.clientSecret ?? 'demo'}
                amountCents={resuming.amountCents ?? 0}
                onSuccess={() => {
                  show('Payment received — thank you', 'success');
                  setResuming(null);
                }}
              />
              <CancelPay type="button" onClick={() => setResuming(null)}>
                Not now
              </CancelPay>
            </PayoffPay>
          ) : (
            <Button
              loading={resume.isPending}
              onClick={() =>
                resume.mutate(undefined, {
                  onSuccess: (res) => {
                    // It cleared on its own between the sweep and this tap. Nothing owed.
                    if (res.alreadyPaid || !res.clientSecret) {
                      show('That payment has already gone through', 'success');
                      return;
                    }
                    setResuming(res);
                  },
                  onError: () => show('Couldn’t start that payment. Please try again.', 'danger'),
                })
              }
            >
              <CreditCard size={16} />{' '}
              {data.paymentActionRequired.reason === 'authenticate' ? 'Confirm' : 'Add a card'}
            </Button>
          )}
        </ActionNeeded>
      ) : null}

      {!done ? (
        <Payoff>
          <div>
            <PayoffLabel>Pay off early</PayoffLabel>
            <PayoffHint>Own it today for {formatCents(data.payoffCents)} — no further rental cost.</PayoffHint>
          </div>
          {/*
            ═══ Paying off takes a card. It always should have. ═══

            This button used to POST and toast "Paid off — it's yours!", because the server
            transferred ownership at the moment the charge was OPENED. Nobody was ever asked to pay.
            The mutation now returns a client secret and the sheet below collects it; ownership
            transfers when Stripe's webhook settles that intent, which is why nothing here claims
            the item is theirs.
          */}
          {payingOff ? (
            <PayoffPay>
              <PaymentSheet
                clientSecret={payingOff.clientSecret ?? 'demo'}
                amountCents={payingOff.payoffCents}
                onSuccess={() => {
                  show('Payment received — we’ll confirm your ownership in a moment', 'success');
                  setPayingOff(null);
                }}
              />
              <CancelPay type="button" onClick={() => setPayingOff(null)}>
                Not now
              </CancelPay>
            </PayoffPay>
          ) : (
            <Button
              loading={payoff.isPending}
              onClick={() =>
                payoff.mutate(undefined, {
                  onSuccess: (res) => {
                    /**
                     * Already fully credited — the server had nothing to charge and transferred
                     * ownership outright. The only case where "it's yours" is true on this call.
                     */
                    if (res.completed) {
                      show('Paid off — it’s yours!', 'success');
                      return;
                    }
                    if (!res.clientSecret) {
                      show(
                        'We couldn’t start your payoff payment. Nothing has been charged — please try again.',
                        'warning',
                      );
                      return;
                    }
                    setPayingOff(res);
                  },
                  onError: () => show('Couldn’t start the payoff. Please try again.', 'danger'),
                })
              }
            >
              <CheckCircle2 size={16} /> Pay {formatCents(data.payoffCents)}
            </Button>
          )}
        </Payoff>
      ) : null}
      {/*
        §51 — the voluntary return, and the disclosure that governs it. Shown only when the
        agreement actually offers one: an option the terms never granted is not something to
        advertise and then refuse.
      */}
      {!done && data.status !== 'return_pending' && data.status !== 'cancelled' && returnQuote.data?.allowed ? (
        <ReturnBlock>
          <ReturnHead>
            <PackageOpen size={16} aria-hidden /> Hand it back
          </ReturnHead>
          {/* The server's own words. A client that paraphrases a disclosure can soften one. */}
          <ReturnDisclosure>{returnQuote.data.disclosure}</ReturnDisclosure>
          <Button
            variant="tertiary"
            size="compact"
            loading={requestReturn.isPending}
            onClick={() =>
              requestReturn.mutate(undefined, {
                onSuccess: () => show('Return requested — the seller will be in touch.', 'default'),
                onError: () => show('Couldn’t request a return. Please try again.', 'danger'),
              })
            }
          >
            Request a return
          </Button>
        </ReturnBlock>
      ) : null}
    </TabPage>
  );
}

const Card = styled.div`
  display: grid;
  gap: 8px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const OwnLabel = styled.span`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const OwnValue = styled.b`
  font-size: 44px;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.statusLive};
`;
const Bar = styled.div`
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const Fill = styled.div<{ $done: boolean }>`
  height: 100%;
  background: ${({ theme }) => theme.color.statusLive};
`;
const OwnMeta = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const Stat = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textTertiary};
  }
  b {
    font-size: 18px;
  }
`;
const Splits = styled.section`
  display: grid;
  gap: 6px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const SplitHead = styled.h3`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const SplitRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const SplitTotal = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 800;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const Payoff = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 8%, ${theme.color.surfaceRaised})`};
  border: 1px solid ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 25%, transparent)`};
`;
const PayoffLabel = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const PayoffHint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

/** The card form takes the full width of the payoff card rather than sitting beside the copy. */
const PayoffPay = styled.div`
  flex: 1 1 100%;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const CancelPay = styled.button`
  justify-self: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  text-decoration: underline;
`;

/** Same shape as the payoff block, in the neutral accent — this is a task, not an upsell. */
const ActionNeeded = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.space[4]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;

const ReturnBlock = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  justify-items: start;
  margin-top: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const ReturnHead = styled.h2`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 800;
`;
const ReturnDisclosure = styled.p`
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
`;
