# Frontend ↔ Backend API Contract Reconciliation

Result of a sweep comparing every frontend `api.*` call (paths in `src/lib/api/endpoints.ts`
and the feature hooks) against the backend's Zod request schemas and response shapes
(`STREET-SERVE-APPLICATION-BACKEND/src/modules/**/*.schema.ts` + route handlers).

**Context that matters:** the frontend has a demo mode (`NEXT_PUBLIC_MAP_DEMO=true`, see
`src/lib/env.ts`). Many hooks short-circuit to fake data in demo mode and only hit the real
backend when it's off. Much of the UI appears to have been built/verified against demo data, so
the real-backend request/response contracts drifted. This sweep is that drift, itemized.

Legend:
- ✅ **Fixed** — corrected in this pass.
- 🟡 **Safe rename** — 1:1 field/enum rename, low risk, fixed in this pass.
- 🔴 **Needs work** — backend requires data the UI doesn't collect, or a structural change /
  product decision. Not auto-fixed (guessing would create silent runtime bugs).

---

## Request-body mismatches (cause `400 VALIDATION_ERROR`)

| Endpoint | Frontend sends | Backend expects | Status |
|---|---|---|---|
| `PATCH /users/me` | `name`, `homeArea`, `photoUrl` | `displayName`, `photoUrl`, `locationPrecision(exact\|fuzzed)`, `fuzzRadiusM`, `homeLocation(GeoPoint)` | ✅ Fixed (name→displayName, homeArea dropped) |
| `POST /storage/upload-url` | `purpose: 'avatar'…` | `purpose: condition_photo\|product_photo\|dispute_evidence\|profile\|proof` | ✅ Fixed (PURPOSE_MAP) |
| `POST /wave-downs` | `businessId`, `businessName`, `note?` | `targetType(business\|seller)`, `targetId`, `note?` | ✅ Fixed — request mapped (targetType:'business'); response `{id,status,expiresAt}` mapped to `WaveDown` (merge businessName, `expiresAt`→`slaDeadline`, status `pending`→`waiting`); `useWave` detail cache/socket-based. **Backend routes added**: `GET /wave-downs/:id` + `DELETE /wave-downs/:id` (cancel; added a `cancelled` status) — cancel/detail now work. |
| `POST /businesses/:id/menu` (create) | `name`, `priceCents`, `todaysSpecial?` | `name`, `priceCents`, `description?`, `photoUrl?` (`.strict()`) | ✅ Fixed (drop `todaysSpecial`) |
| `PATCH /businesses/:id/menu/:itemId` (update) | raw patch incl. `available`, `todaysSpecial` | `name?`, `priceCents?`, `isAvailable?` (`.strict()`) | ✅ Fixed — maps `available`→`isAvailable`; name/price pass through. |
| Today's Special (model reconciled) | per-item `todaysSpecial` boolean | `business.todaySpecialMenuItemId` (one per business) | ✅ Fixed — new `useTodaysSpecial` hook reads/sets via `PATCH /businesses/:id { todaySpecialMenuItemId }`; MenuManager derives each item's flag from it. **Backend**: made `todaySpecialMenuItemId` nullable so the special can be **cleared** (was set-only). |
| `POST /reviews` | `businessId`, `rating`, `body` | `subjectType`, `subjectId`, `rating`, `comment?`, **`transactionId` (required)** | ✅ Fixed — Receipt shows "Leave a review" (when a `transactionId` exists) → composer reads it from the URL → posts `{subjectType:'business', subjectId, rating, comment, transactionId}`. Server enforces H3 (must be your completed txn). |
| `POST /disputes` | `type`, `subject`, `details` | `subjectType`, `subjectId`, `refType(checkout\|transaction\|spot_me)`, `refId`, `note?` | ✅ Fixed — `DisputeOpen` is now context-driven (reads refType/refId/subjectType/subjectId from URL); Receipt has a "Report a problem" link that passes the order's transaction ref. Without context the form is disabled with guidance. |
| `POST /checkouts` | `productId`, `quantity` | `productId`, `quantity`, **`conditionPhotoUrl` (required url)**, **`qrToken` (required)** | ✅ Fixed — QrCheckout already captured both (QRScanner + PhotoCapture); the hook was dropping them. Now forwarded; photo made required outside demo; offline-queue body updated. |
| `POST /checkouts/:id/sales` (log sale) | `qty` | `quantitySold`, `saleAmountCents`, `loggedVia?` | ✅ Fixed — `quantitySold`+`saleAmountCents` (qty × unitPrice); payment method is UI-only |
| `POST /checkouts/:id/return` | `{}` (empty) | `quantityReturned`, `conditionPhotoUrl?`, `conditionAssessment?` | ✅ Fixed — sends computed `quantityReturned` + captured condition photo |
| `POST /seller-agreement` | (wrong path, no body) | `POST /seller-agreement/**accept**` `{ version }` | ✅ Fixed — corrected path + sends `version` (mirrors backend `SELLER_AGREEMENT_VERSION`; no discovery endpoint exists) |
| ~~`POST /transactions`~~ → **`POST /orders`** (order flow) | was: `businessId`, `items`, `discountPercent`, `context` | `POST /orders`: `businessId`, `items:[{menuItemId,quantity}]`, `tipCents?`, `roundUpCents?` | ✅ Fixed — repointed to `/orders` (the correct endpoint); items map `itemId→menuItemId`; discount is server-derived (not sent); response mapped to `OrderTxn` with a status map. Also fixed `useOrder` (no `GET /orders/:id` exists → uses `/orders/mine`). **Needs the business live (`parked`) + available menu items to place an order.** |
| `POST /live-sessions/start` | `businessId` | `actorType(business\|seller)`, `actorId`, `lng`, `lat`, `status?`, `waveSlaSec?` | ✅ Fixed — actorType:'business' + browser geolocation for lat/lng (`useLiveSession.ts`) |
| `POST /businesses` (register) | `name`, `category`, `serviceArea` | `name`, `categoryId` (**ObjectId**), `description?`, `logoUrl?`, `isHub?` | ✅ Fixed — loads `/catalog/categories`, sends `categoryId`; `serviceArea` dropped (no backend field); license banner driven by `requires_license` |
| `POST /hubs/:id/products` | `name`, `category`, `quantityTotal`, `unitPriceCents`, `sellerSplitPercent`, `returnWindowDays` | `name`, `unitValueCents`, `consignmentSplitPercent`, `returnWindowHours`, `quantityAvailable`, `listingType?`, … | ✅ Fixed — field renames + days→hours; `category` omitted (optional `categoryId`) |
| `POST /bookings` | `businessId`, `service`, `startAt` | `businessId`, `serviceId` (ObjectId), `scheduledAt` (ISO datetime), `recurrenceRule?` | ✅ Fixed — reworked `BookingFlow`: `useServices` picker → serviceId-scoped `GET availability?serviceId&date` (also previously broken: missing required query params) → book with real `serviceId`/`scheduledAt`. **Needs the business to have services + availability windows configured to test end-to-end.** |
| `POST /auth/roles` | `{ role }` | `{ role: enum ROLES }` | ✅ OK — role values match |

