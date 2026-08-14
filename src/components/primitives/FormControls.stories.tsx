import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';
import { TextArea } from './TextArea';
import { Select } from './Select';
import { Stepper } from './Stepper';
import { IconButton } from './IconButton';
import { Heart } from 'lucide-react';

const meta: Meta = { title: 'Primitives/Form Controls' };
export default meta;
type Story = StoryObj;

export const TextInput: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 20, width: 320 }}>
      <Input label="Full name" placeholder="Ada Lovelace" required />
      <Input label="Search" placeholder="Search businesses" leadingIcon={<Search size={16} />} />
      <Input label="Email" defaultValue="not-an-email" error="Enter a valid email address" />
      <Input label="Disabled" placeholder="Unavailable" disabled />
    </div>
  ),
};

export const MultiLine: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <TextArea label="Note to vendor" hint="Optional" placeholder="Add a note…" />
    </div>
  ),
};

export const Dropdown: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Select
        label="Category"
        placeholder="Choose a category"
        options={[
          { value: 'food', label: 'Food' },
          { value: 'coffee', label: 'Coffee' },
          { value: 'services', label: 'Services' },
        ]}
      />
    </div>
  ),
};

export const Quantity: Story = {
  render: function QuantityStory() {
    const [qty, setQty] = useState(1);
    return <Stepper value={qty} onChange={setQty} min={1} max={9} ariaLabel="Quantity" />;
  },
};

export const Icons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <IconButton label="Favorite" variant="ghost" icon={<Heart size={20} />} />
      <IconButton label="Favorite" variant="filled" icon={<Heart size={20} />} />
      <IconButton label="Favorite" variant="outline" icon={<Heart size={20} />} />
    </div>
  ),
};
