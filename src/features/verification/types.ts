/**
 * Verification contracts (AUTHENTICATION_AND_AUTHORIZATION.md §5, API §1). Async KYC lifecycle:
 * submit → pending → provider webhook → tier update. Shapes are kept flexible to match the
 * backend's /verification/status response.
 */
import type { VerificationTier } from '@/types';

export type RequirementStatus = 'required' | 'pending' | 'approved' | 'rejected';

export interface VerificationRequirement {
  key: 'id-document' | 'selfie-liveness' | 'bank-account';
  label: string;
  status: RequirementStatus;
  /** Provider-supplied reason when rejected. */
  reason?: string;
  /**
   * Whether this requirement has its own flow to start. False for steps satisfied as part of
   * another (the selfie is captured inside the ID session), so the UI shows no dead action.
   */
  actionable?: boolean;
}

export interface VerificationStatus {
  tier: VerificationTier;
  requirements: VerificationRequirement[];
}

/** A provider-hosted flow returns a redirect URL to send the user to (Stripe Identity / Connect). */
export interface StartVerificationResponse {
  status: RequirementStatus;
  /**
   * The provider-hosted page to send the user to. The API calls this `url` on every verification
   * path (Stripe Identity session, Connect onboarding); `redirectUrl` was never a field the server
   * returned, so reading it meant the handoff silently never happened — a pending record was
   * created and the user was left on the same screen.
   */
  url?: string | null;
  /** Tolerated alias, in case a future endpoint names it this way. */
  redirectUrl?: string | null;
}
