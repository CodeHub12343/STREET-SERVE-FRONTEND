import type { Meta, StoryObj } from '@storybook/react';
import { MapPin } from './MapPin';

const meta: Meta<typeof MapPin> = {
  title: 'Map/MapPin',
  component: MapPin,
  args: { name: 'Taco Loco', status: 'driving', etaLabel: '2 min' },
  argTypes: { status: { control: 'radio', options: ['driving', 'parked', 'away'] } },
};
export default meta;
type Story = StoryObj<typeof MapPin>;

export const Driving: Story = { args: { status: 'driving', etaLabel: '2 min' } };
export const Parked: Story = { args: { status: 'parked', etaLabel: '4 min' } };
export const AwayClosed: Story = { args: { status: 'away' } };

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      <MapPin name="Taco Loco" status="driving" etaLabel="2 min" />
      <MapPin name="Bean Bus" status="parked" etaLabel="Here" />
      <MapPin name="Fix-It Van" status="away" />
    </div>
  ),
};
