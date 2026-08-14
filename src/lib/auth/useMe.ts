'use client';

/**
 * The single source of truth for the app principal — roles/tier/status from GET /users/me,
 * never from JWT claims (AUTHENTICATION_IMPLEMENTATION.md §3). When Clerk isn't configured or
 * the user is signed out, returns an inert result so the shell renders.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isAuthConfigured } from '@/lib/env';
import { useAuthCompat } from './useAuthCompat';
import type { Principal } from '@/types';

/** GET /users/me wire shape (identity.service getMe) — keyed by `id`/`displayName`, not the UI's names. */
interface RawMe {
  id: string;
  displayName?: string | null;
  photoUrl?: string | null;
  cityId?: string;
  roles: Principal['roles'];
  verificationTier: Principal['verificationTier'];
  status: Principal['status'];
  locationPrecision?: Principal['locationPrecision'];
}

/**
 * The API returns `{ id, displayName }`; the Principal contract is `{ userId, name }`. Left
 * unmapped, `principal.userId` is silently `undefined` — which is exactly what disabled the
 * message thread query and left receivers staring at an empty conversation.
 */
function toPrincipal(raw: RawMe): Principal {
  return {
    userId: raw.id,
    roles: raw.roles,
    verificationTier: raw.verificationTier,
    status: raw.status,
    cityId: raw.cityId,
    name: raw.displayName ?? undefined,
    photoUrl: raw.photoUrl ?? undefined,
    locationPrecision: raw.locationPrecision,
  };
}

export function useMe() {
  const { isSignedIn, isLoaded } = useAuthCompat();
  const enabled = isAuthConfigured && isLoaded && Boolean(isSignedIn);

  const query = useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<RawMe>(endpoints.me).then(toPrincipal),
    enabled,
    staleTime: 60_000,
  });

  return {
    principal: query.data,
    roles: query.data?.roles ?? [],
    tier: query.data?.verificationTier,
    isSuspended: query.data?.status === 'suspended',
    isLoading: enabled && query.isLoading,
    isSignedIn: Boolean(isSignedIn),
    query,
  };
}
