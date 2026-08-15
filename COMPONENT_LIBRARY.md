# StreetServe — Component Library

> The reusable component architecture: design-system primitives, layout templates, domain components, and the theming contract — all derived from `docs/06 §2` (styling source of truth) and `docs/13` (per-screen specs), rendered with **styled-components** on a token-driven theme.
> Companion: [SCREEN_TO_COMPONENT_MAPPING.md](SCREEN_TO_COMPONENT_MAPPING.md), [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md), [RESPONSIVE_STRATEGY.md](RESPONSIVE_STRATEGY.md).

---

## 0. Principles

1. **Tokens → theme → components.** No hard-coded colors, spacing, radii, or durations in any component. Everything reads from the styled-components `theme` generated from `docs/06`'s tokens (which already exist verbatim as CSS variables in `docs/design/index.html`).
2. **Three tiers of component** (see [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) §3):
   - **Primitives** (`components/primitives`) — dumb, domain-agnostic, maximally reused (Button, Input, Chip…).
   - **Layout templates** (`components/layout`) — the 7 shells from `docs/12 §1` every screen composes into.
   - **Domain components** (`features/*/components`) — know a domain (QueuePositionCard, ReceiptCard, MapPin).
3. **Every component is `"use client"`** (styled-components requirement, `docs/07` caveat). Server components never import from `components/`.
4. **Accessibility is built into the primitive, not bolted onto the screen** — focus ring, 44px targets, `aria-*`, `prefers-reduced-motion` live in the primitive so no screen can forget them.
5. **Every stateful component ships loading / empty / error variants** where applicable — states are props/variants, not afterthoughts (`docs/12 §6`).

---

## 1. Theming contract (`styles/`)

```ts
// styles/tokens.ts — raw values, dark + light, straight from docs/06 §2.2–2.6 & design/index.html
export const tokens = {
  color: {
    dark:  { surfaceBase:'#0E0F12', surfaceRaised:'#17181C', textPrimary:'#F4F4F5', /*…*/
             accentPrimary:'#FF6B45', accentSecondary:'#4C8DFF', statusLive:'#22C55E',
             statusWarning:'#FDB022', statusDanger:'#F04438', statusDiscount:'#9B8AFA' },
    light: { surfaceBase:'#FAFAF9', surfaceRaised:'#FFFFFF', textPrimary:'#14151A', /*…*/
             accentPrimary:'#FF5A33', accentSecondary:'#1E6FFF', statusLive:'#17B26A', /*…*/ },
  },
  space:  [0,4,8,12,16,24,32,48,64],                 // 4px base
  radius: { control:8, card:16, pill:9999 },
  type:   { scale:[12,14,16,20,24,32,40,56], body:1.4, display:1.15,
            display:'Inter Tight', body:'Inter', numeric:'Inter (tabular-nums)' },
  motion: { micro:100, standard:200, sheet:300,
            easeIn:'cubic-bezier(0.4,0,1,1)', easeOut:'cubic-bezier(0.2,0,0,1)' },
  status: { driving:'live', parked:'accentSecondary', away:'statusDiscount' }, // semantic map
};
```

### 1.1 Elevation — `theme.elevation`

There was a single `shadow` token, used in 27 places, so a toast, a card and a bottom sheet cast the
same shadow and nothing could say *this sits above that*. Four levels, each named for what the
surface is **doing** rather than how strong the shadow looks:

| Level | Use it for | Rule of thumb |
|---|---|---|
| `flat` | cards, list rows, table rows | scrolls **with** the page |
| `raised` | menus, popovers, the business picker's results | lifted, still attached to a trigger |
| `floating` | the orbit, FABs, sticky bars | above the page, no scrim |
| `overlay` | sheets, modals, toasts | over everything, **has a scrim** |

Each level is two shadows — a tight contact shadow for the edge, a wide ambient one for the lift. A
single large blur reads as fog; the pair reads as an object. Dark mode uses deeper alpha on purpose:
the light-mode values are invisible on a near-black surface.

```ts
box-shadow: ${({ theme }) => theme.elevation.overlay};
```

### 1.2 Charts — `theme.chart`

Series colour is a **different job** from status colour. `statusDanger` on a series says "this line
is bad", not "this line is Orders" — so the status palette stays reserved for state, and
`chart.series1…4` are for identity only.

