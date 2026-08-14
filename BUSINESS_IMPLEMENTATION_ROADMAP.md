# StreetServe — Business Platform Implementation Roadmap

> Phased delivery of the module system and category-aware registration, mapped to code that exists today. Each phase ships something a real vendor can feel.
> Plan docs: [BUSINESS_PLATFORM_VISION.md](BUSINESS_PLATFORM_VISION.md) · [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) · [BUSINESS_MODULE_SYSTEM.md](BUSINESS_MODULE_SYSTEM.md) · [BUSINESS_REGISTRATION_REDESIGN.md](BUSINESS_REGISTRATION_REDESIGN.md)
> Convention follows `LANDING_PAGE_IMPLEMENTATION_ROADMAP.md` (LP-1…LP-6): phase · scope · **Exit**.

---

## 0. Sequencing logic

**BP-1 before everything.** The resolver is the dependency of every other phase, it is pure and unit-testable, and it ships with zero user-visible risk (defaults reproduce today's behaviour).

**BP-2 before BP-3.** Filtering the nav is a ~1-day change that delivers the single most visible win — a mechanic's sidebar drops 16 → 7 — and it validates the resolver against real screens *before* the registration rewrite depends on it.

**Fix the lie early.** BP-3 kills the discarded service-area field and the fake payouts step. Those are actively misleading today.

**Ship-anywhere rule:** every phase leaves `main` releasable. No phase requires the next to be correct.

---

## 1. BP-1 · Module resolver (foundation)

**Scope**
`ARCHETYPES` + `MODULES` + `CORE_MODULES` in `src/config/constants.ts` · `categories.archetype` + `categories.module_overrides` · `businesses.enabled_modules` (nullable = inherit) · `modules.service.ts` `resolveModules()` · migration backfilling `archetype` for all 25 categories per [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) §5 · `GET /businesses/:id/modules` (public) · `PUT /businesses/:id/modules` (owner) · `MODULE_DISABLED` / `MODULE_NOT_AVAILABLE` / `MODULE_LOCKED` error codes.

New seed migration follows the established pattern (idempotent upsert, applied by `npm run seed` which already picks up every `*-seed-*` file).

**Exit:** resolver unit tests green (defaults per archetype · category overrides · `undefined` → inherit · unavailable-module dropped · core forced · auto rules for `requires_license`/`is_hub`). `GET /businesses/:id/modules` returns correct sets for both live businesses. **No user-visible change** — pure foundation.

---

## 2. BP-2 · Module-aware dashboard (the visible win)

**Scope**
`useBusinessModules` hook · tag all 16 `NAV` items in `src/app/(dashboard)/layout.tsx` with a module and filter by the resolved set · `VendorBusinessGate` gains an optional `module` prop rendering an actionable "not enabled" state (never 404) · `/vendor/modules` screen (enable/disable, locked reasons) · `requireModule` middleware applied to the write routes in [BUSINESS_MODULE_SYSTEM.md](BUSINESS_MODULE_SYSTEM.md) §4.

**Exit:** a `mobile-mechanic` business shows **7 nav items, no Menu, no Hub screens** (today: 16). A `food-truck` shows Menu/Orders/Queue and no Bookings. Deep-linking a disabled module renders the actionable state. `POST /businesses/:id/menu` → 422 `MODULE_DISABLED` for an appointment business; reads remain open. Existing businesses lose nothing.

> This phase alone fixes the reported complaint ("every vendor sees Hub Inventory / Hub AI") and is worth shipping even if the rest slips.

---

## 3. BP-3 · Registration redesign

**Scope**
Category-first picker (search + tabs + licence disclosure + "Something else" → existing `/category-suggestions`) · basics step writing **`hours`** (field exists, no UI today) and **`service_area`/`service_radius_m`** (new fields — kills the discarded free-text input) · dynamic archetype step ×4 (menu item │ service │ service+travel │ product), each skippable with live preview · **real** Stripe Connect step calling `POST /payments/connect/onboard` (replaces the decorative banner) · `enabled_modules` seeded from resolved defaults at creation.

**Exit:** registering as Mobile Mechanic never mentions a menu; as Food Truck never mentions appointments. Service area and hours **persist** (verify by re-reading `GET /businesses/:id`). "Get paid" reaches Stripe's hosted flow and returns via `CONNECT_RETURN_URL`. Every step skippable except name+category. Registration → live for an unregulated category in ≤ 4 steps.

---

## 4. BP-4 · Setup checklist + Services manager

**Scope**
Setup checklist on `/vendor` home, **derived from live state** (never a stored flag) per [BUSINESS_REGISTRATION_REDESIGN.md](BUSINESS_REGISTRATION_REDESIGN.md) §4, go-live blockers sorted first · **`/vendor/services` screen** — `GET/POST /businesses/:id/services` has existed all along with **no UI**, so appointment/on-demand businesses currently cannot manage what they sell · `/vendor/settings` for post-registration hours/area/logo.

**Exit:** a business with no menu item, no hours and no payouts shows exactly three checklist items; adding a menu item removes its item without a refresh; deleting the last one brings it back (proves derivation). A mobile barber can create/edit/delete services and they appear on the customer profile.

---

## 5. BP-5 · Category & archetype governance

**Scope**
`archetype` selector added to the admin category-suggestion review form so an approved custom category inherits a complete product automatically · admin category CRUD surfacing `archetype` / `requires_license` / `regulated_by` · seed the proposed categories from [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) §6 (Pressure Washing, Landscaping, Roadside Assistance, Cleaning, Moving, Courier, Mobile Boutique) · **Mobile Medical excluded pending legal review.**

**Fix while here:** the category-suggestion *listing* is still demo-only (`useCategoryReview`'s `queryFn` returns `demoCategoryReview()` unconditionally — there is no listing endpoint). Needs `GET /admin/category-suggestions`, mirroring the licence queue built on 2026-07-16.

**Exit:** an admin approves a suggested category with an archetype; a business registering under it gets correct modules with no code change. Category suggestions list real data.

---

## 6. BP-6 · Customer-side tailoring

**Scope**
`/business/[id]` chooses its primary CTA from the public modules endpoint (Book │ Order │ Wave │ Browse) · hide irrelevant profile sections (no menu tab for a barber) · map/list results reflect the business's actual capability.

**Exit:** a barber's profile leads with **Book**, a food truck with **Order**, a locksmith with **Wave them down** — with no per-category branching in the components.

---

## 7. Deferred — and what unlocks each

Scoped, not forgotten (see [BUSINESS_PLATFORM_VISION.md](BUSINESS_PLATFORM_VISION.md) §4). Each is a module id + a screen once BP-1 lands; none is a re-architecture.

| Module | Unlock trigger |
|---|---|
| Employee management | A vendor runs >1 person on one business |
| CRM / customer notes | Repeat-customer rate is measurable and non-trivial |
| Subscriptions | A vendor asks for recurring revenue (coffee clubs are the likely first) |
| Invoices / estimates | On-demand vendors quote before work — likely the **first** deferred module needed |
| Loyalty / coupons | Post-launch retention work; `giveaways` covers acquisition today |
| Rent-to-own | Consignment proves out first |
| POS / card-present | Real in-person volume + hardware decision |
| Payroll · financing · insurance · public API | Not before meaningful GMV; integrate, don't rebuild |

**Bar for promotion:** a real vendor asked, or a measured drop-off demands it.

---

## 8. Docs to extend when each phase lands

Per the 5-doc decision, these are **edits in place**, not new files:

| Doc | Phase | Edit |
|---|---|---|
| `DATABASE_SCHEMA_PLAN.md` §2 | BP-1 | `categories.archetype`, `module_overrides`, `businesses.enabled_modules`, `service_area` |
| `API_SPECIFICATION.md` | BP-1 | `GET`/`PUT /businesses/:id/modules` |
| `ERROR_HANDLING_STRATEGY.md` | BP-1 | 3 new codes |
| `ROUTING_STRUCTURE.md` §6 | BP-2 | module-filtered nav; `/vendor/modules` |
| `docs/13-screen-design-specs.md` | BP-3/4 | V-01a–e, V-06 services, V-09 modules, V-10 settings |
| `SCREEN_TO_API_MAPPING.md` §7 | BP-3/4 | new screens → endpoints |
| `FRONTEND_FEATURE_INVENTORY.md` / `BACKEND_FEATURE_INVENTORY.md` | each | mark modules shipped |
| `audit/MISSING_FEATURES.md` | BP-4 | remove services-UI gap once built |

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Resolver wrong → a business loses a screen it was using | `undefined` = inherit + intersect-with-available; BP-1 ships with **no UI change**; regression test asserts both live businesses keep every current capability |
| Archetype is too coarse for a real business | Every optional module is user-toggleable; `⬜` (available) is deliberately generous. A needed 5th archetype is an escalation signal, not a silent fork |
| Registration gets longer, not shorter | Hard cap: **4 steps, ≤6 questions**; everything else is checklist. Measure completion rate before/after |
| Module gates break existing flows | Gate **writes only**; reads stay open. Full suite (40 FE / 79 BE) green per phase |
| Scope creep back toward the enterprise brief | §7 trigger table is the contract — "a real vendor asked" |
| `enabled_modules` drifts from a changed category | Resolution always re-intersects with the current archetype's `available` |

---

## 10. Definition of done

1. A mobile mechanic and a food truck registering on the same day see **materially different products** — different questions, different nav, different customer CTA — from one codebase.
2. **Zero** irrelevant nav items for any business (today: up to 11 of 16).
3. Every registration question **persists** (no repeat of the discarded service-area field).
4. A vendor can enable a capability later, unaided, from `/vendor/modules`.
5. A new category is a **row + archetype**, not a code change.
