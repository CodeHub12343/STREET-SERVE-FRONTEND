# StreetServe — Screen → Component Mapping

> For every screen: its layout template, the components it composes, the state it holds, and its loading/empty/error/validation requirements. Traces `docs/13` screen specs → `COMPONENT_LIBRARY.md` components.
> Companion: [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md), [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md), [ROUTING_STRUCTURE.md](ROUTING_STRUCTURE.md).

---

## 0. How to read this

- **Template** = shell from `COMPONENT_LIBRARY §3`.
- **Composes** = the notable primitives + domain components (`COMPONENT_LIBRARY §2, §4`). Universal chrome (tab bar, focus ring, theme) is implied on every screen.
- **State** = client state (Zustand) + server state (TanStack Query key) the screen owns.
- **States** = which of loading/empty/error/offline/pending it must ship (all screens ship loading+empty+error by default; only notable specifics listed).
- Every screen inherits the global requirements in `NEXTJS_ARCHITECTURE §10`.

---

## 1. Onboarding & Auth

| Screen | Template | Composes | State | Validation / notable states |
|---|---|---|---|---|
| C-02 Welcome | WizardFlow | carousel, Button(primary/tertiary) | step index (local) | static |
| C-05 Profile basics | WizardFlow | Input, Avatar+PhotoCapture, Button | form (local) → `PATCH /users/me` | name required; photo optional; inline errors |
| C-06 Role intent | WizardFlow | SegmentedControl, Button | selection → `POST /auth/roles` | one selection required |
| C-07 Location primer | WizardFlow | illustration, Banner, Button | — | pre-permission explainer; handles denial path |
| C-08 Notif primer | WizardFlow | category preview list, Button | — | registers push token on grant (GAP-4) |
| C-09 Map tutorial | overlay on MapShell | coach-mark overlay | tour step (local) | dismissible; respects reduced-motion |
| S-02 Seller verify | WizardFlow | VerificationTierLadder, QRScanner/redirect, Button | `GET /verification/status` `keys.verification` | **async pending state**; rejected-doc state; shelter-cosign branch |
| V-01 Vendor register | WizardFlow | Input, Select(category), PhotoCapture(license), Button | form + `GET /catalog/categories` | license upload appears only if category flagged; Stripe Connect redirect |
| H-01 Hub register | WizardFlow | (V-01) + hours/QR-station fields | form | extends V-01 |

## 2. Map & Discovery

| Screen | Template | Composes | State | Validation / notable states |
|---|---|---|---|---|
| C-10 Map Home | MapShell | `Map`, `MapPin`+`StatusRing`, `ClusterPin`, Tabs, Input(search), FAB, BusinessProfileSheet(peek) | `mapViewport.store`, `filters.store`; `keys.mapNearby(bbox,cat)`; `/live` cells | **loading:** skeleton pins · **empty:** "Nothing moving near you yet"+widen · **error:** location-denied banner+city fallback · **offline:** 60% pins + "as of X min" |
| C-11 Search | SheetStack | Input, list rows, EmptyState | search query (local); `keys.mapNearby(search)` | recent-searches empty state |
| C-12 List view | TabPage | list rows (distance/status), sort control | `keys.mapNearby` (shared) | **a11y parity** — full functional map alternative; sortable |
| C-13 Category More | SheetStack | category grid | `keys.categories` | — |
| C-14 Business profile | SheetStack | `BusinessProfileSheet`, StatusChip, TrustScoreBadge, `QueuePositionCard`, MenuListItem(preview), gallery, review cards, action row(Directions/Follow/NotifyMe/Message) | `keys.business(id)`, `keys.queue(id)`, `keys.trust('business',id)`; `/live` status | **status drives 5 surfaces** from one selector; empty-menu → "coming soon"; empty-reviews → "be the first"; went-offline → Away degrade |
| C-15 Menu | SheetStack(full) | MenuListItem, Today's-Special pin | `keys.menu(id)` | empty → "Menu coming soon" |
| C-16 Reviews | SheetStack | review cards, review composer (Input+rating) | `keys.reviews(id)`; `POST /reviews` | **composer gated to completed transactionId**; rating required |
| C-17 Block Party | SheetStack | multi-vendor cluster list | `keys.mapNearby(event)`; `/live` block_party | V1.x |

