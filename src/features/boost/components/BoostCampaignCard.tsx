'use client';

/**
 * MB-1/MB-2 — the campaign on a business profile.
 *
 * Progress is the whole message here, so it is the most prominent thing: raised, goal, remaining,
 * and how long is left. Two rules shape the copy:
 *
 *  • **No urgency theatre.** No countdown timer, no "only 3 days left!!", no pressure language. The
 *    deadline is a date because a contributor deciding under manufactured pressure is a contributor
 *    who asks for their money back.
 *  • **The refund promise is on the card, not only in the sheet.** Someone who never taps through
 *    should still know the downside is covered — it is the single most reassuring fact about the
 *    whole mechanic, and burying it one screen deeper wastes it.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { formatCents } from '@/lib/money';
import { useCurrentCampaign, useCampaignContributions } from '../hooks/useBoost';
/** Same reasoning as Pay It Forward's: a tap-to-open form does not belong in the map's first load. */
const ContributeToCampaignSheet = dynamic(
  () => import('./ContributeToCampaignSheet').then((m) => m.ContributeToCampaignSheet),
  { ssr: false },
);

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function BoostCampaignCard({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const { data: campaign } = useCurrentCampaign(businessId);
  const { data: contributions = [] } = useCampaignContributions(campaign?.id);
  const [open, setOpen] = useState(false);

  // No live campaign → nothing to say. A dormant "no campaign running" heading is noise.
  if (!campaign || campaign.status !== 'open') return null;

  const left = daysLeft(campaign.deadlineAt);

  return (
    <>
      <Card>
        <Header>
          <Icon aria-hidden>
            <Megaphone size={18} />
          </Icon>
          <div>
            <Title>{campaign.title}</Title>
            <Sub>Help {businessName} reach more people nearby.</Sub>
          </div>
        </Header>

        <Numbers>
          <Raised className="tnum">{formatCents(campaign.raisedCents)}</Raised>
          <Goal>of {formatCents(campaign.goalCents)}</Goal>
        </Numbers>

        <Track
          role="progressbar"
          aria-valuenow={campaign.percentFunded}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${campaign.percentFunded}% funded`}
        >
          <Fill style={{ width: `${campaign.percentFunded}%` }} />
        </Track>

        <Meta>
          <span className="tnum">{formatCents(campaign.remainingCents)} to go</span>
          {/* A date and a plain count, not a ticking clock. */}
          <span>{left === 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left`}</span>
        </Meta>

        {/* The reassurance, on the card rather than one screen deeper. */}
        <RefundPromise>
          If it doesn&rsquo;t reach the goal, everyone is refunded in full, automatically.
        </RefundPromise>

        {/*
          ADR-006 §6 — the service fee must be disclosed on the campaign page BEFORE anyone gives,
          and the contribution sheet's fine print promises a fee "shown on the campaign page".
          `serviceFeeCents` is 0 until the campaign funds, so the rate is what carries the
          disclosure at the moment it actually matters. Rendered only when a fee is charged, so a
          zero-rated campaign says nothing rather than "a 0% fee".
        */}
        {campaign.serviceFeeBps > 0 ? (
          <RefundPromise>
            If it funds, a {campaign.serviceFeeBps / 100}% service fee comes out of the total
            raised. Nothing is taken from your contribution.
          </RefundPromise>
        ) : null}

        {contributions.length > 0 ? (
          <Recent>
            {contributions.slice(0, 3).map((c) => (
              <RecentRow key={c.id}>
                <b className="tnum">{formatCents(c.amountCents)}</b>
                <span>from {c.givenBy ?? 'someone nearby'}</span>
              </RecentRow>
            ))}
          </Recent>
        ) : null}

        <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
          Chip in
        </Button>
      </Card>

      {open ? (
        <ContributeToCampaignSheet
          campaign={campaign}
          businessName={businessName}
          open
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 14%, transparent)`};
  color: ${({ theme }) => theme.color.accentPrimary};
`;
const Title = styled.h3`
  font-size: 15px;
  font-weight: 800;
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Numbers = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Raised = styled.span`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;
const Goal = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Track = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const Fill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accentPrimary};
`;
const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
/**
 * NOT `Promise`.
 *
 * A styled-component named `Promise` shadows the global for the WHOLE module — `const` is hoisted
 * into the temporal dead zone, so it applies from line 1, not from its declaration. Next's compiled
 * `dynamic()` loader at the top of this file calls `Promise.resolve(...)`, which resolved to this
 * React component and threw "Promise.resolve is not a function" — 167 lines from the cause, with a
 * name that reads like the built-in. Never shadow a global here.
 */
const RefundPromise = styled.p`
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Recent = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[1]}px;
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const RecentRow = styled.li`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
    margin-right: ${({ theme }) => theme.space[2]}px;
  }
`;
