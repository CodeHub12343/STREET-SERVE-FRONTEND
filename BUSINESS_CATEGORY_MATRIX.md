# StreetServe — Business Category Matrix

> The mapping that makes StreetServe feel bespoke per business type: **category → archetype → default modules → onboarding questions**.
> Read with [BUSINESS_MODULE_SYSTEM.md](BUSINESS_MODULE_SYSTEM.md) (how it is enforced) and [BUSINESS_REGISTRATION_REDESIGN.md](BUSINESS_REGISTRATION_REDESIGN.md) (how it is asked).
> Taxonomy source of truth: `migrations/20260705000002-seed-reference-data.js` + `migrations/20260716000001-seed-categories-expansion.js` (25 rows live as of 2026-07-16).

---

## 1. Why archetypes

25 categories today, hundreds eventually. Mapping each one to modules by hand does not scale and drifts immediately.

Instead every category declares **one archetype**. The archetype supplies the defaults; the category may add a small override. A new category is then a one-line addition that inherits a complete, sensible product.

```
category (25 rows, grows)
   └─ archetype (4, stable)          ← supplies default modules + onboarding steps
        └─ overrides (rare)          ← per-category tweaks only where genuinely different
             └─ business.enabled_modules  ← the owner's final say, always wins
```

**Rule:** if a new category needs a fifth archetype, that is a signal worth escalating — not a reason to fork the matrix.

---

## 2. The four archetypes

| Archetype | id | Sells | Core loop | Never needs |
|---|---|---|---|---|
| **Counter-serve** | `counter_serve` | Product, immediately, from a vehicle/cart | go live → line forms → order → pay | appointments, availability calendar |
| **Appointment-service** | `appointment_service` | Time, booked ahead | publish services → customer books → travel → complete | menu, line-up queue |
| **On-demand service** | `on_demand_service` | Time, dispatched now | go live → wave-down → quote → complete | menu, (booking optional) |
| **Goods-seller** | `goods_seller` | Physical goods | list catalog → order/reserve → hand off | queue, availability calendar |

### Distinguishing appointment vs on-demand

Both sell labour; the difference is **who initiates and when**, and it changes the whole product:

- **Appointment** — the customer picks a *future slot*. Needs availability, deposits, reminders, cancellation rules. (Barber, nails, grooming.)
- **On-demand** — the customer needs help *now*, wherever they are. Needs live presence, wave-down dispatch, travel radius, quotes. (Locksmith, mechanic.)

Several categories legitimately do both (a detailer takes booked jobs *and* walk-ups). Those default to their primary archetype and can enable the other module — this is exactly what the module system is for, and why archetype is a *default*, not a cage.

---

## 3. Module vocabulary

Every module maps to capability that **already exists** in the codebase (see [BUSINESS_PLATFORM_VISION.md](BUSINESS_PLATFORM_VISION.md) §1). Nothing here is speculative.

| Module id | Vendor surface | Backing API | Notes |
|---|---|---|---|
| `live_presence` | Live Status | `/live-sessions/*` | **Core — always on.** Go live, driving/parked/away, pop-up |
| `profile` | Business profile | `/businesses/:id` | **Core — always on** |
| `reviews` | Reviews | `/reviews` | **Core — always on** |
| `messaging` | Messages | `/message-threads` | **Core — always on** |
| `payouts` | Payouts | `/payments/connect/onboard`, `/transactions` | **Core — always on** (money is not optional) |
| `analytics` | Analytics | `/businesses/:id/dashboard` | **Core — always on** |
| `licensing` | License | `/businesses/:id/license-documents` | **Auto** — on iff `category.requires_license` |
| `menu` | Menu | `/businesses/:id/menu` | Product list w/ today's-special |
| `ordering` | Orders | `/orders`, `/businesses/:id/orders` | Accept → ready → complete |
| `queue` | Queue | `/queues/:ownerType/:ownerId` (+ `/discount-schedule`) | Line-up + early-bird discounts |
| `wave_down` | Wave-downs | `/wave-downs` | Customer-initiated dispatch |
| `services` | Services | `/businesses/:id/services` | Named service + duration + price |
| `booking` | Bookings | `/bookings`, `/businesses/:id/availability` | Calendar, no-show, complete |
| `catalog` | Catalog | `/hubs`, `/hub/products` | Goods listing (distinct from menu) |
| `consignment` | Consignment | `/checkouts`, `/seller-agreement` | Supply street sellers |
| `gifting` | Gift cards | `/gifts` | Buy-for-a-friend |
| `giveaways` | Giveaways | `/giveaways` | Promotions |
| `ping_sharing` | Ping Sharing | `/ping-budgets`, `/pings` | Pay customers to spread the word |
| `ai_assistant` | AI | `/ai` | Suggestions |
| `hub_operations` | Hub Inventory/Approvals/Settlements | `/hubs/*` | **Auto** — on iff `business.is_hub` |

