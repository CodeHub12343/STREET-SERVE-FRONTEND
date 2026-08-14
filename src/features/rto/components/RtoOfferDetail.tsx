'use client';

/**
 * §44 disclosure + §47 acceptance — the screen a customer reads before signing a rent-to-own
 * agreement (roadmap 2.8/2.9).
 *
 * The whole design is governed by one rule from §44: **the customer must see the full cost before
 * accepting.** So:
 *
 *  - The §47 sentence ("may cost more than buying outright") is the FIRST thing after the price,
 *    styled as a warning rather than fine print, and rendered from the server's own string. A
 *    disclosure the client paraphrases is a disclosure the client can soften.
 *  - Total-to-own and the delta over the cash price are given equal weight to the instalment. A
 *    screen that leads with "$25/week" and buries "$1,300 total" is technically compliant and
 *    practically deceptive.
 *  - The obligations (§44's maintenance/damage/return/cancellation terms) are listed in full, not
 *    behind a "see terms" link.
 *  - The Accept button is disabled until the agreement has actually been read and ticked.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { AlertTriangle, Check, FileText, Loader2 } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { AppApiError } from '@/lib/api/errors';
import { useAgreement } from '@/features/vendor/hooks/useAgreement';
import { useAcceptRtoListing, useRtoListing } from '../hooks/useRto';

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'a day',
  weekly: 'a week',
  biweekly: 'every 2 weeks',
  twice_monthly: 'twice a month',
  monthly: 'a month',
  custom: 'per payment',
};

export function RtoOfferDetail({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data, isLoading, isError, refetch } = useRtoListing(id);
  const agreement = useAgreement('rto');
  const accept = useAcceptRtoListing();
  const [read, setRead] = useState(false);

  if (isLoading) {
    return (
      <TabPage title="Rent to own" backHref="/rto" backLabel="Back to offers">
        <Skeleton $h="320px" $radius={16} />
      </TabPage>
    );
  }
  if (isError || !data) {
    return (
      <TabPage title="Rent to own" backHref="/rto" backLabel="Back to offers">
        <ErrorState title="Couldn’t load this offer" onRetry={() => void refetch()} />
      </TabPage>
    );
  }

  const { listing } = data;
  const per = FREQUENCY_LABEL[listing.frequency] ?? 'per payment';

  const submit = () =>
    accept.mutate(
      { listingId: id },
      {
        onSuccess: (created) => {
          show('Agreement accepted', 'success');
          router.replace(`/rto/${created.id}`);
        },
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not accept the agreement', 'danger'),
      },
    );

  return (
    <TabPage title={listing.productName} backHref="/rto" backLabel="Back to offers">
      <Price>
        <Instalment className="tnum">
          {formatCents(data.installmentAmountCents)}
          <Per> {per}</Per>
        </Instalment>
        <Sub>
          {data.installmentCount} payments
          {data.initialPaymentCents > 0 ? ` after ${formatCents(data.initialPaymentCents)} up front` : ''}
        </Sub>
      </Price>

      {/*
        §47. Immediately after the price, before anything else — the one number a rent-to-own
        customer most needs and is least often shown.
      */}
      <CostWarning role="note">
        <AlertTriangle size={18} aria-hidden />
        <div>
          <b className="tnum">{formatCents(data.totalToOwnCents)} total to own</b>
          <p>{data.disclosure}</p>
        </div>
      </CostWarning>

      <Facts aria-label="What this costs">
        <Fact>
          <dt>Cash price today</dt>
          <dd className="tnum">{formatCents(data.cashPriceCents)}</dd>
        </Fact>
        <Fact>
          <dt>Extra you pay to spread it</dt>
          <dd className="tnum">{formatCents(data.costOverCashCents)}</dd>
        </Fact>
        <Fact>
          <dt>Grace period</dt>
          <dd>{data.graceDays} days</dd>
        </Fact>
        {data.setupFeeCents > 0 ? (
          <Fact>
            <dt>Set-up fee</dt>
            <dd className="tnum">{formatCents(data.setupFeeCents)}</dd>
          </Fact>
        ) : null}
        {data.lateFeeCents > 0 ? (
          <Fact>
            <dt>Late fee</dt>
            <dd className="tnum">{formatCents(data.lateFeeCents)}</dd>
          </Fact>
        ) : null}
      </Facts>

      {listing.description ? <Description>{listing.description}</Description> : null}

      <Section>
        <H2>What you’re agreeing to</H2>
        {/* §44's obligations in full. Not behind a link — a term you have to go looking for is a
            term you were not shown. */}
        <Obligations>
          {data.obligations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </Obligations>
      </Section>

      <Section>
        <H2>
          <FileText size={15} aria-hidden /> {agreement.data?.title ?? 'Rent-to-Own Agreement'}
        </H2>
        {agreement.isLoading ? (
          <Skeleton $h="120px" $radius={12} />
        ) : (
          <AgreementBody>{agreement.data?.body}</AgreementBody>
        )}
        <Tick>
          <input
            type="checkbox"
            checked={read}
            onChange={(e) => setRead(e.target.checked)}
            aria-describedby="rto-accept-help"
          />
          <span>
            I’ve read the agreement and I understand this will cost{' '}
            <b className="tnum">{formatCents(data.totalToOwnCents)}</b> in total.
          </span>
        </Tick>
        <Help id="rto-accept-help">
          Your first payment is taken now. You can pay it off early at any time.
        </Help>
      </Section>

      <Button fullWidth disabled={!read || accept.isPending} onClick={submit}>
        {accept.isPending ? (
          <>
            <Loader2 size={16} aria-hidden /> Accepting…
          </>
        ) : (
          <>
            <Check size={16} aria-hidden /> Accept and start paying
          </>
        )}
      </Button>
    </TabPage>
  );
}

const Price = styled.div`
  display: grid;
  gap: 2px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Instalment = styled.p`
  font-size: 32px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Per = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const CostWarning = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid ${({ theme }) => theme.color.statusWarning};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.statusWarning};
    margin-top: 1px;
  }
  b {
    display: block;
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 2px;
  }
  p {
    font-size: 13px;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;

const Facts = styled.dl`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Fact = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 13px;
  dt {
    color: ${({ theme }) => theme.color.textSecondary};
  }
  dd {
    font-weight: 700;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const Description = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[5]}px;
`;
const H2 = styled.h2`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 800;
`;
const Obligations = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding-left: 18px;
  li {
    font-size: 13px;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.textSecondary};
    list-style: disc;
  }
`;
const AgreementBody = styled.pre`
  max-height: 220px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-family: inherit;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Tick = styled.label`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textPrimary};
  cursor: pointer;
  input {
    margin-top: 2px;
    width: 18px;
    height: 18px;
    flex: none;
  }
`;
const Help = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
