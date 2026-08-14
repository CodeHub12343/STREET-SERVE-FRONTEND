'use client';

/**
 * Core features bento grid (Section Breakdown §4). LP-4: every card hosts its live micro-demo —
 * plays on hover (pointer devices) or when ≥80% visible one-at-a-time top-to-bottom (touch),
 * idle shows the first frame (animation spec §6). Reveal stagger caps 8 cards at 5 groups.
 */
import { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { features } from '../../content';
import { Reveal, RevealItem } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';
import { featureDemos } from './FeatureDemos';

export function FeatureGrid() {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [touchKey, setTouchKey] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  // Touch autoplay: among cards ≥80% visible, the topmost in document order plays (spec §6).
  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    const visible = new Set<string>();
    const pick = () => {
      const next = features.cards.find((c) => visible.has(c.key))?.key ?? null;
      setTouchKey(next);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.demo;
          if (!key) continue;
          if (entry.intersectionRatio >= 0.8) visible.add(key);
          else visible.delete(key);
        }
        pick();
      },
      { threshold: [0.8] },
    );
    Object.values(cardRefs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <SectionShell id="features" eyebrow={features.eyebrow} title={features.title}>
      <Reveal>
        <Grid>
          {features.cards.map((card, i) => {
            const Demo = featureDemos[card.key];
            const playing = hoverKey === card.key || touchKey === card.key;
            return (
              <Cell key={card.key} order={i} $size={card.size}>
                <Card
                  ref={(el) => {
                    cardRefs.current[card.key] = el;
                  }}
                  data-demo={card.key}
                  onMouseEnter={() => setHoverKey(card.key)}
                  onMouseLeave={() => setHoverKey((k) => (k === card.key ? null : k))}
                >
                  {Demo && (
                    <DemoStage>
                      <Demo playing={playing} />
                    </DemoStage>
                  )}
                  <TitleRow>
                    <Icon aria-hidden>{card.icon}</Icon>
                    <CardTitle>{card.title}</CardTitle>
                  </TitleRow>
                  <CardBody>{card.body}</CardBody>
                </Card>
              </Cell>
            );
          })}
        </Grid>
        <Categories aria-label="Marketplace categories">
          {features.categories.map((c) => (
            <Category key={c}>{c}</Category>
          ))}
        </Categories>
      </Reveal>
    </SectionShell>
  );
}

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Cell = styled(RevealItem)<{ $size: 'large' | 'medium' | 'small' }>`
  display: grid;
  ${({ $size, theme }) =>
    $size === 'large' &&
    css`
      ${theme.media.md} {
        grid-column: span 2;
      }
    `}
`;

const Card = styled.article`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  align-content: start;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  transition:
    border-color ${({ theme }) => theme.motion.standard}ms,
    transform ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut};
  @media (hover: hover) {
    &:hover {
      border-color: ${({ theme }) => theme.color.accentSecondary};
      transform: translateY(-2px);
    }
  }
`;

/** Demo canvas — exposes the theme to the SVG demos as CSS custom properties. */
const DemoStage = styled.div`
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  padding: 6px 10px;
  --demo-surface: ${({ theme }) => theme.color.surfaceRaised};
  --demo-surface2: ${({ theme }) => theme.color.surfaceRaised2};
  --demo-text: ${({ theme }) => theme.color.textPrimary};
  --demo-muted: ${({ theme }) => theme.color.textSecondary};
  --demo-line: ${({ theme }) => theme.color.line};
  --demo-line2: ${({ theme }) => theme.color.line2};
  --demo-accent: ${({ theme }) => theme.color.accentPrimary};
  --demo-accent2: ${({ theme }) => theme.color.accentSecondary};
  --demo-live: ${({ theme }) => theme.status('driving')};
  --demo-warn: ${({ theme }) => theme.status('warning')};
  --demo-discount: ${({ theme }) => theme.status('discount')};
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Icon = styled.span`
  font-size: 20px;
  line-height: 1;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  letter-spacing: -0.01em;
`;

const CardBody = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Categories = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[6]}px;
`;

const Category = styled.span`
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-size: 13px;
  font-weight: 650;
  color: ${({ theme }) => theme.color.textSecondary};
`;