**Core modules cannot be disabled.** A business without payouts or presence is not a business on StreetServe.

---

## 4. Archetype → default modules

✅ on by default · ⬜ available, off by default · ➖ not offered (hidden entirely)

| Module | Counter-serve | Appointment | On-demand | Goods-seller |
|---|:--:|:--:|:--:|:--:|
| `live_presence` | ✅ | ✅ | ✅ | ✅ |
| `profile` `reviews` `messaging` `payouts` `analytics` | ✅ | ✅ | ✅ | ✅ |
| `menu` | ✅ | ➖ | ➖ | ⬜ |
| `ordering` | ✅ | ⬜ | ⬜ | ✅ |
| `queue` | ✅ | ➖ | ⬜ | ⬜ |
| `wave_down` | ✅ | ⬜ | ✅ | ⬜ |
| `services` | ➖ | ✅ | ✅ | ➖ |
| `booking` | ⬜ | ✅ | ⬜ | ➖ |
| `catalog` | ➖ | ➖ | ➖ | ✅ |
| `consignment` | ⬜ | ➖ | ➖ | ✅ |
| `gifting` | ⬜ | ⬜ | ➖ | ⬜ |
| `giveaways` | ⬜ | ⬜ | ⬜ | ⬜ |
| `ping_sharing` | ⬜ | ⬜ | ⬜ | ⬜ |
| `ai_assistant` | ⬜ | ⬜ | ⬜ | ⬜ |

**Reading the ➖ column matters most.** It is the difference between today's 16-item sidebar and a product that fits. A mechanic is *never* offered a menu; a barber is *never* offered a line-up queue.

### Why `menu` ➖ for services

A menu is a *product* list with today's-special semantics; a service is a *duration + price + travel* record. Merging them ("just call it a menu") is the mistake that makes vertical SaaS feel generic. They stay separate.

### Why `queue` ⬜ (not ➖) for on-demand

A mobile car wash at a festival genuinely forms a line. It is off by default because it is unusual, but offering it is correct.

---

## 5. Category → archetype (all 25 live categories)

| Category (slug) | Tab | Archetype | Licence | Override |
|---|---|---|---|---|
| Food Truck (`food-truck`) | food | `counter_serve` | 🔒 County Health | — |
| Food Cart (`food-cart`) | food | `counter_serve` | 🔒 County Health | — |
| BBQ & Smoker (`bbq-smoker`) | food | `counter_serve` | 🔒 County Health | — |
| Dessert & Ice Cream (`dessert-truck`) | food | `counter_serve` | 🔒 County Health | — |
| Coffee Cart (`coffee-cart`) | coffee | `counter_serve` | 🔒 County Health | — |
| Juice & Smoothies (`mobile-juice-smoothie`) | coffee | `counter_serve` | 🔒 County Health | — |
| Mobile Barber & Hair (`mobile-barber`) | services | `appointment_service` | 🔒 CA Barbering & Cosmetology | — |
| Mobile Beauty & Esthetics (`mobile-beauty`) | services | `appointment_service` | 🔒 CA Barbering & Cosmetology | — |
| Mobile Nails (`mobile-nails`) | services | `appointment_service` | 🔒 CA Barbering & Cosmetology | — |
| Mobile Pet Grooming (`mobile-pet-grooming`) | services | `appointment_service` | — | — |
| Mobile Notary (`mobile-notary`) | services | `appointment_service` | 🔒 CA Secretary of State | — |
| Mobile DJ & Events (`mobile-dj-events`) | services | `appointment_service` | — | `+deposits` (events warrant one) |
| Mobile Mechanic (`mobile-mechanic`) | services | `on_demand_service` | — | — |
| Mobile Locksmith (`mobile-locksmith`) | services | `on_demand_service` | — | — |
| Mobile Car Wash (`mobile-car-wash`) | services | `on_demand_service` | — | — |
| Mobile Detailing (`mobile-detailing`) | services | `on_demand_service` | — | `booking` ✅ (commonly booked) |
| Phone & Device Repair (`mobile-device-repair`) | services | `on_demand_service` | — | — |
| Bike Repair (`mobile-bike-repair`) | services | `on_demand_service` | — | — |
| Handmade & Crafts (`handmade-crafts`) | shopping | `goods_seller` | — | — |
| Apparel & Accessories (`apparel-accessories`) | shopping | `goods_seller` | — | — |
| Art & Prints (`art-prints`) | shopping | `goods_seller` | — | — |
| Books & Media (`books-media`) | shopping | `goods_seller` | — | — |
| Plants & Garden (`plants-garden`) | shopping | `goods_seller` | — | — |
| Faith-Based Products (`faith-based`) | more | `goods_seller` | — | — |
| Fundraising Goods (`fundraising-goods`) | more | `goods_seller` | — | `consignment` ✅ (the point of the category) |