**Four slots, and that is a measured limit rather than a shortcut.** Every candidate palette was run
through the dataviz validator. With the brand burnt-orange occupying the warm side, a fifth and
sixth hue collided with it under all-pairs comparison — olive vs the brand orange came out at
**ΔE 3.2** for protanopia (indistinguishable) and magenta at **11.7 for normal vision**. Shipping six
colours would have meant two unreadable pairs, so the palette stops at four.

Both modes pass all six checks under `--pairs all` (the strict setting — any two series can become
adjacent once a filter removes the ones between them):

| Mode | Series | Worst pair |
|---|---|---|
| light | `#175CD3` `#C4410C` `#0D9488` `#A21CAF` | ΔE 21.8 normal · 9.6 deutan |
| dark | `#3B82F6` `#D9662B` `#0E9F8F` `#B84FC7` | ΔE 19.7 normal · 9.1 deutan |

Rules that are not negotiable:

- **Assign in fixed order, never cycle.** Colour follows the entity, so filtering a series out must
  not repaint the survivors. Use `CHART_SERIES_KEYS[i]`; running past the end is the signal to
  aggregate into "Other" or switch to small multiples, never to generate a hue.
- **One axis.** Two measures of different scale become two charts, never two y-scales.
- **Text wears text tokens**, never the series colour; a coloured mark beside the label carries
  identity.
- **≥2 series always carries a legend**, so identity is never colour-alone.
- `chart.grid` and `chart.axis` are deliberately recessive — furniture must not compete with data.
  `chart.gap` is the surface-coloured 2px separator between adjacent fills, so two bars read as two
  objects.

Dark mode is **selected, not flipped**: its steps were validated against the dark surface
(`#17181C`) independently. An automatic lightening of the light palette fails the dark lightness
band.

---

- `styles/theme.ts` builds the active `DefaultTheme` (dark by default) and swaps palette on `data-theme`.
- `styles/styled.d.ts` augments styled-components' `DefaultTheme` so `theme.color.accentPrimary` is **typed** everywhere.
- `styles/GlobalStyle.ts`: reset, base font, `:focus-visible` ring (2px `accentSecondary`, offset 2px — `docs/06 §2.6j`), `.tnum` tabular-nums, and the `@media (prefers-reduced-motion)` collapse (`docs/06 §2.6c`).
- **Theme switching**: `data-theme` on `<html>`; default follows `prefers-color-scheme`; `theme.store.ts` holds the explicit override (`docs/06 §2.7`).

---

## 2. Primitives (`components/primitives`)

