import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Wave Down' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'destructive'] },
    size: { control: 'radio', options: ['default', 'compact'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Directions' } };
export const Tertiary: Story = { args: { variant: 'tertiary', children: 'Notify Me' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Cancel order' } };
export const Loading: Story = { args: { loading: true } };
export const Compact: Story = { args: { size: 'compact', children: 'Retry' } };

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};
