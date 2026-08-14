'use client';

/**
 * Security & trust (Section Breakdown §9) — 4 trust tiles + the transparent example fee split
 * (which replaces a pricing table pre-launch). The split is explicitly labeled an example.
 */
import styled from 'styled-components';
import { trust } from '../../content';
import { Reveal, RevealItem } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

export function TrustSection() {
  return (
    <SectionShell id="trust" eyebrow={trust.eyebrow} title={trust.title}>
      <Reveal stagger>
        <Layout>
          <RevealItem>
            <Tiles>
          {trust.tiles.map((tile) => (
            <Tile key={tile.title}>
              <TileIcon aria-hidden>{tile.icon}</TileIcon>
              <TileTitle>{tile.title}</TileTitle>
              <TileBody>{tile.body}</TileBody>
            </Tile>
          ))}
            </Tiles>
          </RevealItem>

          <RevealItem>
            <FeeCard aria-label={trust.feeExample.label}>
          <FeeTitle>{trust.feeExample.label}</FeeTitle>
          <FeeRows>
            {trust.feeExample.rows.map((row) => (
              <FeeRow key={row.label}>
                <FeeMeta>
                  <span>{row.label}</span>
                  <FeeValue className="tnum">{row.value}</FeeValue>
                </FeeMeta>
                <Bar
                  role="img"
                  aria-label={`${row.label}: ${row.value} (${row.pct}% of the sale)`}
                >
                  <BarFill style={{ width: `${row.pct}%` }} />
                </Bar>
              </FeeRow>
            ))}
          </FeeRows>
              <FeeNote>{trust.feeExample.note}</FeeNote>
            </FeeCard>
          </RevealItem>
        </Layout>
      </Reveal>
    </SectionShell>
  );
}

const Layout = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: 3fr 2fr;
    align-items: start;
  }
`;

const Tiles = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Tile = styled.article`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  align-content: start;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const TileIcon = styled.span`
  font-size: 24px;
  line-height: 1;
`;

const TileTitle = styled.h3`
  font-size: 17px;
`;

const TileBody = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const FeeCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;

const FeeTitle = styled.h3`
  font-size: 16px;
`;

const FeeRows = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;

const FeeRow = styled.div`
  display: grid;
  gap: 6px;
`;

const FeeMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 650;
`;

const FeeValue = styled.span`
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Bar = styled.div`
  height: 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.color.accentSecondary};
`;

const FeeNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
