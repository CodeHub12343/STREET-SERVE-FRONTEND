'use client';

/**
 * A-01 Ops Overview — the admin command centre.
 *
 * ## What was wrong with the grid
 *
 * Eight tiles of equal size, equal weight and equal colour. "GMV today" and "Fraud flags" looked
 * identical, so the screen answered "what are the numbers?" when the only question an operator
 * opens it with is **"is anything wrong, and where do I go?"**. Everything else is context.
 *
 * ## The shape now
 *
 * One vertical triage stream, ordered by what it costs to ignore:
 *
 *   1. VERDICT     — one line: is anything waiting for a person?
 *   2. ATTENTION   — only the queues that are non-zero, as actions
 *   3. LIVE        — what is happening right now
 *   4. TRADE       — today's numbers, against yesterday
 *   5. ACTIVITY    — the audit trail, newest first
 *
 * ## Two decisions worth defending
 *
 * **Zero is not a card.** A queue with nothing in it is collapsed into the verdict line rather than
 * rendered as "0 — All clear". Four cards saying nothing is happening occupy the most valuable
 * space on the screen to convey no information, and they train an operator to skim past exactly the
 * region that matters on the day something IS wrong.
 *
 * **No invented composite score.** A "health score: 98" implies a measurement nobody took. The
 * verdict states the real counts it is derived from, so it can be checked and cannot drift away
 * from the thing it claims to summarise.
 *
 * There are no sparklines here because the API serves no time series. A drawn line with no data
 * behind it is a decoration that reads as evidence.
 */
import { useRouter } from 'next/navigation';
import styled, { css } from 'styled-components';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Flag,
  Radio,
  Receipt,
  Scale,
  ShieldCheck,
  Store,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatCents } from '@/lib/money';
import { formatRelativeMinutes } from '@/lib/format';
import { useAdminOverview } from '../hooks/useAdmin';

/** Audit actions rendered in the operator's words, not the event bus's. */
const ACTION_COPY: Record<string, string> = {
  'dispute.opened': 'Dispute opened',
  'dispute.resolved': 'Dispute resolved',
  'subscription.lapsed': 'Subscription lapsed',
  'subscription.started': 'Subscription started',
  'subscription.canceled': 'Subscription cancelled',
  'rto.seller_approved': 'Seller approved for Rent-to-Own',
  'rto.seller_revoked': 'Rent-to-Own approval revoked',
  'user.suspended': 'User suspended',
  'payout.failed': 'Payout failed',
};

