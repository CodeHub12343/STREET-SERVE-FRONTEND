'use client';

/**
 * SponsorshipTiers — landing-page section surfacing the 2027 corporate sponsorship program
 * (client brief, Oct 2026). Five annual packages, $10K → $1M, each with its annual deliverables
 * (shoutouts / videos / postcards) and the key perks.
 *
 * Layout contract (mobile-first):
 *  • <640px — vertical stack, each tier full-width. Featured tier gets an accent border.
 *  • ≥640px — 2-column grid.
 *  • ≥960px — 3-column grid; featured tier spans two columns on the first row so it reads as the
 *    headline tier the client called out, with the other four flowing below.
 *
 * Everything leads to `/sponsor#sponsorships` where the real self-serve rate card and checkout
 * already exist — the landing section is persuasion, not a second checkout.
 */
import Link from 'next/link';
import styled, { css } from 'styled-components';
import { Megaphone, Video, Mail, Check } from 'lucide-react';
import { sponsorshipTiers } from '../../content';
import { Reveal } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
      : String(n);

const price = (n: number) =>
  n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${(n / 1_000).toLocaleString()}K`;

export function SponsorshipTiers() {
  return (
    <SectionShell
      id="sponsorships"
      eyebrow={sponsorshipTiers.eyebrow}
      title={sponsorshipTiers.title}
      support={sponsorshipTiers.support}
      align="center"
    >
      <Reveal>
        <Grid>
          {sponsorshipTiers.tiers.map((t) => {
            const featured = t.slug === sponsorshipTiers.featuredSlug;
            return (
              <Card key={t.slug} $featured={featured}>
                {featured ? <FeaturedTag>Most popular</FeaturedTag> : null}
                <Header>
                  <Kicker>{t.kicker}</Kicker>
                  <Name>{t.name}</Name>
                  <Price className="tnum">
                    {price(t.priceAnnual)}
                    <small>/year</small>
                  </Price>
                  <Summary>{t.summary}</Summary>
                </Header>

                <Stats aria-label="Annual deliverables">
                  <Stat>
                    <StatIcon>
                      <Megaphone size={16} aria-hidden />
                    </StatIcon>
                    <StatValue className="tnum">{compact(t.deliverables.shoutouts)}</StatValue>
                    <StatLabel>shoutouts / yr</StatLabel>
                  </Stat>
                  <Stat>
                    <StatIcon>
                      <Video size={16} aria-hidden />
                    </StatIcon>
                    <StatValue className="tnum">{compact(t.deliverables.videos)}</StatValue>
                    <StatLabel>videos / yr</StatLabel>
                  </Stat>
                  <Stat>
                    <StatIcon>
                      <Mail size={16} aria-hidden />
                    </StatIcon>
                    <StatValue className="tnum">{compact(t.deliverables.postcards)}</StatValue>
                    <StatLabel>postcards / yr</StatLabel>
                  </Stat>
                </Stats>

                <Perks>
                  {t.perks.map((p) => (
                    <li key={p}>
                      <Check size={14} aria-hidden />
                      <span>{p}</span>
                    </li>
                  ))}
                </Perks>

                <CardCta href={sponsorshipTiers.cta.href} $featured={featured}>
                  Choose {t.name} →
                </CardCta>
              </Card>
            );
          })}
        </Grid>

        <Pillars aria-label="Every sponsor also receives">
          {sponsorshipTiers.pillars.map((p) => (
            <Pillar key={p}>
              <Check size={14} aria-hidden />
              <span>{p}</span>
            </Pillar>
          ))}
        </Pillars>

        <Foot>
          <FootNote>{sponsorshipTiers.footnote}</FootNote>
          <PrimaryCta href={sponsorshipTiers.cta.href}>{sponsorshipTiers.cta.label} →</PrimaryCta>
        </Foot>
      </Reveal>
    </SectionShell>
  );
}

/* ─── Layout ─────────────────────────────────────────────────────────────── */

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  grid-template-columns: 1fr;

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, 1fr);
    gap: ${({ theme }) => theme.space[5]}px;

    /*
      Headline tier spans two columns on the first row (left two cells), the next three cards fill
      the remaining spots. The featured card is intentionally the third one in source order
      (Platinum) so this positions it at the start of the grid regardless of DOM order.
    */
    & > :nth-child(3) {
      grid-column: 1 / span 2;
      grid-row: 1;
    }
    & > :nth-child(1) {
      grid-column: 3;
      grid-row: 1;
    }
    & > :nth-child(2) {
      grid-row: 2;
    }
    & > :nth-child(4) {
      grid-row: 2;
    }
    & > :nth-child(5) {
      grid-row: 2;
    }
  }
`;

/* ─── Card ───────────────────────────────────────────────────────────────── */

const Card = styled.article<{ $featured: boolean }>`
  position: relative;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.color.line2};
  }

  ${({ $featured, theme }) =>
    $featured &&
    css`
      border-color: ${theme.color.accentPrimary};
      border-width: 1.5px;
      background: ${theme.color.surfaceRaised2};
      box-shadow: 0 10px 30px -18px ${theme.color.accentPrimary};
    `}
`;

const FeaturedTag = styled.span`
  position: absolute;
  top: -10px;
  left: ${({ theme }) => theme.space[5]}px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const Header = styled.header`
  display: grid;
  gap: 6px;
`;

const Kicker = styled.p`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const Price = styled.p`
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  small {
    font-size: 14px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textSecondary};
    margin-left: 4px;
  }
`;

const Summary = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

/* ─── Stats row (shoutouts / videos / postcards) ─────────────────────────── */

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const Stat = styled.div`
  display: grid;
  justify-items: center;
  gap: 2px;
  text-align: center;
`;

const StatIcon = styled.div`
  color: ${({ theme }) => theme.color.accentPrimary};
`;

const StatValue = styled.p`
  font-size: 18px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.01em;
`;

const StatLabel = styled.p`
  font-size: 11px;
  line-height: 1.3;
  color: ${({ theme }) => theme.color.textTertiary};
`;

/* ─── Perks list ─────────────────────────────────────────────────────────── */

const Perks = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 16px 1fr;
    gap: 8px;
    align-items: start;
    font-size: 13px;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.textSecondary};
  }

  li svg {
    margin-top: 3px;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;

/* ─── CTAs ───────────────────────────────────────────────────────────────── */

const CardCta = styled(Link)<{ $featured: boolean }>`
  margin-top: auto;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 11px 16px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  background: ${({ theme, $featured }) =>
    $featured ? theme.color.accentPrimary : 'transparent'};
  color: ${({ theme, $featured }) => ($featured ? '#fff' : theme.color.accentSecondary)};
  border: 1.5px solid
    ${({ theme, $featured }) => ($featured ? 'transparent' : theme.color.line2)};
  &:hover {
    filter: brightness(1.06);
    border-color: ${({ theme, $featured }) =>
      $featured ? 'transparent' : theme.color.accentPrimary};
  }
`;

/* ─── Shared pillars + footer ────────────────────────────────────────────── */

const Pillars = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 1fr;
  margin: ${({ theme }) => theme.space[6]}px 0 ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  list-style: none;

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Pillar = styled.li`
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 8px;
  align-items: start;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  svg {
    margin-top: 3px;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;

const Foot = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  justify-items: center;
  text-align: center;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;

const FootNote = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
  max-width: 640px;
`;

const PrimaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 12px 22px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  &:hover {
    filter: brightness(1.08);
  }
`;
