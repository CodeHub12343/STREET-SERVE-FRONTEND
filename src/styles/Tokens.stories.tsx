import type { Meta, StoryObj } from '@storybook/react';
import styled, { useTheme } from 'styled-components';
import type { ColorKey } from './tokens';

/**
 * Living reference for the design tokens (docs/06 §2). Switch the toolbar theme to verify every
 * swatch resolves in both dark and light.
 */
const meta: Meta = { title: 'Foundation/Design Tokens' };
export default meta;
type Story = StoryObj;

const COLORS: ColorKey[] = [
  'surfaceBase',
  'surfaceRaised',
  'surfaceRaised2',
  'textPrimary',
  'textSecondary',
  'accentPrimary',
  'accentSecondary',
  'statusLive',
  'statusWarning',
  'statusDanger',
  'statusDiscount',
];

function Swatches() {
  const theme = useTheme();
  return (
    <Grid>
      {COLORS.map((key) => (
        <Cell key={key}>
          <Chip style={{ background: theme.color[key] }} />
          <code>{key}</code>
          <small>{theme.color[key]}</small>
        </Cell>
      ))}
    </Grid>
  );
}

export const Palette: Story = { render: () => <Swatches /> };

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px;
`;
const Cell = styled.div`
  display: grid;
  gap: 6px;
  code {
    font-size: 12px;
  }
  small {
    color: ${({ theme }) => theme.color.textSecondary};
    font-variant-numeric: tabular-nums;
  }
`;
const Chip = styled.div`
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
