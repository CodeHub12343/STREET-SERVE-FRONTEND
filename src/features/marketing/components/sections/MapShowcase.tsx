'use client';

/**
 * Real-time map showcase (animation spec §4) — LP-4. Desktop with motion: a 300vh scroll track
 * pins the scene panel; scroll progress activates 4 beats (snap-complete — a beat entered past
 * its activation point animates to completion, never scrubs). Caption rail dims/brightens and
 * scrolling back reverses activation. Fallback (<768px or reduced motion): a swipeable
 * scroll-snap carousel of static beat renders. SSR renders the carousel (also the no-JS state).
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useReducedMotion } from 'motion/react';
import { showcase } from '../../content';
import { glass } from '../../mk';
import { SectionShell } from '../SectionShell';
import { ShowcaseScene, type ShowcaseSceneProps } from './ShowcaseScene';

type Beat = ShowcaseSceneProps['beat'];

/** Beat bands are 0.25 wide; a beat activates ~40% into its band and then plays to completion. */
function beatFor(progress: number): Beat {
  if (progress >= 0.8) return 4;
  if (progress >= 0.55) return 3;
  if (progress >= 0.3) return 2;
  return 1;
}

export function MapShowcase() {
  const [mode, setMode] = useState<'carousel' | 'pinned'>('carousel');
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)');
    const decide = () => setMode(wide.matches && !reduced ? 'pinned' : 'carousel');
    decide();
    wide.addEventListener('change', decide);
    return () => wide.removeEventListener('change', decide);
  }, [reduced]);

  return (
    <SectionShell
      id="map-showcase"
      eyebrow={showcase.eyebrow}
      title={showcase.title}
      raised
      align="center"
    >
      {mode === 'pinned' ? <PinnedShowcase /> : <ShowcaseCarousel />}
    </SectionShell>
  );
}

/* ================= pinned scroll scene ================= */

function PinnedShowcase() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState<Beat>(1);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      setBeat(beatFor(progress));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Track ref={trackRef}>
      <Sticky>
        <StageGrid>
          <CaptionRail>
            {showcase.beats.map((b, i) => (
              <Caption key={b.step} $active={beat >= i + 1} aria-current={beat === i + 1}>
                <CaptionStep className="tnum">{b.step}</CaptionStep>
                <div>
                  <CaptionTitle>{b.title}</CaptionTitle>
                  <CaptionBody>{b.body}</CaptionBody>
                </div>
              </Caption>
            ))}
            <SimChip>{showcase.simChip}</SimChip>
          </CaptionRail>
          <SceneBox>
            <ShowcaseScene beat={beat} />
          </SceneBox>
        </StageGrid>
      </Sticky>
    </Track>
  );
}

const Track = styled.div`
  height: 300vh;
`;

const Sticky = styled.div`
  position: sticky;
  top: 84px;
  height: calc(100svh - 108px);
  max-height: 760px;
  display: grid;
`;

const StageGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 5fr) 7fr;
  gap: ${({ theme }) => theme.space[6]}px;
  align-items: stretch;
  height: 100%;
  text-align: left;
`;

const CaptionRail = styled.div`
  display: grid;
  align-content: center;
  gap: ${({ theme }) => theme.space[4]}px;
`;

const Caption = styled.div<{ $active: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.space[4]}px;
  opacity: ${({ $active }) => ($active ? 1 : 0.4)};
  transform: translateY(${({ $active }) => ($active ? 0 : 12)}px);
  transition:
    opacity 400ms cubic-bezier(0.2, 0, 0, 1),
    transform 400ms cubic-bezier(0.2, 0, 0, 1);
`;

const CaptionStep = styled.span`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.accentSecondary};
  padding-top: 3px;
`;

const CaptionTitle = styled.h3`
  font-size: 18px;
  letter-spacing: -0.01em;
`;

const CaptionBody = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-top: 4px;
  max-width: 40ch;
`;

const SceneBox = styled.div`
  min-height: 0;
`;

const SimChip = styled.span`
  justify-self: start;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 12px;
  font-weight: 650;
  color: ${({ theme }) => theme.color.textSecondary};
  ${({ theme }) => glass(theme)}
`;

/* ================= carousel fallback ================= */

function ShowcaseCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth * 0.85));
      setIndex(Math.min(showcase.beats.length - 1, Math.max(0, i)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div>
      <Scroller ref={scrollerRef} aria-label="Wave-down story, step by step" role="group">
        {showcase.beats.map((b, i) => (
          <Slide key={b.step}>
            <SlideScene>
              <ShowcaseScene beat={(i + 1) as Beat} animated={false} />
            </SlideScene>
            <SlideText>
              <CaptionStep className="tnum">{b.step}</CaptionStep>
              <CaptionTitle>{b.title}</CaptionTitle>
              <CaptionBody>{b.body}</CaptionBody>
            </SlideText>
          </Slide>
        ))}
      </Scroller>
      <Dots role="tablist" aria-label="Showcase steps">
        {showcase.beats.map((b, i) => (
          <Dot
            key={b.step}
            type="button"
            aria-label={`Step ${i + 1}: ${b.title}`}
            aria-current={index === i}
            $active={index === i}
            onClick={() => scrollTo(i)}
          />
        ))}
      </Dots>
      <ChipRow>
        <SimChip>{showcase.simChip}</SimChip>
      </ChipRow>
    </div>
  );
}

const Scroller = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 85%;
  gap: ${({ theme }) => theme.space[4]}px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
  ${({ theme }) => theme.media.sm} {
    grid-auto-columns: 70%;
  }
`;

const Slide = styled.div`
  scroll-snap-align: center;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  text-align: left;
`;

const SlideScene = styled.div`
  height: 260px;
`;

const SlideText = styled.div`
  display: grid;
  gap: 4px;
  justify-items: start;
`;

const Dots = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: ${({ theme }) => theme.space[5]}px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? 22 : 8)}px;
  height: 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: none;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.color.accentPrimary : theme.color.line2};
  transition: width 200ms cubic-bezier(0.2, 0, 0, 1);
`;

const ChipRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.space[4]}px;
`;