## Response-shape mismatches (cause crashes / empty UI)

| Endpoint | Frontend reads | Backend returns | Status |
|---|---|---|---|
| `GET /verification/status` | `{ tier, requirements[] }` | `{ currentTier, records[], pending[] }` | ✅ Fixed (mapper in `useVerification.ts`) |
| Others (`/map/nearby`, `/businesses/:id/dashboard`, `/orders`, admin views, …) | typed generics | not yet field-verified | ⏳ Audit response shapes as those screens are exercised |

---

## Status

**All request-shape mismatches above are fixed** (the former 🔴 integration items — orders,
reviews, disputes, bookings, live-sessions, consignment, business-register, hub-products — were
built out per feature, including a few backend changes: wave-downs `GET`/`DELETE` routes, nullable
`todaySpecialMenuItemId`).

### Running against the real backend
- Set `NEXT_PUBLIC_MAP_DEMO=false` (demo mode bypasses the backend with fake data).
- Seed dev test data: `npm run seed:dev` in the backend. It creates a **live (parked) business**
  with menu + services + wide availability, a **hub** (QR secret `SS-STATION-01`) + a product, and
  grants your signed-in user the `seller` role + accepts the Seller Agreement.

### What's exercisable end-to-end with the seed
- ✅ **Live map / waves** — the parked "Seed Taco Truck" pin; wave it down.
- ✅ **Bookings** — pick a service → date → slot → book (no payment).
- ✅ **Consignment checkout** — discover the product, checkout at the hub (enter `SS-STATION-01`
  in the QR manual field), log sales, return, settle. No charge at checkout.
- ⛔ **Orders** — blocked at payment: `POST /orders` calls Stripe (`paymentsService.charge`), which
  needs a real `STRIPE_SECRET_KEY` + a Connect account for the business. Everything up to Pay works.

### Remaining
- Per-screen **response-shape** audits as you exercise more screens (request shapes are all done).
- **Stripe** test keys to complete the order/payment path.
