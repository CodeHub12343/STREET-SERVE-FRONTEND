import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Sheet } from './Sheet';
import { Modal } from './Modal';
import { Button } from './Button';
import { StatusChip } from './StatusChip';

const meta: Meta = { title: 'Primitives/Overlays' };
export default meta;
type Story = StoryObj;

export const BottomSheet: Story = {
  parameters: { layout: 'fullscreen' },
  render: function SheetStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ height: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          ariaLabel="Business profile"
          initialSnap="half"
          footer={<Button fullWidth>Wave Down</Button>}
        >
          <div style={{ display: 'grid', gap: 12, paddingTop: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <h2 style={{ fontSize: 20 }}>Taco Loco</h2>
              <StatusChip status="driving" />
            </div>
            <p style={{ opacity: 0.7 }}>
              Drag the handle up to full, down to dismiss. Three snap points: peek / half / full.
            </p>
            {Array.from({ length: 12 }, (_, i) => (
              <p key={i}>Menu / reviews / gallery content row {i + 1}</p>
            ))}
          </div>
        </Sheet>
      </div>
    );
  },
};

export const ConfirmModal: Story = {
  render: function ModalStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Cancel order
        </Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Cancel this order?"
          footer={
            <>
              <Button variant="secondary" size="compact" onClick={() => setOpen(false)}>
                Keep order
              </Button>
              <Button variant="destructive" size="compact" onClick={() => setOpen(false)}>
                Cancel order
              </Button>
            </>
          }
        >
          Nothing has been charged yet. Cancelling releases your spot in line.
        </Modal>
      </>
    );
  },
};
