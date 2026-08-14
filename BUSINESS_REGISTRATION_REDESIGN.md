# StreetServe — Business Registration Redesign

> Replacing a 3-step form that configures nothing with a category-aware onboarding that builds a working business — and a setup checklist that finishes the job after the first sale.
> Depends on [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) (what to ask whom) and [BUSINESS_MODULE_SYSTEM.md](BUSINESS_MODULE_SYSTEM.md) (what it writes).
> Extends: `docs/13-screen-design-specs.md` (V-01), `SCREEN_TO_API_MAPPING.md` §7, `docs/03-user-flows.md`.

---

## 1. What exists today (V-01)

`src/features/vendor/components/VendorRegister.tsx` — a 3-step `WizardFlow`:

| Step | Asks | Writes |
|---|---|---|
| 1 · About your business | name, category | `POST /businesses { name, categoryId }` |
| 2 · Where do you operate? | service area (free text) | **nothing** — *"`serviceArea` (free text) has no backend field yet"* |
| 3 · Get paid | *(a Stripe banner — no action)* | **nothing** |

Then: `router.replace('/vendor')` → a dashboard with **16 nav items**, an empty Live Status, and no indication of what to do next.

### The four failures

1. **Step 2 lies.** The vendor types their service area; it is discarded. Worse than not asking.
2. **Step 3 is decoration.** It describes Stripe Connect but never calls `/payments/connect/onboard` — so "Get paid" leaves you unable to get paid.
3. **Nothing is configured.** No hours (field exists, no UI), no menu, no services, no modules. The business is a name and a category.
4. **The dashboard is undifferentiated.** Menu next to Bookings next to five Hub screens, for everyone.

Net: a vendor finishes "registration" and cannot transact. The wizard's own promise — *"you'll upload it after setup, before going live"* — pointed at a licence screen that did not exist until 2026-07-16.

---

## 2. Design principles

1. **Category first, and it decides everything.** The second question the vendor answers silently determines the archetype, the remaining steps, the default modules, and the licence requirement. One choice, maximum leverage.
2. **Never ask what we will not store.** Every question maps to a field. If there is no field, either build it or cut the question. (This is the direct fix for step 2.)
3. **Get to live fast, finish later.** Registration ends at the *minimum* to exist. Everything else moves to a **setup checklist** that survives across sessions. Onboarding is not a one-shot gate.
4. **Show the payoff during setup.** Adding the first menu item / service should preview the customer-facing card. Configuration with visible consequence.
5. **Every question is skippable except identity.** Name + category are required. Everything else can be deferred without dead-ending — the checklist remembers.

---

## 3. The new flow

```
        ┌──────────────────────────────┐
        │ 1 · What kind of business?   │   category picker (search + tabs + "something else")
        └──────────────┬───────────────┘
                       │  category → ARCHETYPE (invisible to the user)
        ┌──────────────▼───────────────┐
        │ 2 · The basics               │   name, hours, service area (map), logo
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼───────────────┐
        │ 3 · DYNAMIC — archetype step │   menu item │ service │ service+travel │ product
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼───────────────┐
        │ 4 · Get paid (real)          │   Stripe Connect hosted onboarding — skippable
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼───────────────┐
        │ Dashboard + setup checklist  │   tailored nav; checklist finishes the rest
        └──────────────────────────────┘
```

**4 steps for every archetype**, but step 3 differs — and steps 2/4 finally *write* something.

### Step 1 — What kind of business?

The most important screen. Category is currently the second field of a form; it becomes the entry point.

- Searchable list grouped by tab (Food · Coffee · Services · Shopping · More) from `GET /catalog/categories`.
- Each row: name + one-line plain-English description + 🔒 badge when `requires_license`.
- **"Something else"** → the existing `/category-suggestions` flow (already built): capture the proposed name, register under the closest archetype meanwhile, and let an admin formalise it. A vendor is never blocked by a missing category.
- Licence is disclosed **here**, before any effort is invested: *"Coffee Cart needs a County Health permit before you can go live. You can register now and upload it after."*

### Step 2 — The basics

| Field | Writes | Notes |
|---|---|---|
| Business name | `businesses.name` | required |
| Logo | `businesses.logo_url` | existing presigned upload (`uploadImage`) |
| **Operating hours** | `businesses.hours` | **field exists today with no UI** — finally populated |
| **Service area** | `businesses.service_area` / `service_radius_m` | **new fields** — map radius picker, not free text |

Service area becomes a map + radius control centred on the vendor's location. This kills the "typed into the void" bug *and* feeds discovery.

