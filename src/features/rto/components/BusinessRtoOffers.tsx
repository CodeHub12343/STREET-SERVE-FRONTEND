'use client';

/**
 * What this business will let you rent to own, on its profile.
 *
 * You rent to own FROM someone. The offer belongs where the customer is already deciding about that
 * seller — not only inside a separate marketplace they have to think to visit. Same reasoning as
 * putting a live flash sale on the profile rather than leaving it to be discovered at checkout: a
 * capability nobody sees at the moment of deciding may as well not exist.
 *
 * Renders nothing when this seller has no active offers, so a profile gains a section only when
 * there is something in it.
 */
import Link from 'next/link';
import styled from 'styled-components';
import { ChevronRight } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { useRtoListings } from '../hooks/useRto';

export function BusinessRtoOffers({ businessId }: { businessId: string }) {
  const { data } = useRtoListings({ sellerId: businessId });
  const offers = data ?? [];
  if (offers.length === 0) return null;

  return (
    <Section aria-label="Rent to own">
      <Head>Rent to own</Head>
      <Lede>Take it home now and pay in instalments. You own it at the end.</Lede>
      <List>
        {offers.slice(0, 4).map((o) => (
          <Row key={o.id} href={`/rto/offers/${o.id}`}>
            <RowText>
              <Name>{o.productName}</Name>
              {/*
                Only what the listing itself carries.

                The per-instalment amount and the total-to-own are NOT on a listing — they come from
                the server's §44 disclosure, computed per offer from markup, fees and tax. Deriving
                them here would put a second implementation of a money calculation in front of the
                customer, and the two would eventually disagree; the one they were shown is the one
                they would argue they agreed to.

                So this row states the cash price and the plan's shape, and the offer page shows the
                authoritative figures with the full disclosure attached.
              */}
              <Terms>
                <Total>{formatCents(o.cashPriceCents)}</Total> cash · {o.installmentCount}{' '}
                {o.frequency} payments
              </Terms>
            </RowText>
            <ChevronRight size={16} aria-hidden />
          </Row>
        ))}
      </List>
      {offers.length > 4 ? <AllLink href="/rto">See all {offers.length} offers</AllLink> : null}
    </Section>
  );
}

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[5]}px;
`;
const Head = styled.h2`
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Lede = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  min-height: 56px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textTertiary};
`;
const RowText = styled.span`
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;
const Name = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Terms = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Total = styled.b`
  color: ${({ theme }) => theme.color.textPrimary};
`;
const AllLink = styled(Link)`
  justify-self: start;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentPrimary};
`;
