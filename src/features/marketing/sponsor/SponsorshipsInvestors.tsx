'use client';

/**
 * ═══ Sponsorships & Investors — one public page, two audiences. ═══
 *
 * This route used to be sponsor checkout and nothing else, and it sat behind the auth middleware:
 * a would-be sponsor could not so much as read the rate card without an account, which is the
 * wrong way round for the one page whose whole job is convincing someone outside the product to
 * back it. The page is public now; only the payment is guarded (see SponsorCheckout).
 *
 * The two audiences share a page because they share a nav entry, but they are kept visibly apart.
 * A sponsor is buying a priced, self-serve placement. An investor is not buying anything here —
 * there is no instrument on offer, so the only thing this page does for them is start a
 * conversation, and it says so.
 */
import styled from 'styled-components';
import { Megaphone, TrendingUp } from 'lucide-react';
import { sponsorPage } from '../content';
import { marketingConfig } from '../marketing.config';
import { SponsorCheckout } from './SponsorCheckout';

export function SponsorshipsInvestors() {
  return (
    <Page>
      <Header>
        <H1>{sponsorPage.title}</H1>
        <Lede>{sponsorPage.lede}</Lede>
      </Header>

      <Section id="sponsorships" aria-labelledby="sponsorships-title">
        <SectionHead>
          <Badge>
            <Megaphone size={16} aria-hidden />
            {sponsorPage.sponsor.eyebrow}
          </Badge>
          <SectionTitle id="sponsorships-title">{sponsorPage.sponsor.title}</SectionTitle>
          <SectionBody>{sponsorPage.sponsor.body}</SectionBody>
        </SectionHead>
        <SponsorCheckout />
      </Section>

      <Rule />

      <Section id="investors" aria-labelledby="investors-title">
        <SectionHead>
          <Badge>
            <TrendingUp size={16} aria-hidden />
            {sponsorPage.investors.eyebrow}
          </Badge>
          <SectionTitle id="investors-title">{sponsorPage.investors.title}</SectionTitle>
          <SectionBody>{sponsorPage.investors.body}</SectionBody>
        </SectionHead>

        <Points>
          {sponsorPage.investors.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </Points>

        {/*
          A mailto, deliberately — and the only CTA in this section. There is no "invest now"
          button because there is nothing here to buy: quoting a price or a return for an
          instrument that does not exist would be a solicitation, not a landing page.
        */}
        <InvestCta href={sponsorPage.investors.cta.href}>
          {sponsorPage.investors.cta.label} →
        </InvestCta>
        <Disclaimer>{sponsorPage.investors.note}</Disclaimer>
      </Section>

      <Contact>
        Questions about either? Email{' '}
        <a href={`mailto:${marketingConfig.contactEmail}`}>{marketingConfig.contactEmail}</a>.
      </Contact>
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[6]}px;
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Header = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const H1 = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const Lede = styled.p`
  font-size: 16px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  /* Anchored from the nav and the footer, so it must not land under the sticky bar. */
  scroll-margin-top: 80px;
`;

const SectionHead = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
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

const Rule = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  margin: 0;
`;

const Points = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin: 0;
  padding-left: 20px;
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const InvestCta = styled.a`
  justify-self: start;
  padding: 12px 20px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  &:hover {
    filter: brightness(1.08);
  }
`;

const Disclaimer = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Contact = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  a {
    color: ${({ theme }) => theme.color.accentSecondary};
    font-weight: 650;
  }
`;