## 3. Wave, Queue, Orders

| Screen | Template | Composes | State | Validation / notable states |
|---|---|---|---|---|
| C-18 Wave confirm | SheetStack over map preview | `Map`(mini), Input(note), promise block, Button(Send Wave) | `POST /wave-downs` | shows SLA + would-be discount **before** commit; location-denied blocks send |
| C-19 Wave active | full-screen states | `WaveStatusCard`, `Countdown`(server deadline), route line, Button(ghost Cancel/Message) | `keys.wave(id)`; `/queue` `wave:accepted`, `/notifications` | 3 sub-states; **no-charge** copy on decline/expire; "Reconnecting…" pauses countdown |
| C-20 Queue status | TabPage/SheetStack | `QueuePositionCard`(dot rail), `DiscountLadder`, `Countdown`(hold), Pop-Up `Banner`, Button(ghost Leave) | `keys.queue(ownerId)`; `/queue` `queue:update`,`popup:delay` | server-authoritative position; leave = toast (no modal), states tier released; "Your Turn" terminal |
| C-21 Order review | SheetStack | MenuListItem+Stepper, queue-context card, tip row, `PriceLine`/`DiscountBadge`, Button(total on button) | cart (local); menu query | discount row only in queue context; total on CTA |
| C-22 Payment 💳 | SheetStack | `PaymentSheet`(Stripe Elements), round-up radio, `Spinner`(processing) | Elements clientSecret; idempotency key | **processing spinner (exception)**; decline → "nothing was taken, order held"; no silent retry |
| C-23 Order tracking | TabPage | `OrderTracker`, ETA readout, Button(secondary Cancel) | `keys.order(id)`; `/notifications` status | order-ahead only; cancellation card replaces stepper w/ reason+no-charge |
| C-24 Receipt | TabPage | `ReceiptCard`(itemized), `FeeSplit`, payout-timing line | `keys.order(id)`/`keys.transaction(id)` | "You saved $X as customer #2" framing |
| C-25 Orders history | TabPage | filter chips, unified list rows | `keys.ordersMine`+`keys.transactionsMine`+`keys.bookings` (merged) | unified orders+waves+bookings; empty per-filter |
| C-26 Booking 💳 | WizardFlow | slot picker, `PaymentSheet` (pay step) | `keys.availability(id)`; `POST /bookings` | cutoff-checked; propose-new-time path |
| C-27 Booking detail | TabPage | booking card, reschedule/cancel, reminder rows | `keys.booking(id)` | reschedule cutoff; reminders shown |

## 4. Gifting & Spot Me (V1.x)

| Screen | Template | Composes | State | Notable |
|---|---|---|---|---|
| C-28 Gift 💳 | WizardFlow | item picker, recipient input, `PaymentSheet`, share-code card | `POST /gifts` | share code + expiry |
| C-29 Gift redeem | WizardFlow | code input/scan, redemption result | `POST /gifts/:code/redeem` | guest-accessible |
| C-30 Spot Me 💳 | WizardFlow | amount stepper, repay-by picker, counterparty trust-context, TrustScoreBadge | `POST /spot-me` | **422 gate** (<30d/<bronze) shown as tier prompt, not dead end |

## 5. Favorites, Messages, Profile

| Screen | Template | Composes | State | Notable |
|---|---|---|---|---|
| C-31 Favorites | TabPage | followed-business rows + live StatusChip, Notify-Me pending list | `keys.favorites`; `/live` status | empty → "Follow businesses to see them here" |
| C-32 Messages | TabPage | `ThreadListItem`(unread) | `keys.threadsMine`; `/messages` new | unread badges |
| C-33 Thread | ConversationView | `MessageBubble`, composer, context banner | `keys.thread(id)`; `/messages` new/read/typing | rate-limited send; read receipts |
| C-34 Profile | TabPage | identity card, tier chip, `RoleSwitcher`, entry-point rows | `keys.me` | entry points Jobs/Sell·Wallet·Settings |
| C-35 Wallet | TabPage/SettingsList | payment-method rows, Spot-Me obligation rows, ping-tip balance | `keys.transactionsMine`+`keys.pingsMine`+`keys.spotMe` (compose, GAP-5) | tips V1.x |
| C-36 Verification center | WizardFlow/TabPage | `VerificationTierLadder`, doc-status rows | `keys.verification`; `/notifications` tier change | pending/rejected states |
| C-37 Settings | SettingsList | grouped rows, toggles, precision slider, theme picker | `keys.notificationPrefs`; `theme.store` | safety-critical categories disabled/locked |
| C-38 Help | SettingsList/ConversationView | FAQ accordion, contact, `DisputeCaseTracker`, PhotoCapture(evidence) | `keys.dispute(id)`; `POST /disputes` | dispute entry point |

