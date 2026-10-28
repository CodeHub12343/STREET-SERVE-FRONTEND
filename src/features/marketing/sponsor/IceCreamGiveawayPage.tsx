'use client';

/**
 * ═══ The Great Ice Cream Giveaway — sponsor landing page. ═══
 *
 * A separate program from the long-running platform sponsorship (see SponsorshipsInvestors.tsx):
 * one-time 90-day packages, different tier names, a different benefit mix (shout-outs, promotional
 * videos, postcards, event recognition), and a public roster filtered to this program's sponsors.
 * Shares the SponsorCheckout component — only the rate card and the comparison matrix differ.
 *
 * What this page is not: a payment page for people who don't yet have an account. The checkout
 * guard (see SponsorCheckout) sends them to sign-up with a return path. The rate card is
 * readable without an account on purpose; a sponsor has to be able to see what a package costs
 * before deciding whether to make an account.
 */
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { IceCream2, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { formatCents } from '@/lib/money';
import { giveawayProgram } from '../content';
import { SponsorCheckout } from './SponsorCheckout';

interface PublicSponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  tier: string;
  program: string;
  utmCode: string;
}

export function IceCreamGiveawayPage() {
  /**
   * The public roster for this program. Platform sponsors are deliberately excluded by passing
   * the program filter — a $3K Silver giveaway sponsor and a long-running $999/mo platform
   * sponsor should not appear in each other's rosters.
   */
  const { data: sponsors, isLoading } = useQuery<PublicSponsor[]>({
    queryKey: ['sponsors', 'public', giveawayProgram.slug],
    queryFn: () =>
      api.get<PublicSponsor[]>(`${endpoints.sponsors}?program=${giveawayProgram.slug}`),
    staleTime: 60_000,
  });

  const { packages, comparison, hero, roster, disclaimer, contact } = giveawayProgram;

  return (
    <Page>
      <Hero>
        <Badge>
          <IceCream2 size={16} aria-hidden />
          {hero.eyebrow}
        </Badge>
        <H1>{hero.h1}</H1>
        <Lede>{hero.body}</Lede>
        <HeroBullets>
          {hero.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </HeroBullets>
        <AimNote>{hero.aim}</AimNote>
      </Hero>

      <Section id="packages" aria-labelledby="packages-title">
        <SectionHead>
          <SectionBadge>Packages at a glance</SectionBadge>
          <SectionTitle id="packages-title">Four ways to back the giveaway.</SectionTitle>
          <SectionBody>
            Every package runs 90 days. The server re-derives every price when you pay, so the
            amount on your receipt matches the figure on this page down to the cent.
          </SectionBody>
        </SectionHead>

        <PackageGrid>
          {packages.map((pkg) => (
            <PackageCard key={pkg.slug}>
              <PkgHead>
                <PkgTier>{pkg.name}</PkgTier>
                <PkgPrice className="tnum">
                  {formatCents(pkg.priceCents)}
                  <PkgTerm>/ 90 days</PkgTerm>
                </PkgPrice>
              </PkgHead>
              <PkgKicker>{pkg.kicker}</PkgKicker>
              <PkgPitch>{pkg.pitch}</PkgPitch>

              <PkgLines>
                {pkg.lines.map((line) => (
                  <li key={line.label}>
                    <span>{line.label}</span>
                    <span className="tnum">{formatCents(line.valueCents)}</span>
                  </li>
                ))}
                <li className="total">
                  <span>Proposed rate-card value</span>
                  <span className="tnum">{formatCents(pkg.rateCardCents)}</span>
                </li>
              </PkgLines>

              {'note' in pkg && pkg.note ? <PkgNote>{pkg.note}</PkgNote> : null}

              {'contactOnly' in pkg && pkg.contactOnly ? (
                /*
                  Diamond is a conversation, not a purchase. The anchor replaces what would be a
                  Buy button on the self-serve tiers; the checkout below (which fetches only
                  self-serve tiers from the server) never offers Diamond as a selectable option.
                */
                <PkgContactCta href={pkg.contactCta.href}>
                  {pkg.contactCta.label} →
                </PkgContactCta>
              ) : null}
            </PackageCard>
          ))}
        </PackageGrid>
      </Section>

      <Section id="comparison" aria-labelledby="comparison-title">
        <SectionHead>
          <SectionBadge>Side-by-side</SectionBadge>
          <SectionTitle id="comparison-title">Complete sponsorship comparison.</SectionTitle>
        </SectionHead>

        {/*
          Overflow-x only — a comparison table at phone width has to scroll horizontally rather
          than wrapping, because wrapping breaks the row-to-tier alignment that lets a reader
          follow a benefit across packages.
        */}
        <TableScroll>
          <ComparisonTable>
            <thead>
              <tr>
                <th scope="col" aria-label="Benefit" />
                {comparison.columnNames.map((name) => (
                  <th scope="col" key={name}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((v, i) => (
                    <td key={`${row.label}-${i}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </ComparisonTable>
        </TableScroll>
      </Section>

      <Section id="checkout" aria-labelledby="checkout-title">
        <SectionHead>
          <SectionBadge>Become a sponsor</SectionBadge>
          <SectionTitle id="checkout-title">Choose a package.</SectionTitle>
          <SectionBody>
            One payment, one 90-day campaign, no auto-renewal. Every logo is checked by a person
            before it goes live; if we can&apos;t run it, you&apos;re refunded in full.
          </SectionBody>
        </SectionHead>
        <SponsorCheckout program="ice_cream_giveaway" returnTo="/sponsor/ice-cream-giveaway" />
      </Section>

      <Section id="roster" aria-labelledby="roster-title">
        <SectionHead>
          <SectionBadge>{roster.eyebrow}</SectionBadge>
          <SectionTitle id="roster-title">{roster.title}</SectionTitle>
        </SectionHead>

        {isLoading ? (
          <Skeleton $h="120px" $radius={16} />
        ) : (sponsors?.length ?? 0) > 0 ? (
          <Roster>
            {sponsors!.map((s) => (
              <RosterCard key={s.id}>
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public sponsor assets are external URLs
                  <img src={s.logoUrl} alt={`${s.name} logo`} loading="lazy" />
                ) : (
                  <RosterLockup>{s.name}</RosterLockup>
                )}
              </RosterCard>
            ))}
          </Roster>
        ) : (
          <EmptyRoster>{roster.empty}</EmptyRoster>
        )}
      </Section>

      <Reassure>
        <ShieldCheck size={16} aria-hidden />
        <span>{disclaimer}</span>
      </Reassure>

      <Contact>
        {contact.label}{' '}
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
        {contact.phone ? <> &middot; {contact.phone}</> : null}.
      </Contact>
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[6]}px;
  max-width: 960px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Hero = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const Badge = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  padding: 5px 12px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const H1 = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const Lede = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const HeroBullets = styled.ul`
  margin: ${({ theme }) => theme.space[3]}px 0 0;
  padding-left: 20px;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const AimNote = styled.p`
  margin-top: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  scroll-margin-top: 80px;
`;

const SectionHead = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const SectionBadge = styled(Badge).attrs({ as: 'span' })``;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const SectionBody = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const PackageGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const PackageCard = styled.article`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const PkgHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const PkgTier = styled.p`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const PkgPrice = styled.p`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const PkgTerm = styled.small`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-left: 4px;
`;

const PkgKicker = styled.p`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentPrimary};
`;

const PkgPitch = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const PkgLines = styled.ul`
  margin: ${({ theme }) => theme.space[2]}px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 13.5px;
  li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space[3]}px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  li.total {
    margin-top: ${({ theme }) => theme.space[2]}px;
    padding-top: ${({ theme }) => theme.space[2]}px;
    border-top: 1px dashed ${({ theme }) => theme.color.line2};
    color: ${({ theme }) => theme.color.textPrimary};
    font-weight: 700;
  }
`;

const PkgNote = styled.p`
  margin-top: ${({ theme }) => theme.space[2]}px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const PkgContactCta = styled.a`
  margin-top: ${({ theme }) => theme.space[3]}px;
  display: inline-flex;
  justify-content: center;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  &:hover {
    filter: brightness(1.05);
  }
`;

const TableScroll = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const ComparisonTable = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 13.5px;
  th,
  td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    white-space: nowrap;
  }
  thead th {
    position: sticky;
    top: 0;
    background: ${({ theme }) => theme.color.surfaceRaised};
    font-weight: 800;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  tbody th {
    font-weight: 650;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  tbody td {
    color: ${({ theme }) => theme.color.textPrimary};
  }
  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const Roster = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.space[3]}px;
`;

const RosterCard = styled.div`
  display: grid;
  place-items: center;
  min-height: 80px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  img {
    max-width: 100%;
    max-height: 56px;
    object-fit: contain;
  }
`;

const RosterLockup = styled.span`
  font-weight: 800;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const EmptyRoster = styled.p`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
  line-height: 1.55;
`;

const Reassure = styled.p`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
  svg {
    flex: none;
    margin-top: 1px;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;

const Contact = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
  a {
    color: ${({ theme }) => theme.color.accentPrimary};
    text-decoration: underline;
  }
`;
