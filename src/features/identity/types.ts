/**
 * Identity feature contracts (SCREEN_TO_API_MAPPING.md §1). Kept close to the backend's request
 * shapes for /users/me and /auth/roles.
 */
import { z } from 'zod';
import type { Role } from '@/types';

/**
 * Body for PATCH /users/me (C-05 profile basics, C-37 settings). Field names/enums mirror the
 * backend's `.strict()` UpdateProfileBody (identity.schema.ts) exactly — unknown keys are rejected
 * with a 400. Note: the backend has no free-text "home area" field; location is a geo point
 * (homeLocation) plus a precision toggle, so a typed city string is UI-only until geocoded.
 */
export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  photoUrl: z.string().url().optional(),
  locationPrecision: z.enum(['exact', 'fuzzed']).optional(),
  fuzzRadiusM: z.number().int().min(0).max(5000).optional(),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/** The onboarding intents (C-06) map to additive roles. Customer is the default. */
export type RoleIntent = 'find' | 'sell' | 'business' | 'hub';

export const INTENT_TO_ROLE: Record<RoleIntent, Role> = {
  find: 'customer',
  sell: 'seller',
  business: 'vendor',
  hub: 'hub',
};

/** Body for POST /auth/roles (additive model). */
export interface AddRoleBody {
  role: Role;
}
