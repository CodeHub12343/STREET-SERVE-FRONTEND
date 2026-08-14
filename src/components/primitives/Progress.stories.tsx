import type { Meta, StoryObj } from '@storybook/react';
import { ProgressRail } from './ProgressRail';
import { Tracker } from './Tracker';
import { Countdown } from './Countdown';

const meta: Meta = { title: 'Primitives/Progress' };
export default meta;
type Story = StoryObj;

export const QueueRail: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 320 }}>
      <ProgressRail total={8} position={4} />
      <ProgressRail total={20} position={11} />
    </div>
  ),
};

export const OrderTracker: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Tracker
        activeIndex={1}
        steps={[
          { key: 'placed', label: 'Order placed', description: 'Sent to Taco Loco' },
          { key: 'accepted', label: 'Accepted', description: 'Preparing your order' },
          { key: 'ready', label: 'Ready for pickup' },
          { key: 'done', label: 'Completed' },
        ]}
      />
    </div>
  ),
};

export const CountdownTimer: Story = {
  render: () => {
    const in3min = new Date(Date.now() + 3 * 60_000).toISOString();
    const in20s = new Date(Date.now() + 20_000).toISOString();
    return (
      <div style={{ display: 'flex', gap: 24, fontSize: 28 }}>
        <Countdown deadline={in3min} />
        <Countdown deadline={in20s} urgentAtMs={30_000} />
      </div>
    );
  },
};
