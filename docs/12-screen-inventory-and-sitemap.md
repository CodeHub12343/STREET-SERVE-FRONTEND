# StreetServe — Screen Inventory, Sitemap & Navigation Flow

Companion to [06-ux-and-design-system.md](06-ux-and-design-system.md) (design source of truth) and [03-user-flows.md](03-user-flows.md) (behavioral source of truth). Every screen below must be designable using only the design system's tokens and primitives; gaps are tracked in §5.

Scope tags: **[MVP]** pilot launch · **[V1.x]** post-pilot · **[FUT]** future roadmap.
Every screen implicitly requires loading, empty, and error states unless marked "static."

## 1. Reusable Layout Templates

| Template | Used by | Structure |
|---|---|---|
| **MapShell** | Customer map home, Seller inventory discovery, Block Party view | Full-bleed map + pinned search/tab header + floating CTA + bottom tab bar; content overlays are bottom sheets |
| **SheetStack** | Business profile, product detail, wave-down confirm, filters | Bottom sheet at 3 snap points (peek / half / full) over MapShell; full snap becomes a scrollable page with sticky action row |
| **TabPage** | Favorites, Orders, Messages, Profile, Earnings, My Inventory | Standard header (title + optional actions) + scrollable content + bottom tab bar |
| **WizardFlow** | Onboarding, verification tiers, vendor/hub registration, QR checkout, gift/Spot Me flows | Step indicator + single-focus step content + primary CTA; back always available; progress persisted per step |
| **DashboardShell (web)** | Vendor, Hub, Admin web dashboards | Left sidebar nav (collapsible to icons <1024px) + topbar (role switcher, notifications) + content area; ≥3-column stat grids collapse to 1 column on mobile |
| **SettingsList** | All settings/preferences screens | Grouped list rows (label / value / chevron or toggle), destructive actions isolated in final group |
| **ConversationView** | Message threads, dispute case threads, AI coaching | Message list + composer; system/context banner slot at top |

## 2. Customer App (mobile-first PWA — Next.js App Router) — screens C-01 … C-38

### Onboarding & Auth
| ID | Screen | Notes | Scope |
|---|---|---|---|
| C-01 | Splash / launch | Brand mark, auth check redirect (static) | MVP |
| C-02 | Welcome carousel | 3 value-prop slides (map, wave down, earn) + Sign in / Get started | MVP |
| C-03 | Phone/email entry | Single input, country code, legal links | MVP |
| C-04 | OTP verification | 6-digit code, resend timer, 3-failure lockout error state | MVP |
| C-05 | Profile basics | Name, optional photo, city | MVP |
| C-06 | Role intent selector | "I'm here to: find / sell / run a business" — sets initial mode, all roles addable later | MVP |
| C-07 | Location permission primer | Explains fuzzing/precision policy before OS prompt | MVP |
| C-08 | Notification permission primer | Category preview before OS prompt | MVP |
| C-09 | First-run map tutorial | Coach marks over C-10 (overlay, not a screen) | MVP |

### Map & Discovery
| ID | Screen | Notes | Scope |
|---|---|---|---|
| C-10 | **Map Home** | MapShell: search bar, category tabs (All/Food/Coffee/Services/Shopping/More), custom-logo pins with status rings + ETA labels, Serve Near Me FAB, tab bar | MVP |
| C-11 | Search results | List overlay over map; recent searches empty state | MVP |
| C-12 | List view (map alternative) | Accessibility-mandated parity view, sortable by distance/status | MVP |
| C-13 | Category "More" browser | Full curated taxonomy (~15–25 at launch) | MVP |
| C-14 | Business profile sheet | SheetStack: cover, logo, rating, status badge, action row (Directions/Follow/Notify Me/Message), About, hours, status+location line, Today's Special, Menu link, gallery, reviews | MVP |
| C-15 | Menu | Menu list items, Today's Special pinned, Order entry point | MVP |
| C-16 | Reviews list + composer | Post-transaction gated composer | MVP |
| C-17 | Block Party cluster view | Multi-vendor sheet from a Block Party alert | V1.x |

