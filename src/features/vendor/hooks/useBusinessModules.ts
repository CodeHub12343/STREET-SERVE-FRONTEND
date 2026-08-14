'use client';

/**
 * A business's resolved capability set now lives in `features/business` — it describes a
 * *business*, not the vendor console, and `GET /businesses/:id/modules` is public precisely so
 * the customer-facing profile can read it too (BP-6).
 *
 * Re-exported here so the vendor dashboard's imports stay put; the dependency direction is
 * vendor → business, which is the sensible one.
 */
export {
  useBusinessModules,
  useSetBusinessModules,
  type Archetype,
  type BusinessModule,
  type ResolvedModules,
} from '@/features/business/hooks/useBusinessModules';
