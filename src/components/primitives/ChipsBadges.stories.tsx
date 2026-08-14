import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Chip } from './Chip';
import { StatusChip } from './StatusChip';
import { Badge } from './Badge';
import { Avatar } from './Avatar';

const meta: Meta = { title: 'Primitives/Chips & Badges' };
export default meta;
type Story = StoryObj;

export const Filters: Story = {
  render: function FiltersStory() {
    const [sel, setSel] = useState('all');
    const opts = ['all', 'food', 'coffee', 'services', 'shopping'];
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {opts.map((o) => (
          <Chip key={o} selected={sel === o} onClick={() => setSel(o)}>
            {o[0]!.toUpperCase() + o.slice(1)}
          </Chip>
        ))}
      </div>
    );
  },
};

export const Statuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <StatusChip status="driving" />
      <StatusChip status="parked" />
      <StatusChip status="away" label="Closed — opens 10 AM" />
      <StatusChip status="popup" />
      <StatusChip status="free" />
      <StatusChip status="discount" label="15% off" />
    </div>
  ),
};

export const Badges: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Badge count={3} />
      <Badge count={128} />
      <Badge tone="accent">NEW</Badge>
      <span style={{ position: 'relative' }}>
        <Avatar name="Taco Loco" size={44} />
        <span style={{ position: 'absolute', top: -2, right: -2 }}>
          <Badge dot tone="live" />
        </span>
      </span>
    </div>
  ),
};
