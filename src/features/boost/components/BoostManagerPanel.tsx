'use client';

/**
 * The vendor's campaign panel — create one, watch it, cover a shortfall, schedule the mailing.
 *
 * Two facts are stated rather than hidden, because a vendor who discovers either of them late feels
 * misled:
 *
 *  • **The money isn't theirs until the campaign funds.** It sits in escrow and goes back to the
 *    contributors if the goal is missed. There is no withdraw button, and there never will be.
 *  • **A missed goal refunds everyone automatically.** Not "we may be able to refund" — it happens,
 *    on the deadline, without anyone asking.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import {
  useCampaignContributions,
  useCancelCampaign,
  useConfirmMailDate,
  useCreateCampaign,
  useCurrentCampaign,
  useTopUpCampaign,
} from '../hooks/useBoost';

/** Server caps this at 60. There is no "no deadline" option — ADR-006 §2. */
const DEADLINE_OPTIONS = [
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '45', label: '45 days' },
  { value: '60', label: '60 days' },
];

const MAILING_COPY: Record<string, string> = {
  preparing: 'Preparing your artwork and mailing list',
  printing: 'At the printer',
  mailed: 'Handed to the postal service',
};

export function BoostManagerPanel({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: campaign, isLoading } = useCurrentCampaign(businessId);
  const { data: contributions = [] } = useCampaignContributions(campaign?.id);
  const create = useCreateCampaign(businessId);
  const topUp = useTopUpCampaign(campaign?.id ?? '', businessId);
  const confirmDate = useConfirmMailDate(campaign?.id ?? '', businessId);
  const cancel = useCancelCampaign(campaign?.id ?? '', businessId);

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [days, setDays] = useState('30');
  const [mailDate, setMailDate] = useState('');

  const fail = (e: unknown) =>
    show(e instanceof AppApiError ? e.message : 'Something went wrong', 'danger');

  if (isLoading) return <Skeleton $h="220px" $radius={16} />;

  /**
   * The create form shows when there is nothing live. An `expired` or `cancelled` campaign is
   * finished business — the vendor's next action is starting another one, not staring at the old.
   * A `funded` campaign is very much live, so it falls through to the panel below.
   */
  if (!campaign || campaign.status === 'expired' || campaign.status === 'cancelled') {
    const goalCents = Math.round(Number(goal.replace(/[^0-9.]/g, '')) * 100);
    const valid = title.trim().length >= 3 && Number.isFinite(goalCents) && goalCents >= 10_000;
    return (
      <Wrap>
        <EmptyState
          icon="📣"
          title="Start a marketing campaign"
          description="Ask your customers to help fund a postcard drop in your neighbourhood. If it doesn’t reach the goal, everyone is refunded automatically — you’re never left owing anyone."
        />
        <Card>
          <Input
            label="What is it for?"
            placeholder="Postcards for the neighbourhood"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Input
            label="Goal"
            hint="At least $100. Below that a mailing isn’t worth printing."
            inputMode="decimal"
            placeholder="1000.00"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <Select
            label="How long to raise it"
            hint="Campaigns always have an end date, so contributors are never left waiting."
            options={DEADLINE_OPTIONS}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <Button
            disabled={!valid}
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { title: title.trim(), goalCents, deadlineDays: Number(days) },
                { onSuccess: () => show('Campaign started', 'success'), onError: fail },
              )
            }
          >
            Start campaign
          </Button>
        </Card>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Hero>
        <HeroLabel>Raised so far</HeroLabel>
        <HeroAmount className="tnum">{formatCents(campaign.raisedCents)}</HeroAmount>
        <Track
          role="progressbar"
          aria-valuenow={campaign.percentFunded}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${campaign.percentFunded}% funded`}
        >
          <Fill style={{ width: `${campaign.percentFunded}%` }} />
        </Track>
        <HeroNote>
          {formatCents(campaign.remainingCents)} to go, by{' '}
          {new Date(campaign.deadlineAt).toLocaleDateString()}. This money is held for your
          contributors — it isn&rsquo;t yours until the campaign funds, and it can&rsquo;t be paid
          out to you.
        </HeroNote>
      </Hero>

      {campaign.status === 'open' ? (
        <Card>
          <CardTitle>Cover the rest yourself</CardTitle>
          <Quiet>
            You can make up the shortfall of {formatCents(campaign.remainingCents)} and the campaign
            goes ahead. Only before the deadline — after it, everyone has already been refunded.
          </Quiet>
          <Button
            variant="secondary"
            loading={topUp.isPending}
            onClick={() =>
              topUp.mutate(undefined, {
                onSuccess: () => show('Shortfall covered', 'success'),
                onError: fail,
              })
            }
          >
            Pay {formatCents(campaign.remainingCents)}
          </Button>
        </Card>
      ) : null}

      {campaign.status === 'funded' ? (
        <Card>
          <CardTitle>Mailing</CardTitle>
          {campaign.mailingStatus ? (
            <Quiet>{MAILING_COPY[campaign.mailingStatus] ?? campaign.mailingStatus}</Quiet>
          ) : (
            <>
              <Quiet>Pick when you&rsquo;d like the postcards to go out.</Quiet>
              <Input
                label="Mailing date"
                type="date"
                value={mailDate}
                onChange={(e) => setMailDate(e.target.value)}
              />
              <Button
                disabled={!mailDate}
                loading={confirmDate.isPending}
                onClick={() =>
                  confirmDate.mutate(new Date(mailDate).toISOString(), {
                    onSuccess: () => show('Mailing date confirmed', 'success'),
                    onError: fail,
                  })
                }
              >
                Confirm date
              </Button>
            </>
          )}
          {/*
            D-12 — the pipeline stops at "handed to the postal service". We don't claim delivery we
            cannot see, so there is no "Delivered" step to wait for here.
          */}
          <Quiet>
            We&rsquo;ll tell you when it&rsquo;s printed and handed to the postal service. Delivery
            confirmation isn&rsquo;t something the printer reports, so we don&rsquo;t claim it.
          </Quiet>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Who has chipped in</CardTitle>
        {contributions.length === 0 ? (
          <Quiet>Nobody yet. Share your campaign with your regulars.</Quiet>
        ) : (
          <List>
            {contributions.map((c) => (
              <Row key={c.id}>
                <b className="tnum">{formatCents(c.amountCents)}</b>
                <span>{c.givenBy ?? 'Anonymous'}</span>
              </Row>
            ))}
          </List>
        )}
      </Card>

      {campaign.status === 'open' ? (
        <Card>
          <CardTitle>Call it off</CardTitle>
          <Quiet>
            Everyone who chipped in is refunded in full, straight away — including anyone who asked
            to roll their money into a future campaign.
          </Quiet>
          <Button
            variant="tertiary"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(undefined, {
                onSuccess: (r) =>
                  show(`Campaign cancelled — ${r.refunded} contributor(s) refunded`, 'success'),
                onError: fail,
              })
            }
          >
            Cancel campaign
          </Button>
        </Card>
      ) : null}
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
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 10%, transparent)`};
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
