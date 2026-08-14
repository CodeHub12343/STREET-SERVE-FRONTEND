import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { LayoutDashboard, Receipt, Users, Bell } from 'lucide-react';
import { TabPage } from './TabPage';
import { WizardFlow } from './WizardFlow';
import { SettingsList, SettingsGroup, SettingsRow } from './SettingsList';
import { ConversationView } from './ConversationView';
import { DashboardShell } from './DashboardShell';
import { MapShell } from './MapShell';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Tabs } from '@/components/primitives/Tabs';
import { IconButton } from '@/components/primitives/IconButton';
import { EmptyState } from '@/components/feedback/EmptyState';

const meta: Meta = { title: 'Layout/Templates', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const TabPageTemplate: Story = {
  render: () => (
    <TabPage title="Orders" actions={<Button size="compact" variant="tertiary">Filter</Button>}>
      <EmptyState icon="🧾" title="No orders yet" description="Your orders will show up here." />
    </TabPage>
  ),
};

export const WizardTemplate: Story = {
  render: function WizardStory() {
    const [step, setStep] = useState(1);
    return (
      <WizardFlow
        totalSteps={4}
        currentStep={step}
        title="What brings you here?"
        onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
        footer={
          <Button fullWidth onClick={() => setStep((s) => Math.min(4, s + 1))}>
            Continue
          </Button>
        }
      >
        <p style={{ opacity: 0.7 }}>Pick a starting mode — you can add the others later.</p>
      </WizardFlow>
    );
  },
};

export const SettingsTemplate: Story = {
  render: () => (
    <SettingsList>
      <SettingsGroup title="Account">
        <SettingsRow label="Name" value="Ada Lovelace" onClick={() => undefined} />
        <SettingsRow label="Phone" value="+1 (415) 555-0123" onClick={() => undefined} />
      </SettingsGroup>
      <SettingsGroup title="Preferences">
        <SettingsRow label="Theme" value="System" onClick={() => undefined} />
        <SettingsRow label="Location precision" value="Approximate" onClick={() => undefined} />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow label="Sign out" destructive onClick={() => undefined} />
      </SettingsGroup>
    </SettingsList>
  ),
};

export const ConversationTemplate: Story = {
  render: () => (
    <div style={{ height: '100dvh' }}>
      <ConversationView
        banner={<strong>Chat with Taco Loco</strong>}
        composer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Input placeholder="Message…" />
            <Button size="compact">Send</Button>
          </div>
        }
      >
        <div style={{ alignSelf: 'flex-start', background: '#8882', padding: '8px 12px', borderRadius: 12 }}>
          Are you near Graceada Park today?
        </div>
        <div style={{ alignSelf: 'flex-end', background: '#FF6B4533', padding: '8px 12px', borderRadius: 12 }}>
          Parked there until 2pm!
        </div>
      </ConversationView>
    </div>
  ),
};

export const DashboardTemplate: Story = {
  render: () => (
    <DashboardShell
      title="Vendor"
      actions={<IconButton label="Notifications" icon={<Bell size={18} />} />}
      nav={[
        { href: '/vendor', label: 'Live Status', icon: <LayoutDashboard size={18} /> },
        { href: '/vendor/orders', label: 'Orders', icon: <Receipt size={18} /> },
        { href: '/vendor/queue', label: 'Queue', icon: <Users size={18} /> },
      ]}
    >
      <h2 style={{ fontSize: 22, marginBottom: 12 }}>Live Status</h2>
      <p style={{ opacity: 0.7 }}>Resize the frame to see the sidebar collapse to an icon rail.</p>
    </DashboardShell>
  ),
};

export const MapShellTemplate: Story = {
  render: function MapShellStory() {
    const [cat, setCat] = useState('all');
    return (
      <div style={{ height: '100dvh' }}>
        <MapShell
          header={
            <>
              <Input placeholder="Search businesses or services" />
              <Tabs
                value={cat}
                onChange={setCat}
                items={[
                  { value: 'all', label: 'All' },
                  { value: 'food', label: 'Food' },
                  { value: 'coffee', label: 'Coffee' },
                  { value: 'services', label: 'Services' },
                ]}
              />
            </>
          }
          floatingAction={<Button>Serve Near Me</Button>}
        >
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.5 }}>
            map canvas
          </div>
        </MapShell>
      </div>
    );
  },
};
