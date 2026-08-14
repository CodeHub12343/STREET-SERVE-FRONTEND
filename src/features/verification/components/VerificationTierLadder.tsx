'use client';

/**
 * Verification tier ladder (C-36, AUTHENTICATION_AND_AUTHORIZATION.md §2 Layer 3). Shows the
 * Bronze→Gold progression: completed tiers checked, the current tier highlighted, higher tiers
 * locked — each with what it unlocks + its payout timing. Verification is presented as unlocking
 * capability, never as a gate/dead-end (docs/06 §1).
 */
import styled from 'styled-components';
import { Check, Lock } from 'lucide-react';
import type { VerificationTier } from '@/types';

const TIERS: { tier: VerificationTier; label: string; unlocks: string; payout: string }[] = [
  { tier: 'tier0', label: 'Browse', unlocks: 'View inventory and businesses', payout: '—' },
  { tier: 'bronze', label: 'Bronze', unlocks: 'Gov ID + selfie → low-value checkout', payout: 'Payout held 3 days' },
  { tier: 'silver', label: 'Silver', unlocks: 'Bank linked → standard limits', payout: 'Next business day' },
  { tier: 'gold', label: 'Gold', unlocks: 'Sustained trust → premium inventory, higher split', payout: 'Instant payout' },
];

const ORDER: VerificationTier[] = ['tier0', 'bronze', 'silver', 'gold'];

export function VerificationTierLadder({ current }: { current: VerificationTier }) {
  const currentIdx = ORDER.indexOf(current);
  return (
    <Ladder>
      {TIERS.map((t, i) => {
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'locked';
        return (
          <Rung key={t.tier} $state={state}>
            <Node $state={state} aria-hidden>
              {state === 'done' ? <Check size={14} /> : state === 'locked' ? <Lock size={13} /> : t.label[0]}
            </Node>
            <Body>
              <TierLabel>
                {t.label}
                {state === 'current' ? <Now>You’re here</Now> : null}
              </TierLabel>
              <Unlocks>{t.unlocks}</Unlocks>
              <Payout>{t.payout}</Payout>
            </Body>
          </Rung>
        );
      })}
    </Ladder>
  );
}

type S = 'done' | 'current' | 'locked';

const Ladder = styled.ol`
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Rung = styled.li<{ $state: S }>`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $state }) => ($state === 'current' ? theme.color.statusDiscount : theme.color.line)};
  opacity: ${({ $state }) => ($state === 'locked' ? 0.6 : 1)};
`;
const Node = styled.span<{ $state: S }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
  font-weight: 800;
  font-size: 12px;
  color: ${({ theme, $state }) => ($state === 'locked' ? theme.color.textTertiary : '#fff')};
  background: ${({ theme, $state }) =>
    $state === 'done'
      ? theme.color.statusLive
      : $state === 'current'
        ? theme.color.statusDiscount
        : theme.color.surfaceRaised2};
`;
const Body = styled.div`
  display: grid;
  gap: 2px;
`;
const TierLabel = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
`;
const Now = styled.span`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme }) => theme.color.statusDiscount};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 16%, transparent)`};
`;
const Unlocks = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Payout = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
