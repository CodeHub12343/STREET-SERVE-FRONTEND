'use client';

/**
 * Verification data layer (API §1). Status is polled/refetched (also pushed via the /notifications
 * socket when the KYC webhook resolves). Starting a check returns a provider-hosted redirect URL.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { useAuthCompat } from '@/lib/auth/useAuthCompat';
import { isAuthConfigured } from '@/lib/env';
import type {
  RequirementStatus,
  StartVerificationResponse,
  VerificationRequirement,
  VerificationStatus,
} from '../types';
import type { VerificationTier } from '@/types';

/**
 * The backend's /verification/status response (verification.service.getStatus). Its shape differs
 * from the UI's VerificationStatus — it keys requirements by snake_case `verification_type` inside
 * a `records` array and calls the tier `currentTier` — so we map it here at the data-layer edge.
 */
interface RawVerificationStatus {
  currentTier: VerificationTier;
  records: Array<{
    type: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    tier: string;
    verifiedAt?: string | null;
  }>;
}

const REQUIREMENT_META: Array<{
  key: VerificationRequirement['key'];
  label: string;
  backendType: string;
}> = [
  { key: 'id-document', label: 'Government ID', backendType: 'id_document' },
  { key: 'selfie-liveness', label: 'Selfie liveness check', backendType: 'selfie_liveness' },
  { key: 'bank-account', label: 'Bank account (for payouts)', backendType: 'bank_account' },
];

function toRequirementStatus(raw: RawVerificationStatus['records'][number] | undefined): RequirementStatus {
  // No record yet — or an expired one that must be redone — reads as "required".
  if (!raw || raw.status === 'expired') return 'required';
  return raw.status;
}

function toVerificationStatus(raw: RawVerificationStatus): VerificationStatus {
  const records = raw.records ?? [];
  const idRecord = records.find((r) => r.type === 'id_document');
  return {
    tier: raw.currentTier ?? 'tier0',
    requirements: REQUIREMENT_META.map((meta) => {
      /**
       * The selfie is captured INSIDE the Stripe Identity document session (it requires a matching
       * selfie), so it has no session of its own and no `selfie_liveness` record is ever written.
       * Its state is the ID check's state. Previously it read its own missing record, so it sat on
       * "Required" forever behind a Start button that POSTed a status query and could not navigate
       * anywhere — the button genuinely did nothing.
       */
      if (meta.key === 'selfie-liveness') {
        return {
          key: meta.key,
          label: meta.label,
          status: toRequirementStatus(idRecord),
          /** Not separately actionable — completing the ID check completes this. */
          actionable: false,
        };
      }
      return {
        key: meta.key,
        label: meta.label,
        status: toRequirementStatus(records.find((r) => r.type === meta.backendType)),
        actionable: true,
      };
    }),
  };
}

export function useVerificationStatus() {
  const { isSignedIn } = useAuthCompat();
  return useQuery({
    queryKey: keys.verification,
    queryFn: async () =>
      toVerificationStatus(await api.get<RawVerificationStatus>(endpoints.verificationStatus)),
    enabled: isAuthConfigured && Boolean(isSignedIn),
    staleTime: 30_000,
  });
}

const PATHS: Record<VerificationRequirement['key'], string> = {
  'id-document': endpoints.verification.idDocument,
  'selfie-liveness': endpoints.verification.selfieLiveness,
  'bank-account': endpoints.verification.bankAccount,
};

export function useStartVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: VerificationRequirement['key']) =>
      api.post<StartVerificationResponse>(PATHS[key]),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: keys.verification });
      // The tier lives on the principal (GET /users/me), which gates checkout etc. Refetch it too so
      // an approval (e.g. the dev auto-approve path) clears those gates without a manual reload.
      void qc.invalidateQueries({ queryKey: keys.me });
      // Provider-hosted flow (Stripe Identity / Connect onboarding) — hand off to it. The server
      // field is `url`; `redirectUrl` is tolerated only as an alias.
      const handoff = res.url ?? res.redirectUrl;
      if (handoff && typeof window !== 'undefined') {
        window.location.assign(handoff);
      }
    },
  });
}
