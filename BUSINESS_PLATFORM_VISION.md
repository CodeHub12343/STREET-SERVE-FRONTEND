# StreetServe — Business Platform Vision

> Where StreetServe is going for the businesses that live on it, what we are deliberately **not** building yet, and why.
> Companion docs: [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) · [BUSINESS_MODULE_SYSTEM.md](BUSINESS_MODULE_SYSTEM.md) · [BUSINESS_REGISTRATION_REDESIGN.md](BUSINESS_REGISTRATION_REDESIGN.md) · [BUSINESS_IMPLEMENTATION_ROADMAP.md](BUSINESS_IMPLEMENTATION_ROADMAP.md)
> Existing sources of truth this extends (does not replace): `docs/05-prd-functional-spec.md`, `docs/13-screen-design-specs.md`, `DATABASE_SCHEMA_PLAN.md`, `API_SPECIFICATION.md`.

---

## 1. The honest starting point

The instinct behind this initiative — *"businesses can't configure how their business actually operates"* — is correct. The diagnosis was not. An audit of the codebase (2026-07-16) found that **most of the capability already exists and is wired to real APIs**:

| Capability | Status | Evidence |
|---|---|---|
| Menu builder | **Built** | `/vendor/menu` → `GET/POST/PATCH /businesses/:id/menu`, today's-special |
| Services | **Built** | `GET/POST /businesses/:id/services` |
| Booking / appointments | **Built** | `/bookings` (+ `/mine`, cancel, no-show, complete), `/businesses/:id/availability`, `/vendor/bookings`, `/business/[id]/book` |
| Online ordering | **Built** | `/orders` create → accept → ready → complete → cancel, `/business/[id]/order`, `/order/[id]/pay` |
| Line-up discounts | **Built** | `/queues/:ownerType/:ownerId` + `/discount-schedule` |
| Wave-down (dispatch) | **Built** | `/wave-downs`, `/vendor/wave-downs` |
| Live presence | **Built** | `/live-sessions` start/location/status/pop-up/stop |
| Inventory / consignment | **Built** | `/hubs`, `/checkouts`, `/seller-agreement`, `/hub/products`, `/seller/inventory` |
| Promotions / giveaways | **Built** | `/giveaways`, `/vendor/giveaways` |
| Gift cards | **Built** | `/gifts`, `/business/[id]/gift`, `/gift/[code]` |
| Analytics | **Built** | `/businesses/:id/dashboard`, `/vendor/analytics` |
| Payouts | **Built** | `/payments/connect/onboard`, `/transactions` |
| Messaging | **Built** | `/message-threads` |
| Custom categories | **Built** | `/category-suggestions` (vendor-proposed taxonomy) |

**73 routes. 24 frontend feature modules. 24 backend modules.** StreetServe is not a business-profile app that needs a platform bolted on. It is already a platform whose capabilities are **invisible, unconfigured, and shown to the wrong businesses**.

### What is actually broken

1. **Registration configures nothing.** Three steps — name+category → service area → a payouts *banner*. It never touches menu, services, hours, or capability selection. Step 2 is worse than nothing: `serviceArea` is **UI-only with no backend field**, so what the vendor types is silently discarded.
2. **Nothing is category-aware.** The dashboard nav is a hardcoded 16-item list with **zero filtering** — no role check, no category check. A mobile mechanic is offered **"Menu"**. A food truck is offered **"Bookings"**. **Every vendor sees five Hub screens** (Hub Inventory, Approvals, Catalog, Settlements, Hub AI) for a hub they do not own.
3. **Operating hours** exist as a DB field (`businesses.hours`) with **no UI anywhere**.
4. **No concept of a module.** Nothing in the schema or API expresses "this business does ordering but not booking".

The gap between "we have 20 capabilities" and "this app was built for *my* business" is **one system**: category-driven module selection. That is this initiative.

---

## 2. Vision

> **StreetServe is the operating system for mobile businesses — and it should feel like it was built for exactly one of them: yours.**

A food truck should never see the word "appointment". A mobile barber should never see "menu item". A plant seller should see a catalog, not a queue. Same platform, same data model, same code — a different *product* per business type.

This is achieved not by forking the product per category, but by **composing it from modules** whose defaults are derived from the business's category.

### The three principles