## 6. Seller mode

| Screen | Template | Composes | State | Notable |
|---|---|---|---|---|
| S-01 Intro | WizardFlow | value pitch, Button | — | "owe nothing until you sell" |
| S-03 Discover inventory | MapShell | `Map`, hub `MapPin`, product cards | `keys.productsNearby(bbox,cat)`; `/live` | empty → "No inventory nearby, widen radius" |
| S-04 Product detail | SheetStack | terms card (split/window/value), Seller-Agreement clickwrap, Button | `keys.product(id)`; `POST /seller-agreement` | **agreement gate** before reserve |
| S-05 Reserve confirm | SheetStack | Stepper(qty), pickup-window picker, hub directions | `POST /checkouts` (reserve) | qty ≤ available |
| S-06 QR checkout 💳 | WizardFlow | `QRScanner`, `PhotoCapture`(condition), summary confirm | idempotency key; `POST /storage/upload-url`→`POST /checkouts` | camera-permission + fallback; offline-queue (V1.x) |
| S-07 My Inventory | TabPage | checkout rows w/ return-deadline urgency, Badge | `keys.checkoutsMine` | urgency color+icon; missed-return reminder |
| S-08 Log sale 💳 | SheetStack | Stepper(qty), method select, oversell error | idempotency; `POST /checkouts/:id/sales` | **409 oversell block** explicit state |
| S-09 Return | WizardFlow | `QRScanner`, `PhotoCapture`, reconcile preview | `POST /checkouts/:id/return` | condition assessment |
| S-10 Settlement | TabPage | `ReceiptCard`(gross−fee−hub), payout-timing, TrustScoreBadge delta | `keys.settlement(id)`; `keys.trust('seller',id)` | Trust delta shown |
| S-11 AI Assistant | TabPage | `AIRecommendationCard`(one-at-a-time), drill-in list | `keys.aiRecs` | swipeable; "why" line |
| S-12 Sales coaching | ConversationView | objection picker, scripted response | `POST /ai/sales-coaching` | V1.x |
| S-13 Earnings | TabPage | `StatTile`, `Chart`(lazy), payout history | compose (GAP-6) | daily/weekly |
| S-14 Jobs | TabPage | gig cards, `QRScanner`(check-in) | `keys.jobsNearby`; `/notifications` | V1.x; geofence/QR |

## 7. Vendor dashboard

| Screen | Template | Composes | State | Notable |
|---|---|---|---|---|
| V-02 Live status | DashboardShell | `LiveStatusToggle`, queue+wave count StatTiles, go-live | `POST /live-sessions/*`; `keys.dashboard(id)`; `/live`,`/queue`,`/notifications` | **422 LICENSE_REQUIRED** handling; location ticks via socket |
| V-03 Wave inbox | DashboardShell | wave-request rows, `Countdown`(SLA), accept/decline/propose | `/queue` new waves; `POST /wave-downs/:id/*` | per-request SLA |
| V-04 Queue mgmt | DashboardShell | `QueuePositionCard`(vendor view), `DiscountLadder`, Pop-Up toggle | `keys.queue(id)`; `/queue` | discount tiers consumed |
| V-05 Order queue | DashboardShell | `OrderTracker` kanban columns, drag cards | `keys.businessOrders(id)`; `/notifications` | ready blocked if away_closed |
| V-06 Menu manager | DashboardShell | MenuListItem(editable), Today's-Special picker, CRUD forms | `keys.menu(id)`; menu mutations | availability toggles |
| V-07 Bookings | DashboardShell | calendar (day/week), accept/propose/decline | `keys.availability(id)`; `PATCH /bookings/:id` | propose-new-time |
| V-08 Messages | DashboardShell+ConversationView | `ThreadListItem`, `MessageBubble`, composer | `keys.threadsMine`; `/messages` | customer threads |
| V-09 Ping budget 💳 | DashboardShell | budget card, `PaymentSheet`, attribution StatTiles | `POST /ping-budgets/*` | V1.x |
| V-10 Giveaways | DashboardShell | giveaway form, claimed-count StatTile | `POST /giveaways` | V1.x |
| V-11 Analytics | DashboardShell | `StatTile` grid, `Chart`(lazy), benchmark | `keys.dashboard(id)` analytics | responsive stat grid |
| V-12 Payouts | DashboardShell | balance StatTile, payout history `DataTable`, Stripe status | `keys.transactionsMine`; connect status | Stripe account status |

