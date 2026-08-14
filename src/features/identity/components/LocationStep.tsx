'use client';

/**
 * C-07 Location permission primer — explains the fuzzing/precision policy before the OS geolocation
 * prompt. "Enable location" triggers the browser prompt; "Not now" skips (you can enable later in
 * settings). Either way onboarding continues.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Sliders, MapPin } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { PermissionPrimer } from './PermissionPrimer';
import { ONBOARDING_TOTAL, nextPath, prevPath, stepNumber } from '../onboarding';

export function LocationStep() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const go = () => router.push(nextPath('/onboarding/location'));
  const back = prevPath('/onboarding/location');

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      go();
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setRequesting(false);
        go();
      },
      () => {
        setRequesting(false);
        go(); // denied is fine — the map falls back to the declared home area
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  return (
    <WizardFlow
      totalSteps={ONBOARDING_TOTAL}
      currentStep={stepNumber('/onboarding/location')}
      title="Show what’s near you"
      onBack={back ? () => router.push(back) : undefined}
      footer={
        <div style={{ display: 'grid', gap: 8 }}>
          <Button fullWidth loading={requesting} onClick={requestLocation}>
            Enable location
          </Button>
          <Button variant="tertiary" fullWidth onClick={go}>
            Not now
          </Button>
        </div>
      }
    >
      <PermissionPrimer
        icon={<MapPin size={32} />}
        headline="We use your location only to show nearby businesses and to place your wave-downs."
        points={[
          { icon: <Sliders size={16} />, text: 'You control precision — share an approximate area instead of your exact spot.' },
          { icon: <ShieldCheck size={16} />, text: 'Location history is purged on a 30-day retention policy.' },
          { icon: <MapPin size={16} />, text: 'Change or turn this off anytime in Settings.' },
        ]}
      />
    </WizardFlow>
  );
}
