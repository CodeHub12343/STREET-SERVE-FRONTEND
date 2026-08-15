'use client';

/**
 * The rent-to-own payment a customer owes next, surfaced where their money lives.
 *
 * ## Why this exists
 *
 * The agreement dashboard (`/rto/[id]`) was reachable only by keeping the URL from the moment the
 * agreement was signed. Nothing listed it, nothing linked to it, and it was absent from the
 * navigation — so a customer with a live rent-to-own agreement had no route back to the screen
 * where they pay it.
 *
 * That is worse than an ordinary missing link. A rent-to-own agreement is a credit-like arrangement
 * with a schedule and consequences for missing an instalment; someone who cannot find the payment
 * screen does not merely have a poor experience, they fall behind on a debt.
 *
 * ## Why it lives in the wallet rather than a menu
 *
 * An active agreement is not a destination to be browsed to, it is an obligation with a date. It
 * should follow the person to where they think about money, and say when the next payment is due
 * without being looked for. A menu entry answers "where is that page"; this answers "what do I owe,
 * and when".
 *
 * Renders nothing at all when there is no live agreement — a wallet must not carry a permanent
 * shape reserved for a product the person does not use.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { formatRelativeMinutes } from '@/lib/format';
import { useRtoAgreements } from '../hooks/useRto';
import type { RtoDashboard, RtoStatus } from '@/types/rto';

/**
 * Statuses where money is still owed.
 *
 * Typed as RtoStatus so an invented status cannot silently match nothing — which is exactly how a
 * card like this ends up never rendering and nobody noticing. `return_pending`, `completed`,
 * `cancelled` and `disputed` are history or in someone else's hands, not an obligation with a date.
 */
const LIVE_STATUSES: RtoStatus[] = ['active', 'grace', 'late', 'arrangement', 'paused'];

/** Soonest due first — the one they need is the one nearest, not the one signed first. */
function nextDue(a: RtoDashboard, b: RtoDashboard): number {
  const at = a.nextDueAt ? Date.parse(a.nextDueAt) : Number.POSITIVE_INFINITY;
  const bt = b.nextDueAt ? Date.parse(b.nextDueAt) : Number.POSITIVE_INFINITY;
  return at - bt;
}

export function RtoObligationCard() {
  const router = useRouter();
  const { data } = useRtoAgreements();

  const live = (data ?? []).filter((a) => LIVE_STATUSES.includes(a.status)).sort(nextDue);
  if (live.length === 0) return null;

  const soonest = live[0]!;
  const overdue = soonest.nextDueAt ? Date.parse(soonest.nextDueAt) < Date.now() : false;

  return (
    <Card $overdue={overdue} onClick={() => router.push(`/rto/${soonest.id}`)}>
      <Head>
        <Icon $overdue={overdue} aria-hidden>
          <CalendarClock size={18} />
        </Icon>
        <HeadText>
          <Kicker>{overdue ? 'Payment overdue' : 'Rent to own'}</Kicker>
          <Title>{soonest.productName}</Title>
        </HeadText>
        <ArrowRight size={16} aria-hidden />
      </Head>

      <Facts>
        <Fact>
          <FactValue className="tnum">{formatCents(soonest.installmentAmountCents)}</FactValue>
          <FactLabel>
            {soonest.nextDueAt
              ? `${overdue ? 'was due' : 'due'} ${formatRelativeMinutes(soonest.nextDueAt)}`
              : 'next payment'}
          </FactLabel>
        </Fact>
        <Fact>
          {/* Ownership, not "payments made" — the question someone in an RTO deal actually has. */}
          <FactValue className="tnum">{Math.round(soonest.ownershipPercent ?? 0)}%</FactValue>
          <FactLabel>yours so far</FactLabel>
        </Fact>
        <Fact>
          <FactValue className="tnum">{soonest.installmentsRemaining ?? 0}</FactValue>
          <FactLabel>payments left</FactLabel>
        </Fact>
      </Facts>

      {/*
        Only when there is more than one. A person with a single agreement does not need to be told
        they have a single agreement.
      */}
      {live.length > 1 ? (
        <More
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push('/rto/agreements');
          }}
        >
          {live.length - 1} other {live.length - 1 === 1 ? 'agreement' : 'agreements'}
        </More>
      ) : null}
    </Card>
  );
}

const Card = styled.div<{ $overdue: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $overdue }) => ($overdue ? theme.color.statusDanger : theme.color.line2)};
  box-shadow: ${({ theme }) => theme.elevation.raised};
  cursor: pointer;
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Icon = styled.span<{ $overdue: boolean }>`
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $overdue }) =>
    $overdue ? theme.color.statusDanger : theme.color.accentSecondary};
`;
const HeadText = styled.span`
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
`;
const Kicker = styled.span`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Title = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Facts = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Fact = styled.div`
  display: grid;
  gap: 1px;
  min-width: 0;
`;
const FactValue = styled.span`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const FactLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const More = styled.button`
  justify-self: start;
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentPrimary};
  cursor: pointer;
`;
