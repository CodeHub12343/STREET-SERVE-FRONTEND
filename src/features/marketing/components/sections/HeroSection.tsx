'use client';

/**
 * Hero (LANDING_PAGE_HERO_SPECIFICATION.md) — poster-first: the static scene panel below is the
 * designed T3/reduced-motion fallback AND the loading poster; HeroMapLayer lazily mounts the live
 * Mapbox scene (LP-2) on intent and cross-fades over it with zero layout shift.
 */
import { useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { m, useReducedMotion } from 'motion/react';
import { track } from '../../analytics';
import { CtaLink } from '../CtaLink';
import { ConversionCta } from '../ConversionCta';
import { HeroMapLayer } from '../hero/HeroMapLayer';
import { hero } from '../../content';
import { marketingConfig } from '../../marketing.config';
import { brandGradient, displayXL, eyebrowStyle, glass } from '../../mk';

const pins = [
  { top: '22%', left: '58%', status: 'driving', label: 'Tacos El Rey — driving' },
  { top: '48%', left: '78%', status: 'parked', label: 'Bloom Mobile Beauty — parked' },
  { top: '66%', left: '52%', status: 'driving', label: 'Shine Squad Detailing — driving' },
  { top: '34%', left: '86%', status: 'parked', label: 'Modesto Coffee Cart — parked' },
  { top: '76%', left: '82%', status: 'away', label: 'Sunrise Snacks — away' },
] as const;

/** Entrance step (animation spec §3): fade + rise on load; opacity-only ≤100ms under reduced motion. */
function useEntrance() {
  const reduced = useReducedMotion() ?? false;
  return (delay: number, rise: number, duration: number) =>
    reduced
      ? {
          // y snaps to 0 instantly: the hydration render (reduced unknown) may have applied the
          // rise offset via `initial`, and an animate target without y would leave it stuck.
          initial: { opacity: 0 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.1 },
        }
      : {
          initial: { opacity: 0, y: rise },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration, ease: [0.2, 0, 0, 1] as const },
        };
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);

  const enter = useEntrance();
  return (
    <Section id="hero" aria-labelledby="hero-title" ref={sectionRef}>
      <MapScene role="region" aria-label={hero.mapAlt}>
        <SceneArt aria-hidden>
          <Grid />
          <Glow $x="62%" $y="40%" />
          <Glow $x="82%" $y="70%" $small />
          {pins.map((p) => (
            <Pin key={p.label} style={{ top: p.top, left: p.left }} $status={p.status}>
              <PinDot $status={p.status} />
            </Pin>
          ))}
          <RouteLine viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M58 24 C 66 38, 60 52, 53 64" />
          </RouteLine>
        </SceneArt>
        <HeroMapLayer heroRef={sectionRef} />
        <SimChip aria-hidden>{hero.simChip}</SimChip>
      </MapScene>

      <Scrim aria-hidden />

      <Content id="hero-content">
        <m.div {...enter(0.1, 8, 0.4)}>
          <Eyebrow>
            <LiveDot aria-hidden />
            {hero.eyebrow}
          </Eyebrow>
        </m.div>
        {/* H1 animates as one block — no per-word/letter splitting (spec §3). */}
        <m.div {...enter(0.18, 16, 0.6)}>
          <Title id="hero-title">
            {hero.h1Lead} <Accent>{hero.h1Accent}</Accent>
          </Title>
        </m.div>
        <m.div {...enter(0.32, 12, 0.5)}>
          <Support>{hero.support}</Support>
        </m.div>
        <m.div {...enter(0.46, 12, 0.5)}>
          <Ctas>
            <ConversionCta source="hero" $variant="primary">
              {hero.ctaPrimary}
            </ConversionCta>
            <CtaLink
              href={marketingConfig.demoHref}
              $variant="secondary"
              onClick={() => track('demo_enter', { source: 'hero' })}
            >
              {hero.ctaSecondary} ↗
            </CtaLink>
          </Ctas>
        </m.div>
        <m.div {...enter(0.6, 0, 0.4)}>
          <TrustLine>{hero.trustLine}</TrustLine>
        </m.div>
      </Content>
    </Section>
  );
}

const Section = styled.section`
  position: relative;
  display: grid;
  overflow: clip;
  min-height: 640px;
  background: ${({ theme }) => theme.color.surfaceBase};
  /* Mobile: content stacks above the map panel (Responsive guide §3). */
  grid-template-rows: auto minmax(320px, 55svh);
  ${({ theme }) => theme.media.md} {
    grid-template-rows: none;
    min-height: min(100svh, 1000px);
    align-items: center;
  }
`;

