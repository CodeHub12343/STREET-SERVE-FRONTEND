'use client';

/**
 * C-05 Profile basics — name (required), optional photo, city. PATCH /users/me on continue.
 * Photo uses the presigned upload flow; failures degrade to initials, never blocking onboarding.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Camera } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Avatar } from '@/components/primitives/Avatar';
import { useToast } from '@/components/feedback/ToastProvider';
import { uploadImage } from '@/lib/upload';
import { AppApiError } from '@/lib/api/errors';
import { useUpdateProfile } from '../hooks/useProfile';
import { ONBOARDING_TOTAL, nextPath, stepNumber } from '../onboarding';

export function ProfileStep() {
  const router = useRouter();
  const { show } = useToast();
  const update = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 'avatar');
      setPhotoUrl(url);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not upload photo', 'warning');
    } finally {
      setUploading(false);
    }
  };

  const onContinue = () => {
    if (!name.trim()) {
      setNameError('Please enter your name');
      return;
    }
    // NOTE: `city` is collected in the UI but the backend has no free-text home-area field
    // (it stores a geo point via homeLocation), so it isn't sent yet — see profileUpdateSchema.
    update.mutate(
      { displayName: name.trim(), photoUrl },
      {
        onSuccess: () => router.push(nextPath('/onboarding/profile')),
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not save profile', 'danger'),
      },
    );
  };

  return (
    <WizardFlow
      totalSteps={ONBOARDING_TOTAL}
      currentStep={stepNumber('/onboarding/profile')}
      title="Tell us a bit about you"
      footer={
        <Button fullWidth loading={update.isPending} onClick={onContinue}>
          Continue
        </Button>
      }
    >
      <PhotoPicker>
        <Avatar name={name || 'You'} src={photoUrl} size={88} />
        <Button
          variant="secondary"
          size="compact"
          loading={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Camera size={16} /> Add photo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void onPickPhoto(e.target.files?.[0])}
        />
      </PhotoPicker>

      <Input
        label="Your name"
        placeholder="Ada Lovelace"
        required
        value={name}
        error={nameError}
        onChange={(e) => {
          setName(e.target.value);
          if (nameError) setNameError(undefined);
        }}
      />
      <Input
        label="City"
        hint="Helps us show what’s near you"
        placeholder="Modesto, CA"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
    </WizardFlow>
  );
}

const PhotoPicker = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
