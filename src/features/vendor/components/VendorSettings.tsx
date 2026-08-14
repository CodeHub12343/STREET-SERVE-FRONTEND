'use client';

/**
 * V-08 Business settings (BP-4) — the post-registration home for the basics: logo, hours, service
 * area. Registration lets you skip these; this is where they land, and where the setup checklist
 * sends you.
 *
 * Reuses the registration BasicsStep so there is exactly one implementation of the hours editor
 * and the area picker — divergence between "set up" and "edit" is how these drift.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { AppApiError } from '@/lib/api/errors';
import { useVendorBusinessDetail } from '../hooks/useVendorBusinessDetail';
import type { HoursEntry } from '../registration';
import { BasicsStep } from './register/BasicsStep';

export function VendorSettings({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const qc = useQueryClient();
  const { data: business, isLoading } = useVendorBusinessDetail(businessId);

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [hours, setHours] = useState<HoursEntry[]>([]);
  const [center, setCenter] = useState<[number, number] | undefined>();
  const [radiusM, setRadiusM] = useState(5000);
  const [hydrated, setHydrated] = useState(false);

  // Seed the form from the server once, then leave the user's edits alone.
  useEffect(() => {
    if (!business || hydrated) return;
    setName(business.name);
    setLogoUrl(business.logoUrl ?? undefined);
    setHours(business.hours ?? []);
    setCenter(business.serviceArea ?? undefined);
    if (business.serviceRadiusM) setRadiusM(business.serviceRadiusM);
    setHydrated(true);
  }, [business, hydrated]);

  const save = useMutation({
    mutationFn: () => {
      if (isMapDemo) return Promise.resolve();
      /**
       * Send only the three fields an hours entry actually has.
       *
       * `hours` is seeded from the GET response, and the API used to include the Mongo `_id` of each
       * subdocument. Echoing the response back verbatim therefore hit the server's `.strict()`
       * update schema and failed every save with 400 "Unrecognized key(s) in object: '_id'". The
       * API no longer sends that id, but rebuilding the entries here means this screen cannot be
       * broken again by a field being added to the read model.
       */
      const cleanHours = hours.map((h) => ({ day: h.day, open: h.open, close: h.close }));
      const patch: Record<string, unknown> = { name: name.trim(), hours: cleanHours };
      if (logoUrl) patch.logoUrl = logoUrl;
      if (center) {
        patch.serviceArea = center;
        patch.serviceRadiusM = radiusM;
      }
      return api.patch(endpoints.business(businessId).root, patch);
    },
    onSuccess: () => {
      // The checklist derives from this record — re-read so completed items disappear at once.
      void qc.invalidateQueries({ queryKey: keys.vendorBusiness(businessId) });
      void qc.invalidateQueries({ queryKey: keys.myBusinesses });
      show('Settings saved', 'success');
    },
    onError: (e) =>
      show(e instanceof AppApiError ? e.message : 'Could not save your settings', 'danger'),
  });

  if (isLoading || !business) {
    return (
      <Wrap>
        <Skeleton $h="320px" $radius={16} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Head>
        <h1>Business settings</h1>
        <Sub>Your logo, hours, and where you operate.</Sub>
      </Head>

      <BasicsStep
        name={name}
        onName={setName}
        logoUrl={logoUrl}
        onLogoUrl={setLogoUrl}
        hours={hours}
        onHours={setHours}
        center={center}
        onCenter={setCenter}
        radiusM={radiusM}
        onRadiusM={setRadiusM}
      />

      <Button loading={save.isPending} onClick={() => save.mutate()}>
        Save changes
      </Button>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  /**
   * max-width caps how wide this gets on a desktop; it does nothing to stop a wide CHILD forcing
   * the column past a narrow viewport. min-width: 0 is what allows the shrink, and without it the
   * hours editor pushed this whole page off the right edge of a phone.
   */
  max-width: min(640px, 100%);
  min-width: 0;
`;
const Head = styled.div`
  display: grid;
  gap: 2px;
  h1 {
    font-size: 22px;
  }
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