/** Falls back to a readable form of the raw action rather than hiding an event we have no copy for. */
function actionLabel(action: string): string {
  return ACTION_COPY[action] ?? action.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Percentage change, or null when yesterday was zero.
 *
 * Growth from nothing is not a percentage — "+∞%" and "+100%" are both lies about a first sale. The
 * UI shows the comparison only when it is meaningful and says "first today" otherwise.
 */
function pctChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export function OpsOverview() {
  const router = useRouter();
  const { data: o, isLoading } = useAdminOverview();

  if (isLoading || !o) {
    return (
      <Stack>
        <Skeleton $h="92px" $radius={18} />
        <Skeleton $h="120px" $radius={18} />
        <Skeleton $h="140px" $radius={18} />
      </Stack>
    );
  }

  /**
   * The queues that need a person. Built as a list and then filtered, so the section's existence and
   * its ordering come from the same source — a queue cannot appear in one and not the other.
   *
   * Ordered by consequence: money being taken wrongly, then a person blocked from trading, then
   * onboarding. Fraud outranks disputes because a fraud flag can still be prevented.
   */
  const attention = [
    {
      key: 'fraud',
      icon: <Flag size={18} />,
      count: o.fraudFlags,
      label: 'Fraud flags',
      sub: 'Money may be moving wrongly',
      href: '/admin/fraud',
      severity: 'critical' as const,
    },
    {
      key: 'disputes',
      icon: <Scale size={18} />,
      count: o.openDisputes,
      label: 'Open disputes',
      sub: 'A customer is waiting on a decision',
      href: '/admin/disputes',
      severity: 'critical' as const,
    },
    {
      key: 'licenses',
      icon: <BadgeCheck size={18} />,
      count: o.pendingLicenses,
      label: 'Pending licences',
      sub: 'A seller cannot trade until reviewed',
      href: '/admin/categories',
      severity: 'important' as const,
    },
    {
      key: 'verification',
      icon: <ShieldCheck size={18} />,
      count: o.pendingVerifications ?? 0,
      label: 'Pending verification',
      sub: 'Identity checks awaiting review',
      href: '/admin/users',
      severity: 'important' as const,
    },
  ].filter((a) => a.count > 0);

  const critical = attention.filter((a) => a.severity === 'critical').reduce((n, a) => n + a.count, 0);
  const waiting = attention.reduce((n, a) => n + a.count, 0);

  const gmvChange = pctChange(o.gmvTodayCents, o.previous?.gmvCents ?? 0);
  const ordersChange = pctChange(o.ordersToday, o.previous?.orders ?? 0);
  const signupsChange = pctChange(o.newSignups, o.previous?.newSignups ?? 0);

  return (
    <Stack>
      {/*
        The verdict. One sentence answering the question the operator actually arrived with, and it
        states its own evidence — a summary that cannot be checked is a summary that will eventually
        be wrong without anyone noticing.
      */}
      <Verdict $tone={critical > 0 ? 'critical' : waiting > 0 ? 'attention' : 'clear'}>
        <VerdictIcon>
          {critical > 0 ? <AlertTriangle size={20} /> : waiting > 0 ? <Scale size={20} /> : <ShieldCheck size={20} />}
        </VerdictIcon>
        <div>
          <VerdictHead>
            {critical > 0
              ? `${critical} ${critical === 1 ? 'item needs' : 'items need'} attention now`
              : waiting > 0
                ? `${waiting} ${waiting === 1 ? 'item' : 'items'} waiting for review`
                : 'Nothing is waiting'}
          </VerdictHead>
          <VerdictSub>
            {waiting > 0
              ? attention.map((a) => `${a.count} ${a.label.toLowerCase()}`).join(' · ')
              : 'No fraud flags, disputes, licences or verifications open.'}
          </VerdictSub>
        </div>
      </Verdict>

      {/*
        Only the non-empty queues, and each is an ACTION rather than a statistic: the count is the
        reason to tap, not the content. An empty section renders nothing at all — the verdict above
        has already said so, in one line instead of four cards.
      */}
      {attention.length > 0 ? (
        <Section>
          <SectionHead>Needs a person</SectionHead>
          <Actions>
            {attention.map((a) => (
              <Action key={a.key} $severity={a.severity} onClick={() => router.push(a.href)}>
                <ActionIcon $severity={a.severity}>{a.icon}</ActionIcon>
                <ActionText>
                  <ActionLabel>
                    <ActionCount>{a.count}</ActionCount> {a.label}
                  </ActionLabel>
                  <ActionSub>{a.sub}</ActionSub>
                </ActionText>
                <ArrowRight size={16} aria-hidden />
              </Action>
            ))}
          </Actions>
        </Section>
      ) : null}

      {/* Right now — point-in-time counts, deliberately without trend arrows. */}
      <Section>
        <SectionHead>Right now</SectionHead>
        <LiveRow>
          <Live>
            <LiveDot aria-hidden />
            <LiveValue>{o.liveSessions}</LiveValue>
            <LiveLabel>
              <Radio size={13} aria-hidden /> Live sessions
            </LiveLabel>
          </Live>
          <Live>
            <LiveValue>{o.activeVendors}</LiveValue>
            <LiveLabel>
              <Store size={13} aria-hidden /> Active vendors
            </LiveLabel>
          </Live>
        </LiveRow>
      </Section>

      {/* Today's trade, each against the SAME window yesterday. */}
      <Section>
        <SectionHead>Today so far</SectionHead>
        <Trade>
          <TradeRow $lead>
            <TradeLabel>Gross merchandise value</TradeLabel>
            <TradeValue>
              {formatCents(o.gmvTodayCents)}
              <Delta $change={gmvChange} />
            </TradeValue>
          </TradeRow>
          <TradeRow>
            <TradeLabel>
              <Receipt size={14} aria-hidden /> Orders
            </TradeLabel>
            <TradeValue>
              {o.ordersToday}
              <Delta $change={ordersChange} />
            </TradeValue>
          </TradeRow>
          <TradeRow>
            <TradeLabel>
              <UserPlus size={14} aria-hidden /> New sign-ups
            </TradeLabel>
            <TradeValue>
              {o.newSignups}
              <Delta $change={signupsChange} />
            </TradeValue>
          </TradeRow>
          <TradeFoot>Compared with the same time yesterday</TradeFoot>
        </Trade>
      </Section>

      {/* The audit trail. Real rows, so this is the same record an investigator would read. */}
      {(o.activity ?? []).length > 0 ? (
        <Section>
          <SectionHead>
            Recent activity
            <SeeAll type="button" onClick={() => router.push('/admin/audit')}>
              All <ChevronRight size={14} aria-hidden />
            </SeeAll>
          </SectionHead>
          <Feed>
            {(o.activity ?? []).slice(0, 6).map((e, i) => (
              <FeedRow key={`${e.action}-${e.at}-${i}`}>
                <FeedDot aria-hidden />
                <FeedText>
                  <FeedAction>{actionLabel(e.action)}</FeedAction>
                  <FeedMeta>
                    {e.entityType ?? 'system'} · {formatRelativeMinutes(e.at)}
                  </FeedMeta>
                </FeedText>
              </FeedRow>
            ))}
          </Feed>
        </Section>
      ) : null}
    </Stack>
  );
}

/** Trend chip. Renders nothing when there is no comparable yesterday — see `pctChange`. */
function Delta({ $change }: { $change: number | null }) {
  if ($change === null) return <DeltaNeutral>first today</DeltaNeutral>;
  if ($change === 0) return <DeltaNeutral>level</DeltaNeutral>;
  const up = $change > 0;
  return (
    <DeltaChip $up={up}>
      {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
      {up ? '+' : ''}
      {$change}%
    </DeltaChip>
  );
}

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  min-width: 0;
`;
const SectionHead = styled.h2`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const SeeAll = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  color: ${({ theme }) => theme.color.accentPrimary};
  cursor: pointer;
`;

const Verdict = styled.div<{ $tone: 'critical' | 'attention' | 'clear' }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid;
  ${({ theme, $tone }) =>
    $tone === 'critical'
      ? css`
          background: ${theme.color.surfaceRaised};
          border-color: ${theme.color.statusDanger};
        `
      : $tone === 'attention'
        ? css`
            background: ${theme.color.surfaceRaised};
            border-color: ${theme.color.statusWarning};
          `
        : css`
            background: ${theme.color.surfaceRaised};
            border-color: ${theme.color.line2};
          `}
`;
const VerdictIcon = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
`;
const VerdictHead = styled.p`
  font-size: 17px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const VerdictSub = styled.p`
  margin-top: 2px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Action = styled.button<{ $severity: 'critical' | 'important' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  /* 56px keeps every row a comfortable thumb target on the smallest supported phone. */
  min-height: 56px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $severity }) =>
      $severity === 'critical' ? theme.color.statusDanger : theme.color.line2};
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.color.textTertiary};
  transition: transform ${({ theme }) => theme.motion.micro}ms;
  &:active {
    transform: scale(0.99);
  }
`;
const ActionIcon = styled.span<{ $severity: 'critical' | 'important' }>`
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $severity }) =>
    $severity === 'critical' ? theme.color.statusDanger : theme.color.statusWarning};
`;
const ActionText = styled.span`
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
`;
const ActionLabel = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ActionCount = styled.span`
  font-variant-numeric: tabular-nums;
`;
const ActionSub = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const LiveRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Live = styled.div`
  position: relative;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
/** The one animated element on the screen, and it means "this number is live". */
const LiveDot = styled.span`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.statusLive};
  @media (prefers-reduced-motion: no-preference) {
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
`;
const LiveValue = styled.p`
  font-size: 26px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const LiveLabel = styled.p`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Trade = styled.div`
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const TradeRow = styled.div<{ $lead?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme, $lead }) => ($lead ? theme.space[2] : theme.space[2])}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  &:last-of-type {
    border-bottom: none;
  }
`;
const TradeLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const TradeValue = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const TradeFoot = styled.p`
  padding-top: ${({ theme }) => theme.space[2]}px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const DeltaChip = styled.span<{ $up: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme, $up }) => ($up ? theme.color.statusLive : theme.color.statusWarning)};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const DeltaNeutral = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Feed = styled.ol`
  display: grid;
  gap: 0;
  padding: 0 ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  list-style: none;
`;
const FeedRow = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  &:last-child {
    border-bottom: none;
  }
`;
const FeedDot = styled.span`
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.line2};
`;
const FeedText = styled.span`
  display: grid;
  gap: 1px;
  min-width: 0;
`;
const FeedAction = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const FeedMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