### Step 3 — The archetype step (the whole point)

| Archetype | Screen | Writes |
|---|---|---|
| **Counter-serve** | "Add your first menu item" — name, price, photo. Optional: line-up discount schedule. | `POST /businesses/:id/menu` |
| **Appointment-service** | "Add your first service" — name, duration, price. Optional: deposit. | `POST /businesses/:id/services` |
| **On-demand service** | "What do you do & what do you charge?" — service, callout fee, travel radius. | `POST /businesses/:id/services` + `travel_fee_cents` |
| **Goods-seller** | "Add your first product" — name, price, photo, qty. | catalog product |

Each is **skippable** ("I'll add this later") → lands in the checklist. Each shows a **live preview of the customer-facing card** as it is typed.

### Step 4 — Get paid (for real)

Replace the banner with the actual call: `POST /payments/connect/onboard` → redirect to Stripe's hosted flow → return via `CONNECT_RETURN_URL` (already configured in backend env).

Skippable — a vendor may want to look around first — but then it is checklist item #1, because `payoutAccountLinked: false` means money cannot move.

---

## 4. The setup checklist

The single most valuable addition, and the reason registration can stay at 4 steps. Persistent on the vendor home until complete; each item is derived from **real state**, never a stored flag:

| Item | Derived from | Blocks going live? |
|---|---|---|
| Upload your license | `licensing` enabled ∧ no approved doc | **Yes** — `isBusinessLicensedForLiveOps` |
| Connect payouts | `payoutAccountLinked === false` | No — but blocks getting paid |
| Add your first menu item / service / product | archetype's primary collection is empty | No |
| Set your operating hours | `hours` empty | No |
| Set your service area | `service_area` empty | No |
| Add a photo | `logo_url` empty | No |

Deriving from state (rather than a `setup_completed` flag) means the checklist is **always truthful** — delete your last menu item and the item returns. It also needs no migration and cannot drift.

**Ordering rule:** whatever blocks going live sorts first. The checklist is a path to the first sale, not a chore list.

---

## 5. Screen inventory

| Screen | Route | Status |
|---|---|---|
| V-01a Category picker | `/vendor/register` step 1 | **New** |
| V-01b Basics (name/logo/hours/area) | step 2 | **New** (replaces "service area" step) |
| V-01c Archetype step | step 3 | **New** ×4 variants |
| V-01d Payouts | step 4 | **Rewrite** — real Connect call |
| V-01e Setup checklist | `/vendor` (on home) | **New** |
| V-02 Live Status | `/vendor` | Exists — gains checklist + module-filtered nav |
| V-06 Services manager | `/vendor/services` | **New screen** — API exists, no UI |
| V-09 Modules | `/vendor/modules` | **New** |
| V-10 Business settings | `/vendor/settings` | **New** — hours/area/logo post-registration |

**`/vendor/services` is the notable gap**: `GET/POST /businesses/:id/services` has existed all along with no screen — appointment and on-demand businesses currently cannot manage the thing they sell.

---

## 6. Accessibility & responsive

Inherits the existing contract — no new rules, but these are the ones this flow will trip over:

- `WizardFlow` already provides step semantics; keep one `<h1>` per step and move focus to it on step change.
- The category picker is a **search + list**, not a native `<select>` — needs `role="listbox"`/`option` semantics and full keyboard operation (today's `<Select>` is fine but does not scale past ~25 rows).
- Service-area map needs a **non-map fallback**: a radius stepper + text address. Never require a map gesture to complete registration (`LANDING_PAGE_ACCESSIBILITY.md` §5 precedent).
- Licence upload is images-only (`proof` storage purpose) — state it before the file picker, as the built screen already does.
- Every skip is a real button, never a hidden "×".

---

## 7. Migration & compatibility

- **Existing businesses keep working.** `enabled_modules: undefined` → archetype defaults; a null `hours`/`service_area` simply surfaces checklist items.
- The two live dev businesses (**Coffee Plug**, **Software developer**) will resolve to `counter_serve` defaults once `categories.archetype` is backfilled — Coffee Plug correctly gains Menu/Ordering/Queue and loses the five Hub tabs.
- **"Software developer"** is a useful canary: it is a real business registered under a mobile-business taxonomy where it does not belong. It should surface via the *"Something else"* path in the redesign, and is a live argument for the category-suggestion flow.
- No destructive migration. `service_area` is additive; the discarded free-text service area was never stored, so there is nothing to convert.
