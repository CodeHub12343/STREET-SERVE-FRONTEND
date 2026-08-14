'use client';

/**
 * Identity mutations (SCREEN_TO_API_MAPPING.md §1). Both invalidate keys.me so the principal
 * (roles/tier/name) refreshes everywhere after a change.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import type { Principal, Role } from '@/types';
import type { ProfileUpdate } from '../types';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpdate) => api.patch<Principal>(endpoints.me, body),
    onSuccess: (data) => {
      qc.setQueryData(keys.me, data);
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useAddRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: Role) => api.post<Principal>(endpoints.authRoles, { role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}