🔒 = `requires_license: true` → `licensing` module auto-enabled and **go-live is gated** until an admin approves (`isBusinessLicensedForLiveOps`).

---

## 6. Proposed new categories

The brief named business types absent from the taxonomy. Each slots into an existing archetype — no new archetype needed, which validates the model.

| Proposed | Tab | Archetype | Licence | Rationale |
|---|---|---|---|---|
| Pressure Washing | services | `on_demand_service` | — | Named in brief; common mobile trade |
| Landscaping & Lawn | services | `on_demand_service` | — | Named in brief |
| Roadside Assistance | services | `on_demand_service` | — | Named in brief; the purest wave-down case |
| Cleaning Services | services | `appointment_service` | — | Named in brief; scheduled, recurring |
| Moving & Hauling | services | `appointment_service` | — | Named in brief; quoted + scheduled |
| Courier & Delivery | services | `on_demand_service` | — | Named in brief |
| Mobile Boutique | shopping | `goods_seller` | — | Named in brief |
| Mobile Medical / Wellness | services | `appointment_service` | 🔒 **CA medical board — requires legal review** | **Do not ship without counsel.** Regulated healthcare is a categorically different risk class (HIPAA-adjacent, licensure, insurance). Flagged, not scheduled. |

**Custom categories are already solved:** `/category-suggestions` lets a vendor propose one, and an admin approves it (setting `requires_license`, `regulated_by`, `top_level_tab`). The only addition needed is an **`archetype` field on the review form** so a newly approved category inherits a product automatically. See roadmap BP-5.

---

## 7. Onboarding questions per archetype

What registration asks — and, critically, what it never asks. Full flow in [BUSINESS_REGISTRATION_REDESIGN.md](BUSINESS_REGISTRATION_REDESIGN.md).

| Question | Counter-serve | Appointment | On-demand | Goods-seller |
|---|:--:|:--:|:--:|:--:|
| Business name, category | ✅ | ✅ | ✅ | ✅ |
| Operating hours | ✅ | ✅ | ✅ | ✅ |
| Service area (geo) | ✅ | ✅ | ✅ | ✅ |
| Licence upload (if regulated) | ✅ | ✅ | ✅ | ✅ |
| First menu item | ✅ | ➖ | ➖ | ➖ |
| Line-up discount schedule | ⬜ | ➖ | ➖ | ➖ |
| First service (+duration, price) | ➖ | ✅ | ✅ | ➖ |
| Travel fee / radius | ➖ | ✅ | ✅ | ➖ |
| Callout / minimum charge | ➖ | ⬜ | ✅ | ➖ |
| Deposit policy | ➖ | ⬜ | ➖ | ➖ |
| First catalog product | ➖ | ➖ | ➖ | ✅ |
| Supply street sellers? (consignment) | ➖ | ➖ | ➖ | ⬜ |

**Target: ≤6 questions to first live**, and every one of them relevant. Today's flow asks 3 questions, one of which (service area) is discarded — so the redesign adds *relevance*, not friction.

---

## 8. Data model implications

Two fields on `categories`, one on `businesses`. Detail in [BUSINESS_MODULE_SYSTEM.md](BUSINESS_MODULE_SYSTEM.md) §2.

```js
// categories  (extends the existing schema in src/modules/catalog/catalog.model.ts)
archetype: { type: String, enum: ARCHETYPES, required: true },
module_overrides: { type: Schema.Types.Mixed, default: {} },  // { booking: true }

// businesses  (extends src/modules/vendors/vendors.model.ts)
enabled_modules: { type: [String], default: undefined },  // undefined = "inherit defaults"
```

`enabled_modules: undefined` deliberately means *inherit*, not *none* — so changing an archetype default improves every existing business that never customised, while explicit choices are preserved forever.
