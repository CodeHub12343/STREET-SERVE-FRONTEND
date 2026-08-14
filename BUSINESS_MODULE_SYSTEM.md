# StreetServe — Business Module System

> The technical design that turns 20 existing capabilities into a product that fits each business: schema, resolution rules, API, dashboard filtering, and enforcement.
> Depends on [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) (what the defaults are).
> Extends (in place, does not replace): `DATABASE_SCHEMA_PLAN.md` §2, `API_SPECIFICATION.md`, `AUTHENTICATION_AND_AUTHORIZATION.md` §3, `ROUTING_STRUCTURE.md` §6.

---

## 1. Core concept

A **module** is a named capability a business can run. Modules are:

- **Resolved**, not stored-by-default — a business inherits its archetype's defaults until it customises.
- **Advisory in the UI, authoritative on the server** — the nav hides a disabled module; the API *rejects* it.
- **Additive** — enabling never destroys data. Disabling `booking` hides the screen and stops new bookings; existing bookings remain readable and completable.

### The resolution chain

```
ARCHETYPE_DEFAULTS[category.archetype]     ← base (BUSINESS_CATEGORY_MATRIX §4)
  ⊕ category.module_overrides              ← per-category tweaks
  ⊕ AUTO rules (licensing, hub_operations) ← derived from data, not choice
  ⊕ business.enabled_modules               ← the owner's explicit set (if not undefined)
  ⊕ CORE_MODULES                           ← always forced on, never removable
  = effective modules
```

**One resolver, server-side, used by every consumer.** The client never recomputes this — it asks.

---

## 2. Schema changes

Three fields. No new collections. (Extends `DATABASE_SCHEMA_PLAN.md` §2.)

```js
// src/config/constants.ts
export const ARCHETYPES = [
  'counter_serve',
  'appointment_service',
  'on_demand_service',
  'goods_seller',
] as const;

export const MODULES = [
  // core — always on, never disable-able
  'live_presence', 'profile', 'reviews', 'messaging', 'payouts', 'analytics',
  // auto — derived from data
  'licensing', 'hub_operations',
  // optional
  'menu', 'ordering', 'queue', 'wave_down', 'services', 'booking',
  'catalog', 'consignment', 'gifting', 'giveaways', 'ping_sharing', 'ai_assistant',
] as const;

export const CORE_MODULES: Module[] = [
  'live_presence', 'profile', 'reviews', 'messaging', 'payouts', 'analytics',
];
```

```js
// categories — src/modules/catalog/catalog.model.ts
archetype:        { type: String, enum: ARCHETYPES, required: true },
module_overrides: { type: Schema.Types.Mixed, default: {} },   // { booking: true, queue: false }

// businesses — src/modules/vendors/vendors.model.ts
// undefined = inherit archetype defaults. [] = explicitly nothing optional.
enabled_modules:  { type: [String], default: undefined },
// Registration currently discards `serviceArea` (UI-only). Give it a home:
service_area:     {
  type:      { type: String, enum: ['Polygon'], default: undefined },
  coordinates: { type: [[[Number]]], default: undefined },
},
service_radius_m: { type: Number, default: null },
travel_fee_cents: { type: Number, default: null },
```

`businesses.hours` **already exists** and has no UI — the registration redesign finally populates it (BP-3).

**Migration:** backfill `categories.archetype` from [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) §5. `businesses.enabled_modules` needs **no backfill** — `undefined` already means "inherit", so every existing business silently gains correct defaults. This is the main reason the field is nullable rather than a populated array.

---

## 3. The resolver

Single source of truth. Lives in the vendors module because a module set is a property of a business.

