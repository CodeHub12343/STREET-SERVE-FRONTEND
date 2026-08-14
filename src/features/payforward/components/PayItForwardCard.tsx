'use client';

/**
 * PIF-13 — the fund on a business profile.
 *
 * Two audiences read this card and they need opposite things from it. Someone with money to spare
 * needs a way to give; someone who is short needs to know help exists here **without having to ask
 * anyone**. So the balance is stated plainly and the "someone has already paid for part of a meal
 * here" line is written for the second reader, in the second person, with no pity in it.
 *
 * It renders nothing at all when the business has no fund — an empty pot advertised as a feature is
 * a worse experience for both readers than silence.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { HeartHandshake } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { formatCents } from '@/lib/money';
import { useCommunityFund, useRecentContributions } from '../hooks/usePayForward';
/**
 * The give-flow is a whole form, its own mutation, and a sheet — none of which the map's first load
 * has any use for, because it renders only after a deliberate tap. Loading it eagerly put the map
 * route over its bundle budget (260.4 KB against 260 KB), which is precisely what that gate is for.
 */
const ContributeSheet = dynamic(
  () => import('./ContributeSheet').then((m) => m.ContributeSheet),
  { ssr: false },
);

export function PayItForwardCard({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const { data: fund } = useCommunityFund(businessId);
  const { data: contributions = [] } = useRecentContributions(businessId);
  const [open, setOpen] = useState(false);

  // No fund configured, and nothing to give to → the card has nothing to say.
  if (!fund || (!fund.accepting && fund.balanceCents <= 0)) return null;

  const hasMoney = fund.balanceCents > 0;

  return (
    <>
      <Card>
        <Header>
          <Icon aria-hidden>
            <HeartHandshake size={18} />
          </Icon>
          <div>
            <Title>Pay it forward</Title>
            <Sub>Neighbours here help each other eat.</Sub>
          </div>
        </Header>

        {hasMoney ? (
          <Available>
            <Amount className="tnum">{formatCents(fund.balanceCents)}</Amount>
            {/*
              Written for the person who might need it. "Available for anyone" rather than "for
              people in need" — the second sorts customers into deserving and undeserving before
              they have ordered anything.
            */}
            <AvailableNote>
              available for anyone here. If money is tight today, you can use it at checkout — no
              questions, and nobody is told.
            </AvailableNote>
          </Available>
        ) : (
          <Empty>The pot is empty right now. Yours would be the first.</Empty>
        )}

        {contributions.length > 0 ? (
          <Recent>
            {contributions.slice(0, 3).map((c) => (
              <RecentRow key={c.id}>
                <b className="tnum">{formatCents(c.amountCents)}</b>
                <span>from {c.givenBy ?? 'someone in the community'}</span>
                {c.note ? <Note>&ldquo;{c.note}&rdquo;</Note> : null}
              </RecentRow>
            ))}
          </Recent>
        ) : null}

        {fund.accepting ? (
          <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
            Give to the fund
          </Button>
        ) : (
          <Empty>This business has paused new gifts for now.</Empty>
        )}
      </Card>

      {open ? (
        <ContributeSheet
          businessId={businessId}
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
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 14%, transparent)`};
  color: ${({ theme }) => theme.color.statusDiscount};
`;
const Title = styled.h3`
  font-size: 15px;
  font-weight: 800;
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Available = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[1]}px;
`;
const Amount = styled.p`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;
const AvailableNote = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Empty = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Recent = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const RecentRow = styled.li`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Note = styled.span`
  display: block;
  font-style: italic;
  color: ${({ theme }) => theme.color.textTertiary};
`;
