'use client';

/**
 * Client route guards (AUTHENTICATION_IMPLEMENTATION.md §5). These are UX only — the backend
 * enforces authorization on every request. They redirect gracefully (missing role → add-role
 * flow, suspended → support), never render a hard 403 (docs/06 §1 friction-scales-with-money).
 *
 * No-ops when Clerk isn't configured, so the shell is browsable in dev without keys.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthConfigured } from '@/lib/env';
import { useAuthCompat } from './useAuthCompat';
import { useMe } from './useMe';
import type { Role } from '@/types';

export function useRequireAuth(enabled = true): void {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuthCompat();
  useEffect(() => {
    if (!enabled || !isAuthConfigured || !isLoaded) return;
    if (!isSignedIn) router.replace('/sign-in');
  }, [enabled, isLoaded, isSignedIn, router]);
}

export function useRequireAnyRole(...allowed: Role[]): void {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuthCompat();
  const { roles, isSuspended, isLoading } = useMe();

  useEffect(() => {
    if (!isAuthConfigured || !isLoaded) return;
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
    if (isLoading) return;
    if (isSuspended) {
      router.replace('/help');
      return;
    }
    const hasRole = roles.some((r) => allowed.includes(r));
    if (!hasRole) router.replace('/profile');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, isLoading, isSuspended, roles.join(','), router]);
}

export function useRequireRole(role: Role): void {
  useRequireAnyRole(role);
}