### Wave Down, Queue & Orders
| ID | Screen | Notes | Scope |
|---|---|---|---|
| C-18 | Wave-down request confirm | Location pin confirm + optional note; SLA countdown starts | MVP |
| C-19 | Wave-down active | Live vendor ETA/tracking; expire + decline states | MVP |
| C-20 | Queue status | Position, locked discount tier, hold timer, leave action | MVP |
| C-21 | Order review (cart) | Items, discount line, total | MVP |
| C-22 | Payment sheet | Stripe payment sheet + round-up tip prompt | MVP |
| C-23 | Order tracking | pending → accepted → ready tracker; cancel/refund states | MVP |
| C-24 | Receipt detail | Itemized: base, discount ("You saved $X as customer #2"), tip, fees | MVP |
| C-25 | Orders tab (history) | Unified: orders + wave-down transactions + bookings; filter chips | MVP |
| C-26 | Booking flow | Service → slot picker → confirm (WizardFlow) | MVP |
| C-27 | Booking detail | Reschedule/cancel, reminders shown | MVP |
| C-28 | Gift flow | Item → recipient → pay → share code (WizardFlow) | V1.x |
| C-29 | Gift redemption | Code display/scan for recipient | V1.x |
| C-30 | Spot Me request | Amount, repay-by date, counterparty view of trust context | V1.x |

### Favorites, Messages, Profile
| ID | Screen | Notes | Scope |
|---|---|---|---|
| C-31 | Favorites tab | Followed businesses + live status chips; Notify Me pending list | MVP |
| C-32 | Messages tab | Thread list, unread badges | MVP |
| C-33 | Message thread | ConversationView, business-context banner | MVP |
| C-34 | Profile tab | Identity, verification tier chip, entry points: Jobs/Sell, Wallet, settings | MVP |
| C-35 | Wallet | Payment methods, Spot Me obligations, ping-tip earnings balance | MVP (payments) / V1.x (tips) |
| C-36 | Verification center | Tier progress (Bronze→Gold), pending/rejected doc states | MVP |
| C-37 | Settings stack | Account, notifications (per-category), privacy/location precision, theme, language | MVP |
| C-38 | Help & support | FAQ, contact, dispute entry point | MVP |

## 3. Street Seller Mode (mobile) — screens S-01 … S-14

| ID | Screen | Notes | Scope |
|---|---|---|---|
| S-01 | Seller intro / "Earn today" | Value pitch, "you owe nothing until you sell" framing | MVP |
| S-02 | Seller verification wizard | ID → selfie → bank (tier-gated), shelter-cosign alternate path | MVP |
| S-03 | Discover inventory | MapShell variant: hubs + product listings nearby | MVP |
| S-04 | Product/consignment detail | Terms: split %, return window, declared value, condition requirements; Seller Agreement gate | MVP |
| S-05 | Reservation confirm | Quantity, pickup window, hub directions | MVP |
| S-06 | QR checkout (pickup) | Camera scan + condition photo capture + summary confirm (WizardFlow) | MVP |
| S-07 | My Inventory | Active checkouts, return deadlines with urgency states | MVP |
| S-08 | Log a sale | Quantity + method; oversell block error state | MVP |
| S-09 | Return flow | QR scan-in + condition photos + reconcile preview | MVP |
| S-10 | Settlement breakdown | Gross − fee − hub share = net; payout timing per tier; Trust Score delta | MVP |
| S-11 | AI Assistant feed | One recommendation card at a time + "why"; drill-in to full list | MVP (rule-based) |
| S-12 | Sales coaching | Objection picker → scripted response (ConversationView) | V1.x |
| S-13 | Earnings dashboard | Daily/weekly totals, payout history | MVP |
| S-14 | Jobs list + detail + check-in/out | Gig cards, geofence/QR check-in | V1.x |

## 4. Vendor Dashboard (mobile-first + web) — V-01 … V-12, Hub H-01 … H-06, Admin A-01 … A-07

