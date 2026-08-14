# StreetServe — Routing Structure (App Router)

> Every one of the 77 screens (`docs/12`) mapped to a concrete Next.js App Router path, its route group, layout template, auth guard, and rendering mode.
> Companion: [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md), [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md), [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).

---

## 0. Conventions

- **Group** = App Router `(group)` (no URL segment) → the surface/shell from [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md) §3.
- **Guard** = 🔓 public · 🔒 authenticated · 👤role · 🛡️admin · ⚙️tier-gated action (not route-gated).
- **Layout** = template from `docs/12 §1`.
- **Render** = SSR (server) · CSR (client) · Hybrid (server page shell + client screen).
- Many "screens" are **sheets/overlays/steps**, not standalone URLs. Those are marked **[sheet]**, **[overlay]**, or **[step]** and render over a parent route (bottom sheet, coach-mark layer, or wizard step) rather than owning a page. This is faithful to the design (`MapShell`+`SheetStack`, `WizardFlow`), not a shortcut.

---

## 1. Top-level tree

```
app/
├── layout.tsx                      # root: <html>, fonts, Providers, metadata            RSC
├── providers.tsx                   # client provider tree (NEXTJS_ARCHITECTURE §4)        CSR
├── middleware.ts                   # Clerk edge auth + public/protected matchers
│
├── (marketing)/                    # 🔓 public SSR site
│   ├── layout.tsx                  # marketing chrome (nav/footer)                        RSC
│   ├── page.tsx                    # landing (/)                                          SSR
│   ├── pre-register/page.tsx       # waitlist capture (pilot: Modesto)                    SSR
│   ├── for-vendors/page.tsx        # vendor value prop                                    SSR
│   ├── for-sellers/page.tsx        # seller value prop                                    SSR
│   └── legal/[doc]/page.tsx        # terms, privacy, seller-agreement text                SSR
│
├── (auth)/                         # 🔓→🔒 onboarding & verification
│   ├── layout.tsx                  # WizardFlow shell (step indicator, back)              CSR
│   ├── sign-in/[[...rest]]/page.tsx    # Clerk hosted sign-in                             CSR
│   ├── sign-up/[[...rest]]/page.tsx    # Clerk hosted sign-up                             CSR
│   └── onboarding/…                # our post-auth steps (see §3)
│
├── (customer)/                     # 🔒 mobile-viewport PWA — default surface
│   ├── layout.tsx                  # tab bar (Map·Favorites·Orders·Messages·Profile)      CSR
│   └── …                           # see §4
│
├── (seller)/                       # 👤seller mobile-viewport
│   ├── layout.tsx                  # seller tab bar (Discover·Inventory·AI·Earnings·Trust) CSR
│   └── …                           # see §5
│
├── (dashboard)/                    # 👤vendor / 👤hub desktop-first
│   ├── layout.tsx                  # DashboardShell (sidebar + topbar + role switcher)    CSR
│   ├── vendor/…                    # see §6
│   └── hub/…                       # see §7
│
├── (admin)/                        # 🛡️ internal console
│   ├── layout.tsx                  # DashboardShell (admin nav)                           CSR
│   └── …                           # see §8
│
├── api/                            # thin BFF only (NEXTJS_ARCHITECTURE §6)
│   └── health/route.ts
├── manifest.ts                     # PWA manifest
├── sw.ts                           # Serwist service worker source
├── loading.tsx / error.tsx / not-found.tsx / global-error.tsx
```

---

## 2. Root URL → surface routing

`/` is the **marketing landing** (SSR, SEO). The **app entry** is `/app` (or the post-auth redirect target) which resolves to the customer map. Rationale: the public root must be crawlable marketing; authenticated users are redirected from `/` → `/map` by middleware when a session exists.

| URL | Resolves to |
|---|---|
| `/` | Marketing landing (or redirect to `/map` if authed) |
| `/map` | Customer Map Home (C-10) — the product's center of gravity |
| `/seller` | Seller Discover (S-03) |
| `/vendor` | Vendor Live Status home (V-02) |
| `/hub` | Hub dashboard home (H-04 live inventory) |
| `/admin` | Admin Ops overview (A-01) |

---

## 3. `(auth)` — Onboarding & Verification · C-01…C-09, S-02, V-01, H-01

| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| C-01 Splash | `—` (root `loading` + redirect) | — | 🔓 | CSR | Auth-check redirect; not a durable URL |
| C-02 Welcome carousel | `/welcome` | WizardFlow | 🔓 | CSR | 3 value-prop slides |
| C-03 Phone/email entry | Clerk `/sign-in` · `/sign-up` | Clerk UI | 🔓 | CSR | **Clerk-hosted** (`AUTHENTICATION_AND_AUTHORIZATION.md §1`) |
| C-04 OTP verify | Clerk flow | Clerk UI | 🔓 | CSR | Clerk owns OTP + 3-failure lockout |
| C-05 Profile basics | `/onboarding/profile` | WizardFlow [step] | 🔒 | CSR | `PATCH /users/me` |
| C-06 Role intent | `/onboarding/role` | WizardFlow [step] | 🔒 | CSR | `POST /auth/roles` (additive) |
| C-07 Location primer | `/onboarding/location` | WizardFlow [step] | 🔒 | CSR | Explains fuzzing before OS geolocation prompt |
| C-08 Notification primer | `/onboarding/notifications` | WizardFlow [step] | 🔒 | CSR | Category preview before push permission |
| C-09 First-run map tutorial | `/map?tour=1` **[overlay]** | over MapShell | 🔒 | CSR | Coach marks, not a screen |
| S-02 Seller verification wizard | `/onboarding/seller-verify` | WizardFlow | 👤seller | CSR | ID→selfie→bank; shelter-cosign alt path; `/verification/*` |
| V-01 Vendor registration | `/vendor/register` | WizardFlow | 👤vendor | CSR | Business info, category+license upload, Stripe Connect onboarding |
| H-01 Hub registration | `/hub/register` | WizardFlow | 👤hub | CSR | Extends V-01 with hub location/hours/QR station |

> Verification (S-02, `/verification/*`) is **async**: submit → `pending` → KYC webhook → tier update pushed via socket/poll. The wizard shows a pending state and lets the user leave; the Verification Center (C-36) is the durable status home.

---

## 4. `(customer)` · C-10…C-38

### Map & discovery
| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| C-10 Map Home | `/map` | MapShell | 🔒 (map read 🔓) | CSR | Search, category tabs, logo pins + status rings, Serve-Near-Me FAB |
| C-11 Search results | `/map` **[sheet]** `?q=` | SheetStack | 🔒 | CSR | List overlay over map; recent-search empty state |
| C-12 List view | `/map/list` | TabPage | 🔒 | CSR | **Accessibility parity** view, sort by distance/status |
| C-13 Category "More" | `/map` **[sheet]** `?cat=more` | SheetStack | 🔒 | CSR | Full taxonomy (`GET /admin/categories` public read) |
| C-14 Business profile | `/business/[id]` **[sheet over /map]** | SheetStack | 🔓 | Hybrid | 3 snap points; public profile is SEO-worthy → server metadata |
| C-15 Menu | `/business/[id]/menu` **[sheet/full]** | SheetStack | 🔓 | CSR | Today's Special pinned; order entry |
| C-16 Reviews + composer | `/business/[id]/reviews` **[sheet]** | SheetStack | 🔒 | CSR | Composer gated to completed transaction |
| C-17 Block Party cluster | `/map` **[sheet]** `?event=` | SheetStack | 🔒 | CSR | **V1.x**; from block_party socket event |

### Wave down, queue, orders
| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| C-18 Wave-down confirm | `/business/[id]/wave` **[sheet]** | SheetStack | 👤customer | CSR | Pin confirm + note; SLA countdown starts |
| C-19 Wave-down active | `/wave/[id]` | SheetStack/TabPage | 👤customer | CSR | Live ETA/tracking; expire + decline states |
| C-20 Queue status | `/queue/[ownerId]` | SheetStack/TabPage | 👤customer | CSR | Position, locked discount, hold timer, leave |
| C-21 Order review (cart) | `/business/[id]/order` **[sheet]** | SheetStack | 👤customer | CSR | Items, discount line, total |
| C-22 Payment sheet | `/order/[id]/pay` **[sheet]** | SheetStack | 👤customer ⚙️ | CSR | Stripe Elements + round-up prompt; **[Elements]** |
| C-23 Order tracking | `/order/[id]` | TabPage | 👤customer | CSR | pending→accepted→ready; cancel/refund |
| C-24 Receipt detail | `/order/[id]/receipt` | TabPage | 👤customer | CSR | Itemized: base/discount/tip/fees |
| C-25 Orders tab (history) | `/orders` | TabPage | 🔒 | CSR | Unified orders + wave-downs + bookings; filter chips |
| C-26 Booking flow | `/business/[id]/book` | WizardFlow | 👤customer ⚙️ | CSR | Service→slot→confirm; **[Elements]** on pay step |
| C-27 Booking detail | `/booking/[id]` | TabPage | 👤customer | CSR | Reschedule/cancel; reminders |
| C-28 Gift flow | `/business/[id]/gift` | WizardFlow | 👤customer | CSR | **V1.x**; item→recipient→pay→share code |
| C-29 Gift redemption | `/gift/[code]` | WizardFlow | 🔓 | CSR | **V1.x**; recipient may be unauthenticated |
| C-30 Spot Me request | `/business/[id]/spot-me` | WizardFlow | 👤customer ⚙️ | CSR | **V1.x**; age/tier gated (<30d/<bronze → 422) |

