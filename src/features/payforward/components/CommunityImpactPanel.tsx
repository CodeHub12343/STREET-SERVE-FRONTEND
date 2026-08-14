'use client';

/**
 * PIF-11 / PIF-9 — the vendor's community-impact panel and fund settings.
 *
 * Every figure comes from the server, which derives them from immutable rows rather than counters
 * (D-9). Nothing is computed here: a drifting "meals given" number published on a shopfront is a
 * credibility problem, not a rounding error.
 *
 * Note what is absent: **who was helped.** The API returns a count, and there is nowhere in this UI
 * to drill into it. Who accepted help is not the vendor's to see or publish.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { Switch } from '@/components/primitives/Switch';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import {
  useCommunityFund,
  useCommunityImpact,
  useRecentContributions,
  useUpdateFundSettings,
} from '../hooks/usePayForward';

/** Matches the backend's allowed set. "Never" is not offered — ADR-005 §6. */
const EXPIRY_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '365', label: '12 months' },
];

export function CommunityImpactPanel({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: fund, isLoading } = useCommunityFund(businessId);
  const { data: impact } = useCommunityImpact(businessId);
  const { data: contributions = [] } = useRecentContributions(businessId);
  const save = useUpdateFundSettings(businessId);

  const [perRedemption, setPerRedemption] = useState('');
  const [percent, setPercent] = useState('');
  const [perDay, setPerDay] = useState('');

  if (isLoading) return <Skeleton $h="200px" $radius={16} />;
  if (!fund) {
    return (
      <EmptyState
        icon="🤝"
        title="Pay It Forward isn’t switched on"
        description="Turn it on from Modules to let customers leave money for the next person who needs it."
      />
    );
  }

  const patch = (body: Parameters<typeof save.mutate>[0]) =>
    save.mutate(body, {
      onSuccess: () => show('Saved', 'success'),
      onError: (e) => show(e instanceof AppApiError ? e.message : 'Could not save', 'danger'),
    });

  const dollarsToCents = (v: string): number | null => {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return v.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
  };

  return (
    <Wrap>
      <Hero>
        <HeroLabel>Available in the fund</HeroLabel>
        <HeroAmount className="tnum">{formatCents(fund.balanceCents)}</HeroAmount>
        <HeroNote>
          Held by StreetServe for your customers. It isn&rsquo;t your money and can&rsquo;t be paid
          out — it can only cover an order here.
        </HeroNote>
      </Hero>

      {impact ? (
        <Stats>
          <Stat>
            <StatValue className="tnum">{formatCents(impact.contributedCents)}</StatValue>
            <StatLabel>given by customers</StatLabel>
          </Stat>
          <Stat>
            <StatValue className="tnum">{formatCents(impact.redeemedCents)}</StatValue>
            <StatLabel>used so far</StatLabel>
          </Stat>
          <Stat>
            <StatValue className="tnum">{impact.peopleHelped}</StatValue>
            <StatLabel>people helped</StatLabel>
          </Stat>
          <Stat>
            <StatValue className="tnum">{impact.contributionCount}</StatValue>
            <StatLabel>gifts</StatLabel>
          </Stat>
          <Stat>
            <StatValue className="tnum">{formatCents(impact.averageContributionCents)}</StatValue>
            <StatLabel>average gift</StatLabel>
          </Stat>
          <Stat>
            <StatValue className="tnum">{formatCents(impact.largestContributionCents)}</StatValue>
            <StatLabel>largest gift</StatLabel>
          </Stat>
        </Stats>
      ) : null}

      <Card>
        <CardTitle>Settings</CardTitle>
        <Switch
          label="Accept new gifts"
          checked={fund.accepting}
          onChange={() => patch({ accepting: !fund.accepting })}
        />
        <Quiet>
          Turning this off stops new gifts. Money already given stays usable — it isn&rsquo;t yours
          to withdraw.
        </Quiet>

        <InlineRow>
          <Input
            label="Most one order can take"
            hint={
              fund.maxPerRedemptionCents
                ? `Currently ${formatCents(fund.maxPerRedemptionCents)}`
                : 'No limit beyond the balance'
            }
            inputMode="decimal"
            placeholder="No limit"
            value={perRedemption}
            onChange={(e) => setPerRedemption(e.target.value)}
          />
          <Button
            size="compact"
            variant="secondary"
            onClick={() => patch({ maxPerRedemptionCents: dollarsToCents(perRedemption) })}
          >
            Save
          </Button>
        </InlineRow>

        <InlineRow>
          <Input
            label="Most of one order it can cover"
            hint={`Currently ${fund.maxPercentOfOrder}%. Below 100% it works like a discount rather than covering the meal.`}
            inputMode="numeric"
            placeholder="100"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
          <Button
            size="compact"
            variant="secondary"
            onClick={() => {
              const n = Number(percent);
              if (Number.isFinite(n) && n >= 1 && n <= 100) patch({ maxPercentOfOrder: n });
            }}
          >
            Save
          </Button>
        </InlineRow>

        <InlineRow>
          <Input
            label="Most the fund can give out in a day"
            hint={
              fund.maxPerDayCents ? `Currently ${formatCents(fund.maxPerDayCents)}` : 'No daily limit'
            }
            inputMode="decimal"
            placeholder="No limit"
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
          />
          <Button
            size="compact"
            variant="secondary"
            onClick={() => patch({ maxPerDayCents: dollarsToCents(perDay) })}
          >
            Save
          </Button>
        </InlineRow>

        <Select
          label="How long a gift stays usable"
          hint="Anything unused after this is passed to community funds at other businesses in this city."
          options={EXPIRY_OPTIONS}
          value={String(fund.expiryDays)}
          onChange={(e) => patch({ expiryDays: Number(e.target.value) })}
        />
        {/* One customer per day, decided by the server. Stated so a vendor isn't surprised by it. */}
        <Quiet>The fund covers at most one order per customer here per day.</Quiet>
      </Card>

      <Card>
        <CardTitle>Recent gifts</CardTitle>
        {contributions.length === 0 ? (
          <Quiet>No gifts yet.</Quiet>
        ) : (
          <List>
            {contributions.map((c) => (
              <Row key={c.id}>
                <b className="tnum">{formatCents(c.amountCents)}</b>
                <span>{c.givenBy ?? 'Anonymous'}</span>
                {c.note ? <Note>&ldquo;{c.note}&rdquo;</Note> : null}
              </Row>
            ))}
          </List>
        )}
      </Card>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 620px;
`;
const Hero = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[1]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 10%, transparent)`};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const HeroLabel = styled.p`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const HeroAmount = styled.p`
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;
const HeroNote = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Stat = styled.div`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const StatValue = styled.p`
  font-size: 18px;
  font-weight: 800;
`;
const StatLabel = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const CardTitle = styled.h3`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Quiet = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const InlineRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const List = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.li`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
    margin-right: ${({ theme }) => theme.space[2]}px;
  }
`;
const Note = styled.span`
  display: block;
  font-style: italic;
  color: ${({ theme }) => theme.color.textTertiary};
`;
