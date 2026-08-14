import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Banner } from './Banner';
import { ToastProvider, useToast } from './ToastProvider';
import { Button } from '@/components/primitives/Button';

const meta: Meta = { title: 'Feedback' };
export default meta;
type Story = StoryObj;

export const Skeletons: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 10, width: 320 }}>
      <Skeleton $w="40%" $h="24px" />
      <Skeleton $h="120px" $radius={16} />
      <Skeleton $w="80%" />
      <Skeleton $w="60%" />
    </div>
  ),
};

export const Spinners: Story = { render: () => <Spinner /> };

export const Empty: Story = {
  render: () => (
    <EmptyState
      icon="🗺️"
      title="Nothing moving near you yet"
      description="Widen your radius or check scheduled businesses."
      action={<Button size="compact">Widen radius</Button>}
    />
  ),
};

export const Errored: Story = {
  render: () => <ErrorState onRetry={() => undefined} />,
};

export const Banners: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 380 }}>
      <Banner tone="warning" title="Pop-Up — expect a wait">
        Your spot and discount are unaffected.
      </Banner>
      <Banner tone="info">Showing last-known pins — reconnecting…</Banner>
      <Banner tone="success">You&apos;re in line — 15% locked.</Banner>
      <Banner tone="danger" title="Payment declined">
        Nothing was taken. Try another method.
      </Banner>
    </div>
  ),
};

export const Toasts: Story = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
};

function ToastDemo() {
  const { show } = useToast();
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <Button size="compact" onClick={() => show("You're in line — 10% locked", 'success')}>
        Success
      </Button>
      <Button size="compact" variant="secondary" onClick={() => show('Spot released', 'warning')}>
        Warning
      </Button>
    </div>
  );
}