```ts
// src/modules/vendors/modules.service.ts
const ARCHETYPE_DEFAULTS: Record<Archetype, Module[]> = {
  counter_serve:       ['menu', 'ordering', 'queue', 'wave_down'],
  appointment_service: ['services', 'booking'],
  on_demand_service:   ['services', 'wave_down'],
  goods_seller:        ['catalog', 'ordering', 'consignment'],
};

/** Modules a category is ALLOWED to offer — everything else is ➖ (hidden, not just off). */
const ARCHETYPE_AVAILABLE: Record<Archetype, Module[]> = {
  counter_serve:       [...ARCHETYPE_DEFAULTS.counter_serve, 'booking', 'consignment', 'gifting', 'giveaways', 'ping_sharing', 'ai_assistant'],
  appointment_service: [...ARCHETYPE_DEFAULTS.appointment_service, 'ordering', 'wave_down', 'gifting', 'giveaways', 'ping_sharing', 'ai_assistant'],
  on_demand_service:   [...ARCHETYPE_DEFAULTS.on_demand_service, 'ordering', 'booking', 'queue', 'giveaways', 'ping_sharing', 'ai_assistant'],
  goods_seller:        [...ARCHETYPE_DEFAULTS.goods_seller, 'menu', 'queue', 'gifting', 'giveaways', 'ping_sharing', 'ai_assistant'],
};

export async function resolveModules(businessId: string): Promise<ResolvedModules> {
  const business = await repo.findBusinessById(businessId);
  const category = await CategoryModel.findById(business.category_id).lean();
  const archetype = category.archetype;

  const available = new Set([...ARCHETYPE_AVAILABLE[archetype], ...CORE_MODULES]);

  // 1. defaults ⊕ 2. category overrides
  const defaults = new Set(ARCHETYPE_DEFAULTS[archetype]);
  for (const [mod, on] of Object.entries(category.module_overrides ?? {})) {
    if (on) { defaults.add(mod); available.add(mod); } else { defaults.delete(mod); }
  }

  // 3. owner's explicit set (undefined = inherit) — intersected with `available` so a stale
  //    stored module (e.g. category changed) can never resurrect an irrelevant screen.
  const chosen = business.enabled_modules === undefined
    ? defaults
    : new Set(business.enabled_modules.filter((m) => available.has(m)));

  // 4. AUTO rules — derived from data, not owner choice, so never user-toggleable
  if (category.requires_license) { chosen.add('licensing'); available.add('licensing'); }
  if (business.is_hub)           { chosen.add('hub_operations'); available.add('hub_operations'); }

  // 5. core always wins
  for (const m of CORE_MODULES) chosen.add(m);

  return {
    archetype,
    enabled: [...chosen],
    available: [...available],
    core: CORE_MODULES,
    locked: [...(category.requires_license ? ['licensing'] : []), ...(business.is_hub ? ['hub_operations'] : []), ...CORE_MODULES],
  };
}
```

**Why intersect with `available`:** if a food truck enables `menu`, then an admin re-categorises it as a mechanic, the stored `['menu', ...]` must not keep a Menu tab alive. Resolution is always re-validated against the current archetype.

---

## 4. API

Extends `API_SPECIFICATION.md`. Envelope, errors, and rate-limit tiers per existing conventions.

### `GET /businesses/:id/modules` — public

The resolved set. Public because the **customer profile also needs it** (do we show "Book" or "Order"?).

```jsonc
{ "data": {
  "archetype": "on_demand_service",
  "enabled":   ["live_presence","profile","reviews","messaging","payouts","analytics","services","wave_down"],
  "available": ["...","booking","ordering","queue","giveaways","ping_sharing","ai_assistant"],
  "core":      ["live_presence","profile","reviews","messaging","payouts","analytics"],
  "locked":    ["live_presence","profile","reviews","messaging","payouts","analytics"]
}}
```

### `PUT /businesses/:id/modules` — owner only

```jsonc
// body
{ "enabled": ["services", "booking", "wave_down"] }
```

- Guard: `requirePermission('business:manage_own', ownsBusiness)` — the existing pattern.
- **422 `MODULE_NOT_AVAILABLE`** if any id is outside `available` (e.g. a barber requesting `menu`).
- **422 `MODULE_LOCKED`** if the body attempts to remove a `locked` module.
- Core modules are unioned in server-side regardless of body — never an error, just enforced.
- Writes an audit entry (`business.modules_changed`) per the existing `writeAudit` convention.

### Enforcement on feature routes

The UI hiding a tab is **not** access control. Every module-scoped route asserts its module — the same posture as the licence gate on go-live.

```ts
// src/middleware/requireModule.ts
export const requireModule = (mod: Module) =>
  asyncHandler(async (req, _res, next) => {
    const { enabled } = await resolveModules(req.params.id);
    if (!enabled.includes(mod)) {
      throw BusinessRuleError(ERROR_CODES.MODULE_DISABLED, `The ${mod} module is not enabled for this business`);
    }
    next();
  });

// applied at the route, e.g. vendors.routes.ts
businessesRouter.post('/:id/menu', rateLimit('write'), authenticate,
  validate({ params: BusinessIdParam, body: CreateMenuItemBody }),
  requirePermission('business:manage_own', ownsBusiness),
  requireModule('menu'),                                    // ← new
  asyncHandler(vendorsController.addMenuItem));
```

| Route family | Module |
|---|---|
| `POST/PATCH /businesses/:id/menu*` | `menu` |
| `POST /orders`, `GET /businesses/:id/orders` | `ordering` |
| `/queues/business/:id*` | `queue` |
| `/wave-downs` (create for business) | `wave_down` |
| `POST /businesses/:id/services` | `services` |
| `POST /bookings`, `PUT /businesses/:id/availability` | `booking` |
| `/checkouts`, `/seller-agreement` | `consignment` |
| `/gifts` (for business) | `gifting` |
| `/giveaways` | `giveaways` |
| `/ping-budgets` | `ping_sharing` |

