'use client';

/**
 * 7.2 / 7.3 / 7.4 — the customer's rewards hub: stamp cards, earned rewards, wish list, referrals.
 *
 * One screen rather than four, because from the customer's side they are one idea — *things the app
 * is holding for me.* Four half-empty screens in the navigation is how a feature gets ignored.
 *
 * Ordering is by what a person can act on right now: an earned reward is a thing to spend today, a
 * stamp card is progress, a wish list is a maybe, and a referral code is a favour to ask. Descending
 * immediacy, which is why rewards lead.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Gift, Heart, Stamp, Users } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Banner } from '@/components/feedback/Banner';
import {
  useClaimReferral,
  useLoyaltyCards,
  useLoyaltyRewards,
  useReferralCode,
  useReferrals,
  useRemoveFromWishlist,
  useWishlist,
} from '../hooks/useRewards';

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[6]}px;
`;
const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 15px;
  font-weight: 800;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Code = styled.p`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 22px;
  letter-spacing: 0.14em;
  font-weight: 800;
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Pips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[1]}px;
`;
const Pip = styled.span<{ $filled: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 2px solid
    ${({ theme, $filled }) => ($filled ? theme.color.accentPrimary : theme.color.line2)};
  background: ${({ theme, $filled }) => ($filled ? theme.color.accentPrimary : 'transparent')};
`;
const CodeInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme }) => theme.color.textPrimary};
  text-transform: uppercase;
`;

export function RewardsHub() {
  const rewards = useLoyaltyRewards();
  const cards = useLoyaltyCards();
  const wishlist = useWishlist();
  const referrals = useReferrals();
  const removeWish = useRemoveFromWishlist();
  const getCode = useReferralCode();
  const claim = useClaimReferral();
  const [claimCode, setClaimCode] = useState('');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  if (rewards.isLoading || cards.isLoading || wishlist.isLoading) {
    return (
      <TabPage title="Rewards" backHref="/profile" backLabel="Back to profile">
        <Skeleton $h="120px" $radius={16} />
      </TabPage>
    );
  }

  const earned = rewards.data ?? [];
  const stampCards = cards.data ?? [];
  const wishes = wishlist.data ?? [];
  const credits = referrals.data?.credits ?? [];

  return (
    <TabPage title="Rewards" backHref="/profile" backLabel="Back to profile">
      {/* Earned rewards lead: the only thing here that can be spent today. */}
      <Section>
        <SectionTitle>
          <Gift size={18} aria-hidden /> Ready to use
        </SectionTitle>
        {earned.length === 0 ? (
          <EmptyState
            icon={<Gift size={28} aria-hidden />}
            title="No rewards yet"
            description="Fill a stamp card and your reward appears here with a code to read out at the counter."
          />
        ) : (
          earned.map((reward) => (
            <Card key={reward.id}>
              <strong>{reward.description}</strong>
              <Code>{reward.code}</Code>
              <Muted>Read this code out at the counter. It can only be used once.</Muted>
            </Card>
          ))
        )}
      </Section>

      <Section>
        <SectionTitle>
          <Stamp size={18} aria-hidden /> Stamp cards
        </SectionTitle>
        {stampCards.length === 0 ? (
          <EmptyState
            icon={<Stamp size={28} aria-hidden />}
            title="No cards yet"
            description="Order from a business that runs a stamp card and yours starts automatically."
          />
        ) : (
          stampCards.map((card) => (
            <Card key={card.businessId}>
              <Row>
                <strong>{card.rewardDescription ?? 'Stamp card'}</strong>
                <span>
                  {card.stamps}/{card.stampsRequired ?? '—'}
                </span>
              </Row>
              {card.stampsRequired ? (
                <Pips
                  role="img"
                  aria-label={`${card.stamps} of ${card.stampsRequired} stamps collected`}
                >
                  {Array.from({ length: card.stampsRequired }, (_, i) => (
                    <Pip key={i} $filled={i < card.stamps} aria-hidden />
                  ))}
                </Pips>
              ) : null}
              {/* A card whose programme ended is history, not progress — say so rather than
                  showing a bar that can never fill. */}
              <Muted>
                {card.active
                  ? 'One stamp per completed order.'
                  : 'This business is no longer running a stamp card.'}
              </Muted>
            </Card>
          ))
        )}
      </Section>

      <Section>
        <SectionTitle>
          <Heart size={18} aria-hidden /> Wish list
        </SectionTitle>
        {wishes.length === 0 ? (
          <EmptyState
            icon={<Heart size={28} aria-hidden />}
            title="Nothing on your list"
            description="Add anything that's sold out and we'll tell you once when it's back."
          />
        ) : (
          wishes.map((wish) => (
            <Card key={wish.id}>
              <Row>
                <div>
                  <strong>{wish.label}</strong>
                  <Muted>
                    {wish.notified
                      ? 'Back in stock — add it again to be told next time.'
                      : "We'll tell you once when this is available again."}
                  </Muted>
                </div>
                <Button
                  variant="tertiary"
                  onClick={() => removeWish.mutate(wish.id)}
                  aria-label={`Remove ${wish.label} from your wish list`}
                >
                  Remove
                </Button>
              </Row>
            </Card>
          ))
        )}
      </Section>

      <Section>
        <SectionTitle>
          <Users size={18} aria-hidden /> Refer a friend
        </SectionTitle>
        <Card>
          {credits.length > 0 ? (
            <Muted>
              You’ve earned {credits.length} referral reward{credits.length === 1 ? '' : 's'}.
            </Muted>
          ) : null}
          <Button onClick={() => getCode.mutate()} disabled={getCode.isPending}>
            {getCode.data ? `Your code: ${getCode.data.code}` : 'Get my referral code'}
          </Button>
          {/* Said BEFORE they share it, not after their friend signs up and nothing happens. */}
          <Muted>
            Your friend uses your code, then completes their first order. You both get a reward at
            that point — not at sign-up.
          </Muted>
        </Card>

        <Card>
          <Row>
            <CodeInput
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="Have a code?"
              aria-label="Referral code"
            />
            <Button
              variant="secondary"
              disabled={claimCode.length < 4 || claim.isPending}
              onClick={() =>
                claim.mutate(claimCode, {
                  onSuccess: (result) => {
                    setClaimMessage(result.message);
                    setClaimCode('');
                  },
                  onError: (err) =>
                    setClaimMessage(err instanceof Error ? err.message : 'That code did not work.'),
                })
              }
            >
              Use code
            </Button>
          </Row>
          {claimMessage ? <Banner tone="info">{claimMessage}</Banner> : null}
        </Card>
      </Section>
    </TabPage>
  );
}