## 8. Hub dashboard

| Screen | Template | Composes | State | Notable |
|---|---|---|---|---|
| H-02 Product catalog | DashboardShell | product `DataTable`, terms forms, CRUD | `keys.hubProducts(id)` | quantities |
| H-03 Approvals | DashboardShell | pending-reservation rows, TrustScoreBadge, approve action | `/notifications`; approve mutation | auto-approve rule by trust tier; shelter-cosigned flag |
| H-04 Live inventory | DashboardShell+`Map` | `Map`, seller `MapPin`, holder rows, recall | `keys.hubProducts(id)`; `/live` | overdue pin; recall action |
| H-05 Settlements | DashboardShell | `ReceiptCard`/`DataTable` per checkout | `keys.settlement(id)` | reconciliation |
| H-06 AI dashboard | DashboardShell | `Chart`(forecast), `AIRecommendationCard` | `keys.aiRecs` | V1.x |

## 9. Admin

| Screen | Template | Composes | State | Notable |
|---|---|---|---|---|
| A-01 Ops overview | DashboardShell | `StatTile` grid, city-health `Chart` | `GET /admin/overview` (GAP-2) | compose if endpoint absent |
| A-02 Disputes | DashboardShell+ConversationView | dispute queue `DataTable`, `DisputeCaseTracker`, evidence viewer, resolution actions | `keys.adminDisputes`; `keys.dispute(id)` | SLA timers; resolution triggers score change |
| A-03 Category/license | DashboardShell | taxonomy `DataTable`, suggestion queue, license-doc approvals | `keys.categories`; review mutations | sets license metadata |
| A-04 Fraud flags | DashboardShell | flag rows, hold action | `keys.fraudFlags` | ping/oversell/device dups |
| A-05 User mgmt | DashboardShell | user search `DataTable`, suspend, verification override, audit log | `keys.adminUsers`; `keys.auditLogs` | suspend confirm |
| A-06 Shelter mgmt | DashboardShell | org approval, enrollment oversight | `keys.shelters` | V1.x |
| A-07 Sponsors | DashboardShell | sponsor `DataTable` | `keys.sponsors` | manual pilot |

---

## 10. Cross-screen component reuse (proof of DRY)

The highest-leverage shared components and their reuse counts — build these first (`COMPONENT_LIBRARY §6`):

| Component | # screens | Screens |
|---|---|---|
| `Map` + `MapPin` | 8 | C-10/11/12/14/17, S-03, H-04, V-02 |
| `Button`/`Input`/`Chip`/`Skeleton`/`EmptyState` | ~all 77 | universal |
| `PaymentSheet` | 5 | C-22, C-26 (pay step), C-28, S-06 (checkout), V-09 |
| `ReceiptCard`/`FeeSplit` | 4 | C-24, S-10, H-05, V-12 |
| `QueuePositionCard`/`DiscountLadder` | 3 | C-14, C-20, V-04 |
| `TrustScoreBadge` | 4 | C-14, S-10, H-03, C-30 |
| `OrderTracker` | 2 | C-23, V-05 |
| `VerificationTierLadder` | 2 | C-36, S-02 |
| `QRScanner`/`PhotoCapture` | 4 | S-06, S-09, S-14, C-38 |
| `ConversationView`+`MessageBubble` | 4 | C-33, V-08, S-12, A-02 |
| `DashboardShell` | 25 | all V/H/A screens |

This concentration is why the [FRONTEND_IMPLEMENTATION_ROADMAP.md](FRONTEND_IMPLEMENTATION_ROADMAP.md) front-loads the shared kit before feature screens.
```
