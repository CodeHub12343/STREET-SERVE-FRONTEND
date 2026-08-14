'use client';

/**
 * Launch metrics strip (Section Breakdown §2) — legitimacy band under the hero. Real numbers
 * only: the waitlist tile appears only when GET /preregistrations/count answers with a positive
 * count (LP-4 wiring); it counts up 900ms in tabular numerals, instantly under reduced motion.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { marketingConfig } from '../../marketing.config';
import { fetchPreregistrationCount } from '../../marketing.api';
import { Reveal, RevealItem } from '../../motion/Reveal';
import { CountUp } from '../CountUp';

export function MetricsStrip() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!marketingConfig.showWaitlistCount) return;
    let cancelled = false;
    void fetchPreregistrationCount().then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Root aria-label="Launch status">
      <RevealRow stagger>
        <Tile>
          <Value>{marketingConfig.launchCity}</Value>
          <Label>{marketingConfig.isLive ? 'Live now' : 'Launching first'}</Label>
        </Tile>
        <Tile>
          <Value>Wonder Ice</Value>
          <Label>National launch partner</Label>
        </Tile>
        <Tile>
          <Value>3 sides, 1 map</Value>
          <Label>Customers · Vendors · Sellers</Label>
        </Tile>
        {marketingConfig.showWaitlistCount && count !== null && count > 0 && (
          <Tile>
            <Value>
              <CountUp value={count} />
            </Value>
            <Label>Pre-registered</Label>
          </Tile>
        )}
      </RevealRow>
    </Root>
  );
}

const Root = styled.section`
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const RevealRow = styled(Reveal)`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[5]}px 20px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(180px, 1fr);
  gap: ${({ theme }) => theme.space[5]}px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  ${({ theme }) => theme.media.sm} {
    padding-left: 32px;
    padding-right: 32px;
    overflow: visible;
  }
`;

const Tile = styled(RevealItem)`
  display: grid;
  gap: 4px;
  text-align: center;
`;

const Value = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
  ${({ theme }) => theme.media.md} {
    font-size: 24px;
  }
`;

const Label = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
