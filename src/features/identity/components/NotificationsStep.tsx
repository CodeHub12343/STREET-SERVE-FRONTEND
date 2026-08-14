'use client';

/**
 * C-08 Notification permission primer — previews the categories before the OS prompt. "Turn on"
 * requests Notification permission; full Web Push subscription (VAPID + service worker) lands in
 * Milestone 9 with push-token registration (GAP-4). This is the last onboarding step → the map.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Hand, Package, ShieldAlert } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { PermissionPrimer } from './PermissionPrimer';
import { ONBOARDING_TOTAL, nextPath, prevPath, stepNumber } from '../onboarding';

export function NotificationsStep() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const go = () => router.push(nextPath('/onboarding/notifications'));
  const back = prevPath('/onboarding/notifications');

  const requestNotifications = async () => {
    setRequesting(true);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } finally {
      setRequesting(false);
      go();
    }
  };

  return (
    <WizardFlow
      totalSteps={ONBOARDING_TOTAL}
      currentStep={stepNumber('/onboarding/notifications')}
      title="Stay in the loop"
      onBack={back ? () => router.push(back) : undefined}
      footer={
        <div style={{ display: 'grid', gap: 8 }}>
          <Button fullWidth loading={requesting} onClick={() => void requestNotifications()}>
            Turn on notifications
          </Button>
          <Button variant="tertiary" fullWidth onClick={go}>
            Not now
          </Button>
        </div>
      }
    >
      <PermissionPrimer
        icon={<Bell size={32} />}
        headline="We’ll only ping you about things you asked for — you pick the categories, and can change them anytime."
        points={[
          { icon: <Hand size={16} />, text: 'When a vendor accepts your wave or it’s your turn in line.' },
          { icon: <Package size={16} />, text: 'Order updates, booking reminders, and payouts.' },
          { icon: <ShieldAlert size={16} />, text: 'Safety-critical alerts (disputes, verification) always come through.' },
        ]}
      />
    </WizardFlow>
  );
}