### Favorites, messages, profile
| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| C-31 Favorites | `/favorites` | TabPage | 👤customer | CSR | Followed businesses + live status chips; Notify-Me list |
| C-32 Messages | `/messages` | TabPage | 🔒 | CSR | Thread list, unread badges |
| C-33 Message thread | `/messages/[threadId]` | ConversationView | 👤participant | CSR | Business-context banner; live via `/messages` ns |
| C-34 Profile | `/profile` | TabPage | 🔒 | CSR | Identity, tier chip, entry points Jobs/Sell·Wallet·Settings |
| C-35 Wallet | `/profile/wallet` | TabPage/SettingsList | 🔒 | CSR | Payment methods, Spot-Me obligations, ping-tip balance (tips V1.x) |
| C-36 Verification center | `/profile/verification` | WizardFlow/TabPage | 🔒 | CSR | Tier ladder Bronze→Gold; pending/rejected doc states |
| C-37 Settings | `/settings` | SettingsList | 🔒 | CSR | Account, per-category notifications, location precision, theme, language |
| C-38 Help & support | `/help` | SettingsList/ConversationView | 🔒 | CSR | FAQ, contact, **dispute entry point** (`POST /disputes`) |

---

## 5. `(seller)` · S-01…S-14

| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| S-01 Seller intro | `/seller/start` | WizardFlow | 🔒 | CSR | "Earn today / owe nothing until you sell" |
| S-02 Verification wizard | `/onboarding/seller-verify` | WizardFlow | 👤seller | CSR | (see §3) |
| S-03 Discover inventory | `/seller` | MapShell | 👤seller | CSR | Hubs + product listings nearby (`GET /products/nearby`) |
| S-04 Product detail | `/seller/product/[id]` **[sheet]** | SheetStack | 👤seller | CSR | Split %, return window, declared value; **Seller Agreement gate** |
| S-05 Reservation confirm | `/seller/product/[id]/reserve` **[sheet]** | SheetStack | 👤seller ⚙️ | CSR | Quantity, pickup window, hub directions |
| S-06 QR checkout (pickup) | `/seller/checkout/[id]` | WizardFlow | 👤seller ⚙️ | CSR | **getUserMedia + html5-qrcode** scan + condition photo; **[Idempotency]** |
| S-07 My Inventory | `/seller/inventory` | TabPage | 👤seller | CSR | Active checkouts, return deadlines w/ urgency states |
| S-08 Log a sale | `/seller/checkout/[id]/sale` **[sheet]** | SheetStack | 👤seller | CSR | Qty + method; **oversell block (409)**; **[Idempotency]** |
| S-09 Return flow | `/seller/checkout/[id]/return` | WizardFlow | 👤seller | CSR | QR scan-in + condition photos + reconcile preview |
| S-10 Settlement breakdown | `/seller/checkout/[id]/settlement` | TabPage | 👤participant | CSR | Gross−fee−hub = net; payout timing; Trust delta |
| S-11 AI Assistant feed | `/seller/ai` | TabPage | 👤seller | CSR | One rec card at a time + "why"; drill-in |
| S-12 Sales coaching | `/seller/ai/coaching` | ConversationView | 👤seller | CSR | **V1.x**; objection→scripted response |
| S-13 Earnings dashboard | `/seller/earnings` | TabPage | 👤seller | CSR | Daily/weekly totals, payout history |
| S-14 Jobs list+detail | `/seller/jobs`, `/seller/jobs/[id]` | TabPage | 🔒 | CSR | **V1.x**; gig cards, geofence/QR check-in-out |

---

## 6. `(dashboard)/vendor` · V-01…V-12

| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| V-01 Registration wizard | `/vendor/register` | WizardFlow | 👤vendor | CSR | (see §3) |
| V-02 Live status control | `/vendor` | DashboardShell | 👤vendor | CSR | **Vendor home**: Driving/Parked/Away toggle, go-live, queue+wave count |
| V-03 Wave-down inbox | `/vendor/wave-downs` | DashboardShell | 👤vendor | CSR | Accept/decline/propose; SLA countdown per request |
| V-04 Queue management | `/vendor/queue` | DashboardShell | 👤vendor | CSR | Live line, discount tiers consumed, Pop-Up toggle |
| V-05 Order queue | `/vendor/orders` | DashboardShell | 👤vendor | CSR | Accept→preparing→ready kanban |
| V-06 Menu manager | `/vendor/menu` | DashboardShell | 👤vendor | CSR | CRUD items, availability, Today's Special picker |
| V-07 Bookings calendar | `/vendor/bookings` | DashboardShell | 👤vendor | CSR | Day/week; accept/propose/decline |
| V-08 Messages inbox | `/vendor/messages`, `/vendor/messages/[id]` | DashboardShell + ConversationView | 👤vendor | CSR | Customer threads |
| V-09 Ping sharing budget | `/vendor/ping-budget` | DashboardShell | 👤vendor | CSR | **V1.x**; fund/reload/pause, tip, attribution; **[Elements]** |
| V-10 Giveaways manager | `/vendor/giveaways` | DashboardShell | 👤vendor | CSR | **V1.x**; item, daily cap, claimed count |
| V-11 Analytics | `/vendor/analytics` | DashboardShell | 👤vendor | CSR | Sales, queue conversion, category benchmark |
| V-12 Payouts | `/vendor/payouts` | DashboardShell | 👤vendor | CSR | Balance, history, Stripe account status |