const MapScene = styled.div`
  position: relative;
  order: 2;
  margin: 0 16px 16px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'radial-gradient(120% 90% at 70% 20%, #171B26 0%, #101218 55%, #0E0F12 100%)'
      : 'radial-gradient(120% 90% at 70% 20%, #EEF1F6 0%, #F6F6F4 55%, #FAFAF9 100%)'};
  overflow: hidden;
  ${({ theme }) => theme.media.md} {
    position: absolute;
    inset: 0;
    order: 0;
    margin: 0;
    border: none;
    border-radius: 0;
  }
`;

const SceneArt = styled.div`
  position: absolute;
  inset: 0;
`;

/* Faint street grid — sells "map" instantly, costs nothing. */
const Grid = styled.div`
  position: absolute;
  inset: 0;
  background-image: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(rgba(156,159,168,0.07) 1px, transparent 1px),
         linear-gradient(90deg, rgba(156,159,168,0.07) 1px, transparent 1px)`
      : `linear-gradient(rgba(91,94,104,0.09) 1px, transparent 1px),
         linear-gradient(90deg, rgba(91,94,104,0.09) 1px, transparent 1px)`};
  background-size: 72px 72px;
  transform: perspective(900px) rotateX(28deg) scale(1.35);
  transform-origin: 50% 0%;
`;

const Glow = styled.div<{ $x: string; $y: string; $small?: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  width: ${({ $small }) => ($small ? 180 : 320)}px;
  height: ${({ $small }) => ($small ? 180 : 320)}px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 107, 69, 0.14) 0%, transparent 70%);
`;

const Pin = styled.div<{ $status: 'driving' | 'parked' | 'away' }>`
  position: absolute;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 3px solid ${({ theme, $status }) => theme.status($status)};
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  opacity: ${({ $status }) => ($status === 'away' ? 0.55 : 1)};
`;

const PinDot = styled.div<{ $status: 'driving' | 'parked' | 'away' }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ theme, $status }) => theme.status($status)};
`;

const RouteLine = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  path {
    fill: none;
    stroke: ${({ theme }) => theme.color.statusLive};
    stroke-width: 0.6;
    stroke-dasharray: 2 2;
    opacity: 0.7;
  }
`;

const SimChip = styled.span`
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 12px;
  font-weight: 650;
  color: ${({ theme }) => theme.color.textSecondary};
  ${({ theme }) => glass(theme)}
`;

/* Desktop-only left scrim guaranteeing text contrast over any map region (Hero spec §2). */
const Scrim = styled.div`
  display: none;
  ${({ theme }) => theme.media.md} {
    display: block;
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'linear-gradient(90deg, rgba(14,15,18,0.92) 0%, rgba(14,15,18,0.6) 45%, transparent 75%)'
        : 'linear-gradient(90deg, rgba(250,250,249,0.94) 0%, rgba(250,250,249,0.65) 45%, transparent 75%)'};
  }
`;

const Content = styled.div`
  position: relative;
  order: 1;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[6]}px 20px ${({ theme }) => theme.space[5]}px;
  ${({ theme }) => theme.media.md} {
    order: 0;
    max-width: 640px;
    padding: ${({ theme }) => theme.space[8]}px 32px;
    margin-left: max(0px, calc((100vw - 1200px) / 2));
  }
`;

const Eyebrow = styled.p`
  ${eyebrowStyle}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 7px 14px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  border-radius: ${({ theme }) => theme.radius.pill}px;
`;

const livePulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
`;

const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.statusLive};
  /* 2s loop (spec §3); collapses under the global reduced-motion rule. */
  animation: ${livePulse} 2s ${({ theme }) => theme.motion.easeOut} infinite;
`;

const Title = styled.h1`
  font-size: ${displayXL.h1};
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.03;
`;

const Accent = styled.span`
  background: ${({ theme }) => brandGradient(theme)};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Support = styled.p`
  font-size: ${displayXL.lede};
  color: ${({ theme }) => theme.color.textSecondary};
  max-width: 52ch;
`;

const Ctas = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]}px;
  ${({ theme }) => theme.media.sm} {
    flex-direction: row;
  }
`;

const TrustLine = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
