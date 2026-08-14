'use client';

/**
 * F-2 / F-4 — the seller-facing membership screen.
 *
 * Every pre-existing plan sold to a BUSINESS. The platform's largest population — individual
 * consignment sellers — had nothing to buy and nothing to gain by paying, which is the gap this
 * closes.
 *
 * Two rules govern the copy here, and both are enforced by tests:
 *
 *  1. **Perks are stated as the numbers that will actually be applied.** "Carry more" is marketing;
 *     "1.5× your stock limit" is a promise the checkout guard keeps.
 *  2. **Stock Protection is never described as insurance.** It is a waiver of what the platform
 *     would otherwise collect from the seller. Using the words "insurance", "policy", "premium" or
 *     "claim" would make it a regulated product we are not licensed to sell — so those words appear
 *     nowhere on this screen, and a test asserts it.
 */
import styled from 'styled-components';
import { Check, PackageCheck, ShieldCheck, TrendingDown } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import { useWaiverStatus } from '../hooks/useWaiver';

interface Perk {
  icon: React.ReactNode;
  label: string;
}

const PLUS_PERKS: Perk[] = [
  { icon: <PackageCheck size={15} aria-hidden />, label: '1.5× your stock limit' },
  { icon: <TrendingDown size={15} aria-hidden />, label: '15% off our fee on every sale' },
  { icon: <Check size={15} aria-hidden />, label: 'First look at new stock, 12 hours early' },
];

export function SellerMembership() {
  const { data: waiver, isLoading } = useWaiverStatus();

  return (
    <TabPage title="Membership">
      <Lede>
        Optional, and priced to pay for itself in an afternoon. Everything you need to earn stays
        free — these just make it go further.
      </Lede>

      <Card>
        <CardHead>
          <div>
            <PlanName>Seller Plus</PlanName>
            <PlanPrice className="tnum">{formatCents(499)}/month</PlanPrice>
          </div>
        </CardHead>
        <Perks>
          {PLUS_PERKS.map((p) => (
            <Perk key={p.label}>
              <PerkIcon>{p.icon}</PerkIcon>
              {p.label}
            </Perk>
          ))}
        </Perks>
        {/* Said plainly: the discount is ours to give, not taken from the hub. */}
        <FineNote>
          The fee discount comes out of StreetServe&rsquo;s cut — the hub still gets its full share.
        </FineNote>
        <Button fullWidth>Add Seller Plus</Button>
      </Card>

      <Card>
        <CardHead>
          <div>
            <PlanName>
              <ShieldCheck size={15} aria-hidden /> Stock Protection
            </PlanName>
            <PlanPrice className="tnum">{formatCents(299)}/month</PlanPrice>
          </div>
        </CardHead>

        {isLoading ? (
          <Skeleton $h="60px" $radius={12} />
        ) : waiver?.active ? (
          <Banner tone="success" title="Cover is on">
            Up to {formatCents(waiver.perIncidentCapCents)} written off per incident.{' '}
            {formatCents(waiver.remainingThisPeriodCents)} of your{' '}
            {formatCents(waiver.periodCapCents)} left this {waiver.periodDays} days.
          </Banner>
        ) : waiver?.waiting ? (
          <Banner tone="info" title="Cover starts soon">
            {waiver.reason}
          </Banner>
        ) : null}

        <Perks>
          <Perk>
            <PerkIcon>
              <Check size={15} aria-hidden />
            </PerkIcon>
            If stock is lost or damaged, we write off what you&rsquo;d owe us — up to{' '}
            {formatCents(waiver?.perIncidentCapCents ?? 15_000)} each time
          </Perk>
          <Perk>
            <PerkIcon>
              <Check size={15} aria-hidden />
            </PerkIcon>
            Damaged stock is covered at half its value
          </Perk>
        </Perks>

        {/*
          The honest description, in the seller's language. This is what we won't collect — not a
          payout, not cover for anything beyond what you'd owe StreetServe.
        */}
        {/*
          Stated positively and without the vocabulary of insurance. An earlier draft read "this
          isn't a policy" — a negation, but naming the thing invites exactly the association the
          product must not carry. Say what it IS instead.
        */}
        <FineNote>
          We don&rsquo;t pay you money — it means we don&rsquo;t charge you for stock that goes
          wrong, up to your limit. There&rsquo;s a short wait before new cover starts.
        </FineNote>
        {!waiver?.active && !waiver?.waiting ? (
          <Button fullWidth variant="secondary">
            Add Stock Protection
          </Button>
        ) : null}
      </Card>
    </TabPage>
  );
}

const Lede = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0 0 ${({ theme }) => theme.space[4]}px;
`;
const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const PlanName = styled.b`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const PlanPrice = styled.span`
  display: block;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Perks = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin: 0;
  padding: 0;
  list-style: none;
`;
const Perk = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const PerkIcon = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  margin-top: 1px;
  color: ${({ theme }) => theme.color.statusLive};
`;
const FineNote = styled.p`
  font-size: 11px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
