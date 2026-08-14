'use client';

/**
 * Legal agreements (R28) — read the current versioned body for a clickwrap, and record acceptance
 * (attesting the version + content hash the vendor actually saw, so it's tamper-evident server-side).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';

export interface AgreementBody {
  type: string;
  version: string;
  title: string;
  body: string;
  contentHash: string;
}

const DEMO_AGREEMENT = (type: string): AgreementBody => ({
  type,
  version: 'demo',
  title: type === 'regular_sale' ? 'Seller Terms of Sale' : 'Agreement',
  body: 'Demo agreement text. In production this is the attorney-reviewed, versioned body.',
  contentHash: 'demo',
});

export function useAgreement(type: string, enabled = true) {
  return useQuery<AgreementBody>({
    queryKey: keys.agreement(type),
    enabled,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_AGREEMENT(type)) : api.get<AgreementBody>(endpoints.agreement(type)),
    staleTime: 5 * 60_000,
  });
}

export function useAcceptAgreement(type: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attest?: { version: string; contentHash: string }) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.agreementAccept(type), attest ?? {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.agreement(type) }),
  });
}
