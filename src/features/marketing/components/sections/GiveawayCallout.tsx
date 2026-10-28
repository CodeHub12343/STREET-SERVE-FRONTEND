'use client';

/**
 * ═══ 2026-10-28 — Great Ice Cream Giveaway landing callout. ═══
 *
 * Sits between the SponsorshipTiers (ongoing annual packages) and the FAQ so visitors see:
 *   • Annual sponsorship first (steady long-term revenue).
 *   • Then this: "oh, there's also a specific 90-day campaign running right now."
 *
 * The two are different programs with different pricing shapes, so collapsing them would
 * confuse a visitor into thinking the giveaway is a tier of the annual one. The visual tone
 * here (an inviting block with brand accents) is distinct from the SponsorshipTiers cards
 * on purpose.
 */
import Link from 'next/link';
import styled from 'styled-components';
import { ArrowRight, IceCream2, Mail } from 'lucide-react';
import { giveawayCallout } from '../../content';
import { Reveal } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

export function GiveawayCallout() {
  return (
    <SectionShell
      id="giveaway"
      eyebrow={giveawayCallout.eyebrow}
      title={giveawayCallout.title}
      support={giveawayCallout.body}
      align="center"
      raised
    >
      <Reveal>
        <Panel>
          <Head>
            <IconDot>
              <IceCream2 size={20} aria-hidden />
            </IconDot>
          </Head>

          <StatsRow>
            {giveawayCallout.stats.map((s) => (
              <StatCell key={s.label}>
                <StatValue className="tnum">{s.value}</StatValue>
                <StatLabel>{s.label}</StatLabel>
              </StatCell>
            ))}
          </StatsRow>

          <Bullets>
            {giveawayCallout.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </Bullets>

          <CtaRow>
            <Primary href={giveawayCallout.primaryCta.href}>
              {giveawayCallout.primaryCta.label}
              <ArrowRight size={16} aria-hidden />
            </Primary>
            <Secondary href={giveawayCallout.secondaryCta.href}>
              <Mail size={14} aria-hidden /> {giveawayCallout.secondaryCta.label}
            </Secondary>
          </CtaRow>
        </Panel>
      </Reveal>
    </SectionShell>
  );
}

const Panel = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 760px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.accentPrimary} 8%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 30%, ${theme.color.line})`};
`;

const Head = styled.div`
  display: grid;
  justify-items: center;
`;

const IconDot = styled.span`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
`;

const StatsRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  grid-template-columns: repeat(2, 1fr);
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCell = styled.div`
  display: grid;
  gap: 2px;
  text-align: center;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[2]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const StatValue = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const StatLabel = styled.p`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Bullets = styled.ul`
  margin: 0 auto;
  padding-left: 20px;
  display: grid;
  gap: 6px;
  font-size: 15px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textPrimary};
  max-width: 540px;
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;

const Primary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  &:hover {
    filter: brightness(1.05);
  }
`;

const Secondary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textPrimary};
  font-weight: 700;
  font-size: 14px;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