| Component | Variants / props | Spec source | Notes |
|---|---|---|---|
| `Button` | primary / secondary / tertiary / destructive · size default(44px)/compact(36px) · states default/pressed/disabled/**loading** | `docs/06 §2.6a` | loading = spinner replaces label, **width locked**; one primary per region |
| `IconButton` | 44px hit area (36px visual allowed) | §2.6a | used in action rows |
| `Input` / `TextArea` | label-above, focus/filled/error/disabled; inline error via `aria-live` | §2.6b | never placeholder-as-label |
| `Select` / `Stepper` | quantity steppers (cart, reserve) | §2.6b | tabular numerals |
| `Chip` / `StatusChip` | Driving/Parked/Away/Pop-Up/Free/Discount-tier | §2.6 | **color + icon + text** (never color-only) |
| `Badge` | count / unread / tier | §2.6 | pill radius |
| `Avatar` | user / business logo, circular crop | §2.6g | 1:1 source |
| `Skeleton` | line / block / circle, shimmer | §2.6e | matches target geometry — never a spinner for content |
| `Spinner` | payment-in-flight / blocking submit **only** | §2.6e | sanctioned exception |
| `Toast` | transient 4s, bottom above tab bar, one at a time | §2.6d | via `ToastProvider` |
| `Banner` / `Alert` | persistent inline strip, status-colored left edge | §2.6d | Pop-Up, offline, errors |
| `Sheet` | bottom sheet, 3 snap points (peek/half/full), 32×4 handle, scrim | §2.6f | **core** — see §3 SheetStack |
| `Tabs` / `SegmentedControl` | category tabs, context toggles | §2.5a | horizontal scroll, active inverts |
| `ProgressRail` / `Stepper(vertical)` | queue dot rail, order tracker, wizard steps | §2.6 | server-authoritative values |
| `Countdown` | tabular-num timer from a **server deadline** | `docs/13 C-19` | never a client-authoritative `setInterval` |
| `Modal` / `Dialog` | confirmations (rare — most actions are toast-confirmed) | §2.6 | `role="dialog"`, focus trap |
| `EmptyState` | icon + message + **action** | §1 "empty state as a sales tool" | actionable, never a dead end |
| `ErrorState` | message + **Retry** | §2.6d | re-invokes query |

---

## 3. Layout templates (`components/layout`) — the 7 shells from `docs/12 §1`

| Template | Structure | Used by | Web implementation notes |
|---|---|---|---|
| **MapShell** | full-bleed `<Map>` + pinned search/tab header + floating FAB + bottom tab bar; overlays are bottom sheets | C-10/11/13, S-03, C-17 | Mapbox GL JS in a `"use client"` `next/dynamic(ssr:false)` `<Map>`; header is `position:sticky` over canvas |
| **SheetStack** | bottom `Sheet` at 3 snaps over MapShell; full snap → scrollable page w/ sticky action row | C-14/15/16/18, filters | Web bottom-sheet (e.g. Vaul or a custom framer-motion sheet) — replaces the RN `@gorhom/bottom-sheet` in `docs/13` notes |
| **TabPage** | header (title + actions) + scrollable content + bottom tab bar | Favorites, Orders, Messages, Profile, Earnings, My Inventory | standard responsive page |
| **WizardFlow** | step indicator + single-focus step + primary CTA; back always; progress persisted per step | onboarding, verification, register, QR checkout, gift/Spot Me | progress in Zustand/URL step param; resumable |
| **DashboardShell** | left sidebar (collapsible→icon rail→hamburger) + topbar (role switcher, notifications) + content; 3–4col stat grids → 1 | Vendor, Hub, Admin | breakpoints 640/1024/1280 (`docs/06 §2.6i`); max-width 1440 |
| **SettingsList** | grouped list rows (label/value/chevron or toggle); destructive isolated last | all settings screens | `docs/12 §1` |
| **ConversationView** | message list + composer; system/context banner slot on top | messages, dispute threads, AI coaching | virtualized list; live via `/messages` |

Each App Router route-group `layout.tsx` installs one of these as its shell (`ROUTING_STRUCTURE.md`).

---

## 4. Domain components (live in their `features/*/components`)

From `docs/06 §2.6` core primitives + `docs/13` per-screen specs. These know their domain and are reused across the screens listed.

| Component | Feature | Reused by | Key behavior |
|---|---|---|---|
| `Map` | livemap | C-10/11/12/14/17, S-03, H-04, V-02 | one Mapbox wrapper; dark/light styles (`§2.6h`); isolates Mapbox↔MapLibre swap |
| `MapPin` (+ `StatusRing`) | livemap | map screens | 48px, business logo, 3px status ring, Driving pulse, ETA chip; interpolates socket ticks, snaps under reduced-motion |
| `ClusterPin` | livemap | C-10, C-17 | density collapse + count badge |
| `BusinessProfileSheet` | business | C-14 (+peek reused by C-10) | **one status value drives 5 surfaces** (cover/chip/location/queue/CTA) via a single selector |
| `MenuListItem` | business | C-15, C-21 | name/photo/price/Today's-Special flag/Order |
| `QueuePositionCard` / `DiscountLadder` | queue | C-14, C-20, V-04 | dot rail, locked-tier highlight (violet), consumed tiers struck through |
| `WaveStatusCard` | wave | C-19 | waiting/accepted/declined-expired sub-states; empathetic no-charge copy |
| `OrderTracker` | orders | C-23, V-05 | pending→accepted→ready→completed/cancelled, from `orders.status` |
| `ReceiptCard` | orders/payments | C-24, S-10 | itemized base→discount→tip→fee-split, tabular nums |
| `PriceLine` / `DiscountBadge` / `FeeSplit` | money | cart, receipts, settlement | cents→display via `lib/money.ts` |
| `PaymentSheet` | payments | C-22, C-26, S-06, V-09 | Stripe Elements + round-up; pending/decline states; idempotency |
| `TrustScoreBadge` | trust | C-14, S-10, H-03 | **tap-to-explain "why"** popover; versioned formula shown |
| `MessageBubble` / `ThreadListItem` | messaging | C-32/33, V-08 | unread indicator; read receipts |
| `AIRecommendationCard` | ai | S-11, H-06 | one-at-a-time, "why" line, accept/dismiss |
| `VerificationTierLadder` | verification | C-36, S-02 | Bronze→Gold progress; pending/rejected doc states |
| `QRScanner` | consignment/jobs | S-06, S-09, S-14 | `getUserMedia` + html5-qrcode; permission + fallback states |
| `PhotoCapture` | consignment/trust | S-06, S-09, C-38 | camera/condition/evidence photos → `POST /storage/upload-url` |
| `DisputeCaseTracker` | trust | C-38, A-02 | SLA timer, evidence viewer, status |
| `StatTile` / `DataTable` / `Chart` | data | V-11, S-13, H-06, A-01 | dashboards; charts lazy-loaded |
| `LiveStatusToggle` | vendor | V-02 | Driving/Parked/Away; go-live; 422 LICENSE_REQUIRED handling |
| `RoleSwitcher` | identity | all shells | additive-role account switch (`docs/06 §3`) |
| `NotificationCenter` | notifications | global | inbox (⚠️needs GAP-3 endpoint) + deeplink routing |

---

## 5. States every list/data component must ship (`docs/12 §6`)

| State | Component | Rule |
|---|---|---|
| Loading | `Skeleton` matching geometry | never a spinner for content |
| Empty | `EmptyState` with an action | "sales tool" — widen radius / pre-register / check Jobs |
| Error | `ErrorState` with Retry | human-readable, retryable |
| Offline | cached data + "may be stale" `Banner` | map pins at reduced opacity + timestamp |
| Pending (money) | `Spinner` + locked button | only on 💳 flows |
| Failure (money) | `Banner` "nothing was charged" | no double-charge messaging |

---

## 6. Build order (primitives first — everything depends on them)

1. **Theme + GlobalStyle + tokens** (`styles/`) — nothing renders correctly without this.
2. **Primitives** — Button, Input, Chip, StatusChip, Skeleton, Toast, Banner, Sheet, Tabs, EmptyState, ErrorState.
3. **Layout templates** — MapShell, TabPage, WizardFlow, DashboardShell, SettingsList, ConversationView, SheetStack.
4. **`Map` + `MapPin`** — unblocks the entire customer/seller map surface.
5. **Money + realtime domain components** — PaymentSheet, ReceiptCard, QueuePositionCard, OrderTracker.
6. Remaining domain components per feature as their screens are built (see [FRONTEND_IMPLEMENTATION_ROADMAP.md](FRONTEND_IMPLEMENTATION_ROADMAP.md)).

A **Storybook** (or Ladle) catalog of primitives + templates in both themes is strongly recommended before screen work, so the 77 screens compose known-good parts — this is the practical guarantee of "100% design-system consistency."

---

## 7. Note on `docs/13` "RN implementation notes"

Every screen spec in `docs/13` carries an "RN implementation notes" block (e.g. "Mapbox GL RN," "`@gorhom/bottom-sheet`"). Per the platform reconciliation (`NEXTJS_ARCHITECTURE.md §0`), read these as **intent, translated to web**:

| `docs/13` says (RN) | Web/PWA equivalent used here |
|---|---|
| Mapbox GL RN / MapLibre RN | **Mapbox GL JS** / MapLibre GL JS in a client `<Map>` |
| `@gorhom/bottom-sheet` | **Vaul** or a framer-motion bottom sheet (`Sheet` primitive) |
| Custom annotation views | Mapbox custom HTML markers (status ring/pulse in CSS) |
| Local-storage persistence | same (web `localStorage`) |
| Native maps deep-link (Directions) | `https://maps.google.com/…` / `geo:` URL |
| Push + haptic | **Web Push** (installed PWA) + Vibration API; SMS bridge for background-blocked (`docs/07`) |

The *behavioral* content of every `docs/13` note (server-authoritative timers, single status selector, socket namespaces, no-polling) carries over **unchanged** — those are platform-agnostic and remain binding.
```
