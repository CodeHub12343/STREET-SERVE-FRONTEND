'use client';

/**
 * B-3 — "where is my money?", for a resident whose earnings are held by their shelter.
 *
 * The single most important sentence on this screen is that the money is THEIRS. Custody is a
 * fiduciary arrangement, not a deduction, and someone who has been through the benefits system has
 * every reason to assume otherwise unless told plainly.
 *
 * So: the amount comes first, the collection instructions come second (verbatim from the shelter,
 * because "ask for Dana" beats any generic string we could write), and the ownership statement is
 * not buried in fine print.
 */
import styled from 'styled-components';
import { BadgeCheck, Banknote, MapPin } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { formatCents } from '@/lib/money';
import { useAcknowledgeCustody, useMyCustody } from '../hooks/useShelter';
import type { CustodySource } from '../types';

const SOURCE_LABEL: Record<CustodySource, string> = {
  consignment_settlement: 'Consignment sales',
  sale_payment: 'A card sale',
  job_payout: 'A gig',
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function ResidentWallet() {
  const { data, isLoading, isError } = useMyCustody();
  const ack = useAcknowledgeCustody();

  /**
   * This is embedded on the shared Earnings screen, so all three "nothing to show" cases render
   * NOTHING rather than an empty or error state. An ordinary seller who has never been near a
   * shelter must not see a card explaining custody, and a failed fetch of a section that doesn't
   * apply to them must not push an error onto a screen that is otherwise fine.
   */
  if (isLoading) return null;
  if (isError || !data || data.entries.length === 0) return null;

  const held = data.entries.filter((e) => e.status === 'held');
  const past = data.entries.filter((e) => e.status === 'disbursed');
  const note = held[0]?.collectionNote ?? null;
  const org = data.entries[0]?.organizationName ?? 'your shelter';

  return (
    <Wrap>
      {held.length > 0 ? (
        <Hero>
          <HeroLabel>Ready to collect</HeroLabel>
          <HeroValue className="tnum">{formatCents(data.heldCents)}</HeroValue>
          {/* The sentence that does the most work on this screen. */}
          <HeroNote>
            This is your money. {org} is holding it for you — they can’t keep any of it.
          </HeroNote>
          {note ? (
            <Where>
              <MapPin size={14} aria-hidden />
              {note}
            </Where>
          ) : (
            <Where>
              <MapPin size={14} aria-hidden />
              Ask staff at {org} to hand it over.
            </Where>
          )}
        </Hero>
      ) : null}

      {held.length > 0 ? (
        <>
          <SectionTitle>What’s waiting</SectionTitle>
          <List>
            {held.map((e) => (
              <Row key={e.id}>
                <RowIcon aria-hidden><Banknote size={16} /></RowIcon>
                <RowMain>
                  <RowAmount className="tnum">{formatCents(e.amountCents)}</RowAmount>
                  <RowMeta>
                    {SOURCE_LABEL[e.sourceType]} · {day(e.createdAt)}
                  </RowMeta>
                </RowMain>
              </Row>
            ))}
          </List>
        </>
      ) : null}

      {past.length > 0 ? (
        <>
          <SectionTitle>Already collected</SectionTitle>
          <List>
            {past.map((e) => (
              <Row key={e.id} $muted>
                <RowIcon aria-hidden>
                  <BadgeCheck size={16} />
                </RowIcon>
                <RowMain>
                  <RowAmount className="tnum">{formatCents(e.amountCents)}</RowAmount>
                  <RowMeta>
                    {SOURCE_LABEL[e.sourceType]} ·{' '}
                    {e.disbursedAt ? `handed over ${day(e.disbursedAt)}` : 'handed over'}
                  </RowMeta>
                </RowMain>
                {/* Confirming is the resident closing their own record. Never required to receive
                    money — insisting would strand funds when someone leaves the shelter. */}
                {e.acknowledged ? (
                  <Confirmed>Confirmed</Confirmed>
                ) : (
                  <Button
                    size="compact"
                    variant="secondary"
                    loading={ack.isPending && ack.variables === e.id}
                    onClick={() => ack.mutate(e.id)}
                  >
                    I got this
                  </Button>
                )}
              </Row>
            ))}
          </List>
        </>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Hero = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.statusLive} 12%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)`};
`;
const HeroLabel = styled.span`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const HeroValue = styled.b`
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const HeroNote = styled.p`
  font-size: 13px;
  line-height: 1.5;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const Where = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textPrimary};
  margin: 0;

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  opacity: ${({ $muted }) => ($muted ? 0.72 : 1)};
`;
const RowIcon = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const RowMain = styled.div`
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;
const RowAmount = styled.b`
  font-size: 15px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const RowMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Confirmed = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusLive};
  white-space: nowrap;
`;