---

## 7. `(dashboard)/hub` · H-01…H-06

| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| H-01 Hub registration | `/hub/register` | WizardFlow | 👤hub | CSR | (see §3) |
| H-02 Product catalog manager | `/hub/products` | DashboardShell | 👤hub | CSR | CRUD, consignment terms, quantities |
| H-03 Checkout approvals | `/hub/approvals` | DashboardShell | 👤hub | CSR | Pending reservations, auto-approve by trust tier |
| H-04 Live inventory view | `/hub` | DashboardShell (+ map) | 👤hub | CSR | Which sellers hold what/where; recall action |
| H-05 Settlements | `/hub/settlements`, `/hub/settlements/[id]` | DashboardShell | 👤hub | CSR | Per-checkout reconciliation |
| H-06 AI business dashboard | `/hub/ai` | DashboardShell | 👤hub | CSR | **V1.x**; demand forecasts, reallocation |

---

## 8. `(admin)` · A-01…A-07

| Screen | Path | Layout | Guard | Render | Notes |
|---|---|---|---|---|---|
| A-01 Ops overview | `/admin` | DashboardShell | 🛡️ | CSR | Live city health metrics |
| A-02 Dispute queue + case | `/admin/disputes`, `/admin/disputes/[id]` | DashboardShell + ConversationView | 🛡️ | CSR | SLA timers, evidence viewer, resolution actions |
| A-03 Category & license review | `/admin/categories` | DashboardShell | 🛡️ | CSR | Taxonomy CRUD, suggestion queue, license-doc approvals |
| A-04 Fraud flags | `/admin/fraud` | DashboardShell | 🛡️ | CSR | Ping anomalies, oversell attempts, device dups |
| A-05 User management | `/admin/users`, `/admin/users/[id]` | DashboardShell | 🛡️ | CSR | Search, suspend, verification overrides |
| A-06 Shelter partner mgmt | `/admin/shelters` | DashboardShell | 🛡️ | CSR | **V1.x**; org approval, enrollment oversight |
| A-07 Sponsor management | `/admin/sponsors` | DashboardShell | 🛡️(ops_finance) | CSR | Manual pilot record-keeping (per Q9) |

---

## 9. Deep-link map (socket `notify.deeplink` → route)

Notifications carry a `deeplink` (`REALTIME_ARCHITECTURE.md §5`). The client resolves each to a route:

| Domain event | Deeplink → route |
|---|---|
| Wave accepted | `/wave/[id]` |
| Queue reflow / you're up | `/queue/[ownerId]` |
| Order ready | `/order/[id]` |
| New message | `/messages/[threadId]` |
| Verification tier change | `/profile/verification` |
| Payout / settlement | `/seller/checkout/[id]/settlement` or `/vendor/payouts` |
| Dispute update | `/help` → dispute case (customer) / `/admin/disputes/[id]` (admin) |
| Booking reminder | `/booking/[id]` |
| Proximity / Notify-Me / Block Party | `/map?focus=[businessId]` or `?event=` |

A single `resolveDeeplink(notification)` util (in `lib/`) owns this table so push, SMS, and in-app all land on the same route.

---

## 10. Guard summary & middleware matchers

| Group | Middleware | Layout guard hook |
|---|---|---|
| `(marketing)` | public matcher | none |
| `(auth)` | public (Clerk pages) | redirect authed users past sign-in |
| `(customer)` | protected | `useRequireAuth()` |
| `(seller)` | protected | `useRequireRole('seller')` → else add-role flow |
| `(dashboard)/vendor` | protected | `useRequireRole('vendor')` |
| `(dashboard)/hub` | protected | `useRequireRole('hub')` |
| `(admin)` | protected | `useRequireAnyRole('admin','ops_finance')` |

Public reads that work unauthenticated (per API 🔓): `/business/[id]` profile + menu, `/map` pins (approximate), `/gift/[code]`, `GET /queues/:ownerId`. These render for guests with an auth-gated CTA ("sign in to wave down"). All client guards are UX; the backend re-checks every call.
```
