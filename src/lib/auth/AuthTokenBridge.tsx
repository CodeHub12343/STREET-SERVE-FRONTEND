'use client';

/**
 * Bridges the auth token into the framework-agnostic API client
 * (AUTHENTICATION_IMPLEMENTATION.md §2). Uses useAuthCompat so it works with or without Clerk —
 * when unconfigured the getter returns null and the client simply sends no bearer token (public
 * reads still work).
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { setTokenGetter } from '@/lib/api/client';
import { API_JWT_TEMPLATE, useAuthCompat } from './useAuthCompat';

export function AuthTokenBridge({ children }: { children: ReactNode }) {
  const { getToken } = useAuthCompat();
  useEffect(() => {
    setTokenGetter(() => getToken({ template: API_JWT_TEMPLATE }));
  }, [getToken]);
  return <>{children}</>;
}