### Vendor
| ID | Screen | Notes | Scope |
|---|---|---|---|
| V-01 | Vendor registration wizard | Business info, category (license upload if flagged), Stripe Connect hosted onboarding, service area | MVP |
| V-02 | Live status control | **The vendor home**: Driving/Parked/Away-Closed toggle, go-live, current queue + wave-down count at a glance | MVP |
| V-03 | Wave-down inbox | Accept / decline / propose stop; SLA countdown per request | MVP |
| V-04 | Queue management | Live line, discount tiers consumed, Pop-Up toggle | MVP |
| V-05 | Order queue | Accept → preparing → ready pipeline | MVP |
| V-06 | Menu manager | CRUD items, availability, Today's Special picker | MVP |
| V-07 | Bookings calendar | Day/week views, accept/propose/decline | MVP |
| V-08 | Messages inbox | Customer threads | MVP |
| V-09 | Ping sharing budget | Fund/reload/pause, per-share tip, attribution stats | V1.x |
| V-10 | Giveaways manager | Item, daily cap, claimed count | V1.x |
| V-11 | Analytics | Sales, queue conversion, category benchmark | MVP-lite |
| V-12 | Payouts | Balance, history, Stripe account status | MVP |

### Consignment Hub (web-first)
| ID | Screen | Notes | Scope |
|---|---|---|---|
| H-01 | Hub registration | Extends V-01 with hub location/hours/QR station setup | MVP |
| H-02 | Product catalog manager | CRUD, consignment terms, quantities | MVP |
| H-03 | Checkout approvals | Pending seller reservations, auto-approve rules by trust tier | MVP |
| H-04 | Live inventory view | Which sellers hold what, where; recall action | MVP |
| H-05 | Settlements | Per-checkout reconciliation detail | MVP |
| H-06 | AI business dashboard | Demand forecasts, reallocation recommendations | V1.x |

### Admin / Trust & Safety (web)
| ID | Screen | Notes | Scope |
|---|---|---|---|
| A-01 | Ops overview | Live city health metrics | MVP |
| A-02 | Dispute queue + case detail | SLA timers, evidence viewer, resolution actions | MVP |
| A-03 | Category & license review | Taxonomy CRUD, `category_suggestions` queue, license doc approvals | MVP |
| A-04 | Fraud flags | Ping anomalies, oversell attempts, device duplicates | MVP-lite |
| A-05 | User management | Search, suspend, verification overrides | MVP |
| A-06 | Shelter partner management | Org approval, enrollment oversight | V1.x |
| A-07 | Sponsor management | Manual for pilot (per Q9 default) — record-keeping only | MVP-lite |

## 5. Sitemap (Customer, condensed)

```
Map (C-10) ─ home
├─ Search (C-11) / List view (C-12) / More categories (C-13)
├─ Business profile sheet (C-14)
│   ├─ Menu (C-15) → Order review (C-21) → Payment (C-22) → Tracking (C-23) → Receipt (C-24)
│   ├─ Wave down (C-18) → Active (C-19) → Queue (C-20) → Payment (C-22)
│   ├─ Book (C-26) → Booking detail (C-27)
│   ├─ Message → Thread (C-33)
│   └─ Reviews (C-16) / Gift (C-28) / Spot Me (C-30)
Favorites (C-31)
Orders (C-25) → Receipt (C-24) / Tracking (C-23) / Booking (C-27)
Messages (C-32) → Thread (C-33)
Profile (C-34)
├─ Jobs/Sell → Seller mode (S-01…S-14)
├─ Wallet (C-35)
├─ Verification (C-36)
└─ Settings (C-37) / Help (C-38)
```

## 6. Cross-Cutting State Requirements

Every screen ships with: **loading** (skeleton, not spinner, for list/map content), **empty** (actionable, per the "empty state as a sales tool" UX rule), **error** (retry + human-readable message), **offline** (cached last-known pins on map; queued QR scans for sellers). Money-moving screens additionally require: **pending confirmation** and **failure-with-no-double-charge** states.
