import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tabs } from './Tabs';
import { SegmentedControl } from './SegmentedControl';

const meta: Meta = { title: 'Primitives/Navigation' };
export default meta;
type Story = StoryObj;

export const CategoryTabs: Story = {
  render: function TabsStory() {
    const [value, setValue] = useState('all');
    return (
      <div style={{ width: 360 }}>
        <Tabs
          value={value}
          onChange={setValue}
          ariaLabel="Categories"
          items={[
            { value: 'all', label: 'All' },
            { value: 'food', label: 'Food' },
            { value: 'coffee', label: 'Coffee' },
            { value: 'services', label: 'Services' },
            { value: 'shopping', label: 'Shopping' },
            { value: 'more', label: 'More' },
          ]}
        />
      </div>
    );
  },
};

export const ContextToggle: Story = {
  render: function SegStory() {
    const [v, setV] = useState<'window' | 'ahead'>('window');
    return (
      <SegmentedControl
        value={v}
        onChange={setV}
        ariaLabel="Order context"
        segments={[
          { value: 'window', label: 'At the window' },
          { value: 'ahead', label: 'Order ahead' },
        ]}
      />
    );
  },
};
