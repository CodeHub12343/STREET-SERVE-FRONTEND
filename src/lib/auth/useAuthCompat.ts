'use client';

/**
 * Clerk-optional auth hook. When Clerk is configured, this IS Clerk's `useAuth`. When it isn't
 * (dev without keys), it's a stable stub — so guards/useMe/socket can call it unconditionally
 * without a ClerkProvider in the tree. The binding is chosen once at module load from a build-time
 * constant, so it never changes across renders (rules-of-hooks safe).
 */
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { isAuthConfigured } from '@/lib/env';

/**
 * Clerk JWT template used for tokens sent to the StreetServe backend. The backend verifier
 * enforces `audience: 'streetserve-api'`, and Clerk's default session token has no `aud` claim,
 * so all tokens bound for the API/socket must be minted from this template. Create a matching
 * template (name + aud = this value) in the Clerk dashboard → JWT Templates.
 */
export const API_JWT_TEMPLATE = 'streetserve-api';

export interface AuthCompat {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  getToken: (options?: unknown) => Promise<string | null>;
  signOut: (options?: unknown) => Promise<void>;
}

function useStubAuth(): AuthCompat {
  return { isLoaded: true, isSignedIn: false, getToken: async () => null, signOut: async () => undefined };
}

export const useAuthCompat: () => AuthCompat = isAuthConfigured
  ? (useClerkAuth as unknown as () => AuthCompat)
  : useStubAuth;
