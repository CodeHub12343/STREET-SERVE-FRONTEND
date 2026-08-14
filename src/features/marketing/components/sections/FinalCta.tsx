'use client';

/**
 * Final CTA (Section Breakdown §12) — the commitment moment. LP-1 links into the existing
 * onboarding (/welcome); LP-5 replaces the primary action with the on-page pre-registration
 * wizard. The map-backdrop treatment echoes the hero's static scene language.
 */
import styled from 'styled-components';
import { track } from '../../analytics';
import { finalCta } from '../../content';
import { marketingConfig } from '../../marketing.config';
import { brandGradient, displayXL, eyebrowStyle } from '../../mk';
import { CtaLink } from '../CtaLink';
import { ConversionCta } from '../ConversionCta';
import { Reveal } from '../../motion/Reveal';

export function FinalCta() {

  return (
    <Section id="cta" aria-labelledby="cta-title">
      <Backdrop aria-hidden>
        <Glow />
      </Backdrop>
      <Reveal>
      <Content>
        <Eyebrow>{finalCta.eyebrow}</Eyebrow>
        <Title id="cta-title">{finalCta.title}</Title>
        <Support>{finalCta.support}</Support>
        <Ctas>
          <ConversionCta source="final-cta" $variant="primary">
            {finalCta.ctaPrimary}
          </ConversionCta>
          <CtaLink
            href={marketingConfig.demoHref}
            $variant="secondary"
            onClick={() => track('demo_enter', { source: 'final-cta' })}
          >
            {finalCta.ctaSecondary} ↗
          </CtaLink>
        </Ctas>
        <Footnote>{finalCta.footnote}</Footnote>
      </Content>
      </Reveal>
    </Section>
  );
}

const Section = styled.section`
  position: relative;
  overflow: clip;
  scroll-margin-top: 72px;
  padding: 96px 20px;
  text-align: center;
  background: ${({ theme }) => theme.color.surfaceBase};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(rgba(156,159,168,0.06) 1px, transparent 1px),
         linear-gradient(90deg, rgba(156,159,168,0.06) 1px, transparent 1px)`
      : `linear-gradient(rgba(91,94,104,0.08) 1px, transparent 1px),
         linear-gradient(90deg, rgba(91,94,104,0.08) 1px, transparent 1px)`};
  background-size: 72px 72px;
`;

const Glow = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(720px, 90vw);
  height: 360px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255, 107, 69, 0.12) 0%, transparent 70%);
`;

const Content = styled.div`
  position: relative;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  justify-items: center;
  max-width: 720px;
  margin: 0 auto;
`;

const Eyebrow = styled.p`
  ${eyebrowStyle}
`;

const Title = styled.h2`
  font-size: clamp(32px, 6vw, 56px);
  letter-spacing: -0.03em;
  background: ${({ theme }) => brandGradient(theme)};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Support = styled.p`
  font-size: ${displayXL.lede};
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Ctas = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  max-width: 420px;
  ${({ theme }) => theme.media.sm} {
    flex-direction: row;
    justify-content: center;
    width: auto;
    max-width: none;
  }
`;

const Footnote = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
