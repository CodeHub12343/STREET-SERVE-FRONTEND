import type { Meta, StoryObj } from '@storybook/react';
import styled, { useTheme } from 'styled-components';
import { CHART_SERIES_KEYS } from './tokens';

/**
 * The foundations, rendered.
 *
 * A design system written only in a markdown table is a system nobody checks. These stories exist so
 * elevation and the chart palette can be LOOKED at in both themes — the dataviz method's last step
 * is "render it and look at it", because the validator checks colour and not layout.
 */
const meta: Meta = { title: 'Foundations/Tokens' };
export default meta;
type Story = StoryObj;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 28px;
  background: ${({ theme }) => theme.color.surfaceBase};
`;
const Tile = styled.div<{ $shadow: string }>`
  display: grid;
  place-content: center;
  gap: 4px;
  width: 150px;
  height: 108px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  box-shadow: ${({ $shadow }) => $shadow};
  text-align: center;
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 13px;
  font-weight: 700;
`;
const Sub = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.textTertiary};
`;

/** Four levels, each named for what the surface is doing rather than how strong it looks. */
export const Elevation: Story = {
  render: function ElevationStory() {
    const theme = useTheme();
    const uses: Record<string, string> = {
      flat: 'cards, list rows',
      raised: 'menus, popovers',
      floating: 'orbit, FABs',
      overlay: 'sheets, modals',
    };
    return (
      <Row>
        {Object.entries(theme.elevation).map(([name, shadow]) => (
          <Tile key={name} $shadow={shadow}>
            {name}
            <Sub>{uses[name]}</Sub>
          </Tile>
        ))}
      </Row>
    );
  },
};

const Swatch = styled.div<{ $c: string }>`
  width: 150px;
  height: 76px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ $c }) => $c};
`;
const Label = styled.p`
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;

/**
 * Identity colours only — never a status. Four slots is the validated limit: a fifth hue collided
 * with the brand orange at ΔE 3.2 for protanopia, so a fifth series aggregates instead.
 */
export const ChartSeries: Story = {
  render: function ChartStory() {
    const theme = useTheme();
    return (
      <Row>
        {CHART_SERIES_KEYS.map((k, i) => (
          <div key={k}>
            <Swatch $c={theme.chart[k]} />
            <Label>
              {k} <Sub>slot {i + 1}</Sub>
            </Label>
          </div>
        ))}
        <div>
          <Swatch $c={theme.chart.grid} />
          <Label>
            grid <Sub>recessive</Sub>
          </Label>
        </div>
        <div>
          <Swatch $c={theme.chart.axis} />
          <Label>
            axis <Sub>recessive</Sub>
          </Label>
        </div>
      </Row>
    );
  },
};

const Bar = styled.div<{ $c: string; $h: number }>`
  width: 34px;
  height: ${({ $h }) => $h}px;
  background: ${({ $c }) => $c};
  /* 4px rounded data-ends, anchored to the baseline — the end away from the axis is the rounded one. */
  border-radius: 4px 4px 0 0;
`;
const Chart = styled.div`
  display: flex;
  align-items: flex-end;
  /* The 2px surface-coloured gap that makes adjacent bars read as separate objects. */
  gap: 2px;
  padding: 28px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-radius: ${({ theme }) => theme.radius.card}px;
`;

/** The mark specs applied: thin marks, 4px data-ends, a 2px gap, recessive furniture. */
export const MarkSpecs: Story = {
  render: function MarksStory() {
    const theme = useTheme();
    const data = [64, 92, 48, 120];
    return (
      <Row>
        <Chart>
          {data.map((h, i) => (
            <Bar key={i} $c={theme.chart[CHART_SERIES_KEYS[i]!]} $h={h} />
          ))}
        </Chart>
      </Row>
    );
  },
};
