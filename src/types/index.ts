/**
 * App-wide shared domain types. Roles/tiers mirror the backend's additive model
 * (AUTHENTICATION_AND_AUTHORIZATION.md §2). Money is always integer cents.
 */
export type Role =
  | 'guest'
  | 'customer'
  | 'seller'
  | 'vendor'
  | 'hub'
  | 'shelter_admin'
  | 'sponsor'
  | 'admin'
  | 'ops_finance';

export type VerificationTier = 'tier0' | 'bronze' | 'silver' | 'gold';

export type AccountStatus = 'active' | 'suspended';

/** The authoritative client principal — from GET /users/me, never from JWT claims. */
export interface Principal {
  userId: string;
  authProviderId?: string;
  roles: Role[];
  verificationTier: VerificationTier;
  status: AccountStatus;
  cityId?: string;
  name?: string;
  photoUrl?: string;
  /**
   * Whether the user's location is shared exactly or fuzzed. The backend has always returned this
   * and defaults it to 'exact'; leaving it off the principal meant Settings had nothing to read and
   * hardcoded "Approximate" — telling people their location was blurred while it was not.
   */
  locationPrecision?: 'exact' | 'fuzzed';
}

/** App surfaces / modes for the additive-role switcher. */
export type AppMode = 'customer' | 'seller' | 'vendor' | 'hub' | 'admin';

/** Integer cents — never a float. Format only at render (lib/money.ts). */
export type Cents = number;

/** GeoJSON point order is [lng, lat] to match the backend. */
export type LngLat = [number, number];
