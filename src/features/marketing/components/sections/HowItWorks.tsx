'use client';

/**
 * How StreetServe works (Section Breakdown §3) — the Find · Earn · Grow triad with the LP-4
 * illustrated SVG mini-scenes (map design language: rings, routes, split bars).
 */
import styled from 'styled-components';
import { howItWorks } from '../../content';
import { Reveal, RevealItem } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';
import { triadScenes } from './TriadArt';

export function HowItWorks() {
  return (
    <SectionShell
      id="how-it-works"
      eyebrow={howItWorks.eyebrow}
      title={howItWorks.title}
      align="center"
    >
      <Reveal stagger>
        <Grid>
          {howItWorks.steps.map((step) => {
            const Scene = triadScenes[step.key];
            return (
            <RevealItem key={step.key}>
              <Panel>
                <Scene />
                <Audience>{step.audience}</Audience>
                <PanelTitle>{step.title}</PanelTitle>
                <Body>{step.body}</Body>
                <PanelLink href={step.link.href}>{step.link.label} →</PanelLink>
              </Panel>
            </RevealItem>
            );
          })}
        </Grid>
      </Reveal>
    </SectionShell>
  );
}

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, 1fr);
    gap: ${({ theme }) => theme.space[5]}px;
  }
`;

const Panel = styled.article`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  align-content: start;
  height: 100%;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const Audience = styled.p`
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const PanelTitle = styled.h3`
  font-size: 24px;
  letter-spacing: -0.02em;
`;

const Body = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 15px;
`;

const PanelLink = styled.a`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentSecondary};
  width: fit-content;
`;