**Reads stay open.** Disabling `booking` must not 404 an existing booking — a customer with a confirmed appointment is owed that record. Only *creation* is gated.

---

## 5. Frontend

### `useBusinessModules(businessId)`

```ts
// src/features/vendor/hooks/useBusinessModules.ts
export function useBusinessModules(businessId: string | undefined) {
  return useQuery<ResolvedModules>({
    queryKey: keys.businessModules(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => api.get(endpoints.business(businessId!).modules),
    staleTime: 60_000,
  });
}
```

### Dashboard nav — the visible payoff

Today `src/app/(dashboard)/layout.tsx` is a **hardcoded 16-item list with no filtering**: a mechanic is offered "Menu", and **every vendor sees 5 Hub screens they do not own**. Replace with a module-tagged list filtered by the resolved set:

```ts
const NAV: (NavItem & { module: Module })[] = [
  { href: '/vendor',              label: 'Live Status',   module: 'live_presence' },
  { href: '/vendor/queue',        label: 'Queue',         module: 'queue' },
  { href: '/vendor/orders',       label: 'Orders',        module: 'ordering' },
  { href: '/vendor/menu',         label: 'Menu',          module: 'menu' },
  { href: '/vendor/services',     label: 'Services',      module: 'services' },   // new screen, BP-4
  { href: '/vendor/bookings',     label: 'Bookings',      module: 'booking' },
  { href: '/vendor/license',      label: 'License',       module: 'licensing' },
  { href: '/vendor/messages',     label: 'Messages',      module: 'messaging' },
  { href: '/vendor/analytics',    label: 'Analytics',     module: 'analytics' },
  { href: '/vendor/payouts',      label: 'Payouts',       module: 'payouts' },
  { href: '/vendor/ping-budget',  label: 'Ping Sharing',  module: 'ping_sharing' },
  { href: '/vendor/giveaways',    label: 'Giveaways',     module: 'giveaways' },
  { href: '/hub',                 label: 'Hub Inventory', module: 'hub_operations' },
  { href: '/hub/approvals',       label: 'Approvals',     module: 'hub_operations' },
  { href: '/hub/products',        label: 'Catalog',       module: 'hub_operations' },
  { href: '/hub/settlements',     label: 'Settlements',   module: 'hub_operations' },
  { href: '/hub/ai',              label: 'Hub AI',        module: 'hub_operations' },
];

const visible = NAV.filter((n) => enabled.includes(n.module));
```

Result — a mobile mechanic's sidebar goes from **16 items to 7**:
`Live Status · Wave-downs · Services · Messages · Analytics · Payouts` (+ `License` only if regulated).

### Route guards

Nav filtering is cosmetic; deep links must be handled. `VendorBusinessGate` (already the single place every vendor screen resolves its business) gains an optional module assertion:

```tsx
<VendorBusinessGate module="menu">
  {(businessId) => <MenuManager businessId={businessId} />}
</VendorBusinessGate>
```

A disabled module renders an actionable state — *"Menu isn't enabled for your business. Turn it on in Modules."* — never a 404 and never a dead end (`docs/06 §1`).

### Modules screen — `/vendor/modules`

The self-service surface: `available` minus `enabled` = "Add a capability"; `enabled` minus `locked` = toggleable. Locked modules show *why* ("Required — your category needs a license", "Always on").

### Customer profile

`/business/[id]` reads the same public endpoint to choose its primary action, which is what makes the tailoring visible to *customers*, not just owners:

| Enabled | Primary CTA |
|---|---|
| `booking` | **Book an appointment** |
| `ordering` + `menu` | **Order now** |
| `wave_down` | **Wave them down** |
| `catalog` | **Browse & reserve** |

---

## 6. Error codes

Added to `src/shared/errors/codes.ts` (extends `ERROR_HANDLING_STRATEGY.md`):

| Code | HTTP | Meaning |
|---|---|---|
| `MODULE_DISABLED` | 422 | Action requires a module this business has not enabled |
| `MODULE_NOT_AVAILABLE` | 422 | Module is not offered for this category's archetype |
| `MODULE_LOCKED` | 422 | Attempt to disable a core/auto module |

---

## 7. Testing requirements

- **Resolver unit tests** (pure, like `SimulationDirector`): each archetype's defaults; category override add/remove; `enabled_modules: undefined` → inherit; stored-but-unavailable module is dropped; core always present; auto rules for `requires_license` / `is_hub`.
- **Guard tests**: `POST /businesses/:id/menu` → 422 `MODULE_DISABLED` for an `appointment_service` business; 201 for `counter_serve`.
- **Read-not-gated test**: disabling `booking` keeps `GET /bookings/:id` working.
- **Nav test**: a mechanic's rendered sidebar contains no "Menu" and no Hub items.
- **Regression**: existing businesses with `enabled_modules: undefined` resolve to full archetype defaults (nothing disappears from the two live businesses).