1. **Modules, not monoliths.** Every capability is an independently enable-able module. A business runs only what it needs. The dashboard, the customer profile, and the API surface all reflect the enabled set.
2. **Smart defaults, full control.** Category determines what gets switched on at registration — so onboarding is short and the first-run experience is tailored. Everything remains overridable: an unusual business is a first-class citizen, never a bug.
3. **Earn the next module.** Modules are introduced when they become relevant (first order, first repeat customer, first hire), not dumped in a 16-item sidebar on day one. Complexity scales with the business, not with our ambition.

---

## 3. The archetype insight

25 categories do not need 25 onboarding flows. They collapse into **four archetypes** that predict ~90% of a business's needs:

| Archetype | Sells | Core loop | Examples |
|---|---|---|---|
| **Counter-serve** | Product, on the spot | Go live → queue forms → order → pay | Food Truck, Coffee Cart, Dessert & Ice Cream, BBQ |
| **Appointment-service** | Time, scheduled | Publish services → customer books → complete | Barber, Beauty, Nails, Pet Grooming, Notary, DJ |
| **On-demand service** | Time, dispatched | Go live → wave-down → quote → complete | Mechanic, Locksmith, Car Wash, Detailing, Device/Bike Repair |
| **Goods-seller** | Physical goods | List catalog → order/reserve → hand off | Handmade, Apparel, Art, Books, Plants, Faith-Based |

The archetype is a property of the **category**, so it is inherited automatically at registration and needs no extra question. See [BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md).

This is the single highest-leverage abstraction in this plan: it turns "support every business type" from an N-problem into a 4-problem, and every future category slots into an existing archetype for free.

---

## 4. Scope discipline — what we are NOT building yet

StreetServe is **pre-launch, one city (Modesto), with zero real vendors**. The brief proposed CRM, subscriptions, invoices, estimates, employee management, rent-to-own, POS, payroll, financing, insurance, and an API platform.

**Every one of those is deferred**, for reasons that are strategic rather than technical:

- **Nothing is validated yet.** Not one real vendor has completed the core loop (go live → get discovered → take money). Building a CRM before a single customer relationship exists is designing for an imagined user.
- **Surface area is a liability, not an asset.** Each module is code to maintain, a migration to run, a screen to keep accessible, a support burden. We just found that going live failed *silently* and the licence upload screen did not exist despite registration promising it. The existing 20 capabilities are not yet trustworthy end-to-end — that debt compounds under 20 more.
- **The module system makes deferral cheap.** Once modules are a first-class concept, adding "invoices" later is a row in a matrix and a screen — not a re-architecture. Building the system *first* is what makes the long vision affordable.

Deferred modules are not forgotten — they are scoped in [BUSINESS_IMPLEMENTATION_ROADMAP.md](BUSINESS_IMPLEMENTATION_ROADMAP.md) §5 with the trigger that should unlock each.

**The bar for adding a module post-launch:** a real vendor asked for it, or a measured drop-off demands it.

---

## 5. What "done" looks like for this initiative

A mobile mechanic registers on StreetServe and:

1. Picks **Mobile Mechanic**; is asked about **service area, travel fee, and callout rate** — never about menus or table service.
2. Lands on a dashboard with **Live Status, Wave-downs, Services, Jobs, Payouts** — five relevant items, not sixteen mostly-irrelevant ones.
3. Sees a **setup checklist** ("add your first service", "set your hours", "connect payouts") instead of an empty dashboard.
4. Can turn on **Booking** later, from a Modules screen, when they decide to take scheduled work — and it appears in their nav and on their public profile the moment they do.
5. Never encounters a screen that does not apply to them.

Meanwhile a food truck registering the same day is asked about **menu, hours, and line-up discounts**, and never sees the word "appointment".

Same codebase. Two products.

---

## 6. Success measures

| Measure | Why it matters |
|---|---|
| Registration completion rate | The redesign must not lengthen onboarding — the *number of questions per business should fall* while relevance rises |
| Time-to-first-live | The real activation metric: registration → go live |
| Setup-checklist completion at day 7 | Proxy for "did the business actually configure itself" |
| Irrelevant nav items per business | Target: **0** (today: up to 11 of 16) |
| Modules enabled beyond defaults at day 30 | Proves the module concept is discoverable, not just tidy |

---

## 7. Non-goals

- **Not a website builder.** No theming, no custom domains, no page editor.
- **Not a general-purpose POS.** In-person card-present hardware is out of scope for the pilot.
- **Not multi-location/franchise.** One business = one live presence for now (multi-business per owner exists in the data model but has no switcher UI — see roadmap BP-2).
- **Not a replacement for accounting/payroll.** Integrations, if ever, not rebuilds.
