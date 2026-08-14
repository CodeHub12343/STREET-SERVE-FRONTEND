# StreetServe — UX Recommendations & Design System

## 1. UX Recommendations

- **Map-first, not list-first.** The core value prop is spatial ("who's near me, right now"); every primary flow (wave down, join queue, browse consignment inventory) should be reachable in one tap from the map, not buried in a separate tab.
- **Make trust visible, not just enforced.** Trust Score, discount tiers, and fee splits should always be shown with a one-line "why" (FR-9.1, FR-10.1) — opaque scoring is the fastest way to lose a gig-economy audience's confidence.
- **Reduce first-sale anxiety for sellers.** The consignment flow's biggest UX risk is a first-time seller (especially a Shelter Program participant) feeling they might "lose money." The checkout-in flow should explicitly confirm "you owe nothing until you sell — return anything unsold for $0 cost" at the moment of pickup.
- **Collapse the vendor/seller pin visual language.** Customers shouldn't need to learn two mental models — an established food truck and a Street Seller with a folding table both appear as a live, waveable pin; the profile sheet is where the distinction (business vs. individual seller) becomes visible.
- **Progressive disclosure for AI features.** Don't front-load sellers with dashboards full of predictive numbers on day one; surface one clear recommendation at a time ("Sell these 3 items today near Graceada Park") and let power users drill into the full AI dashboard.
- **Design the empty state as a sales tool.** "No vendors near you yet" and "no consignment inventory nearby" are both pre-launch-market realities (per the current one-city rollout) — treat them as invitations to pre-register/widen radius/check Jobs, not dead ends.
- **Friction should scale with money movement, not with browsing.** Account creation for browsing is nearly frictionless; verification steps appear only when a user is about to touch money (matches the tiered model in Flow 1b) — this keeps top-of-funnel wide while satisfying compliance.
- **Accessibility as a map alternative.** A live list view (sortable by distance) is not a "nice to have" — it's the only way screen-reader and low-vision users can use the core feature at all.

## 2. Design System

### 2.1 Design Language
Energetic, kinetic, street-level — but credible enough to pass for a fintech-adjacent product (it moves real money). The existing landing page already leans dark-mode-first with high-contrast live-status chips ("Live," "3 moving") — carry that into the product as the default theme, with a light theme as a first-class equal, not an afterthought.

### 2.2 Color Palette (recommended, brand-neutral starting point)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--surface-base` | #FAFAF9 | #0E0F12 | App background |
| `--surface-raised` | #FFFFFF | #17181C | Cards, sheets |
| `--text-primary` | #14151A | #F4F4F5 | Primary text |
| `--text-secondary` | #5B5E68 | #9C9FA8 | Secondary text |
| `--accent-primary` | #FF5A33 | #FF6B45 | Wave down, primary CTAs — "street energy" orange, distinct from typical blue-fintech default |
| `--accent-secondary` | #1E6FFF | #4C8DFF | Map/live indicators, links |
| `--status-live` | #17B26A | #22C55E | Live/moving pin, success states |
| `--status-warning` | #F79009 | #FDB022 | Pop-Up mode, pending states |
| `--status-danger` | #D92D20 | #F04438 | Errors, disputes, declines |
| `--status-discount` | #7A5AF8 | #9B8AFA | Line-up discount badges |
| `--status-driving` | #17B26A | #22C55E | Map pin ring + badge — business is moving (same hue as `--status-live`, shared semantic) |
| `--status-parked` | #1E6FFF | #4C8DFF | Map pin ring + badge — business is stationary and open (shared with `--accent-secondary`) |
| `--status-away` | #7A5AF8 | #9B8AFA | Map pin ring + badge — business is Away/Closed (shares hue with `--status-discount`; the two never appear on the same element, so reuse is safe) |

All pairings above meet WCAG 2.1 AA contrast (4.5:1 text, 3:1 UI components) against their respective surface token — verify with a contrast checker before final ship, especially the orange-on-dark accent.

### 2.3 Typography
- **Display/Headings:** a geometric grotesque (e.g., Inter Tight or General Sans) — confident, works at both hero-landing scale and small dashboard labels.
- **Body/UI:** Inter — mature, highly legible at small sizes on map overlays, wide language/character support for the multi-language roadmap item.
- **Numeric/Data (prices, scores, countdowns):** tabular-figure variant of the body font, so discount tiers and countdown timers don't visually jitter.
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56px, 1.4 line-height for body, 1.15 for display.

### 2.4 Spacing & Shape
- 4px base spacing unit (4/8/12/16/24/32/48/64).
- Border radius: 8px for controls/inputs, 16px for cards/sheets, full-round for pins/avatars/status chips — chips and pins should read as distinct from cards at a glance.
- Elevation via subtle shadow in light mode, subtle border/glow in dark mode (avoid heavy drop-shadows on dark surfaces, which read muddy).

### 2.5 Iconography
- Single consistent icon set (e.g., Phosphor or Lucide — both open-license, consistent stroke weight) — avoid mixing icon families between the marketing site and product.
- Live/moving state always paired with a subtle pulse animation on the map pin (respect `prefers-reduced-motion`).
- **Map pins display each business's own uploaded logo/icon** inside a colored status ring (Driving/Parked/Away-Closed, §2.2), confirmed by the client's UI reference — the platform icon set above governs *UI chrome* (buttons, status glyphs, nav), not the pins themselves. Business-uploaded icons need a moderation/format pipeline (square crop, size limit, content review) since they render at small sizes across every customer's map.

### 2.5a Map Screen Composition (per client reference)
- Persistent search bar ("Search businesses or services") pinned above the map.
- Category tab row directly below search: **All / Food / Coffee / Services / Shopping / More**, with the full category taxonomy ([04-feature-breakdown.md](04-feature-breakdown.md), category metadata in [08-database-design.md](08-database-design.md)) reachable via "More" rather than all shown at once.
- Floating primary CTA ("Serve Near Me") docked above the tab bar, recentering/refreshing the map on the user's current location.
- Tapping a pin opens a bottom sheet (mobile) — see the Component System entry below for its contents.

### 2.6 Component System (core primitives to define first)
- Map pin (business / seller / event-cluster variants; custom business logo inside a Driving/Parked/Away-Closed status ring, §2.5)
- Status chip (Driving, Parked, Away/Closed, Pop-Up, Free, Discount tier)
- Bottom sheet — **business profile** (cover photo, logo, name, category, rating + review count, status badge, About, hours, status+location line, Today's Special, Menu link, photo gallery, reviews list, and the Directions/Follow/Notify Me/Message action row) — the primary detail surface on mobile
- Search bar + category tab row (persistent map-screen header, §2.5a)
- Menu list item (name, photo, price, "Today's Special" flag, Order button)
- Message thread bubble + thread list item (unread indicator)
- Order status tracker (pending → accepted → ready → completed/cancelled)
- Queue position indicator (progress-style, shows position + discount)
- Trust/Reputation score badge (with tap-to-explain)
- Transaction receipt card (itemized: base price, discount, tip, fee split)
- AI recommendation card (recommendation + one-line "why" + dismiss/accept)
- Dispute/case status tracker

### 2.6a Button Hierarchy
- **Primary:** filled `--accent-primary`, white text, radius 8px — one per screen region, reserved for the main action (Wave Down, Order, Go Live).
- **Secondary:** 1.5px outline in `--text-secondary`, text in `--text-primary`, transparent fill.
- **Tertiary:** text-only in `--accent-secondary`, no container — inline/low-emphasis actions.
- **Destructive:** filled `--status-danger` for confirm-stage only; destructive entry points use tertiary style in danger color.
- Sizes: 44px height default (mobile), 36px compact (web dashboards). States: default / pressed (−8% lightness) / disabled (40% opacity, no elevation) / loading (spinner replaces label, width locked).

### 2.6b Form Inputs
- 44px min height, radius 8px, 1px border `--text-secondary` at 40% opacity; label above field (never placeholder-as-label).
- States: focus (2px `--accent-secondary` border), filled, error (1.5px `--status-danger` border + inline message below with danger icon), disabled (40% opacity).
- Validation messages appear inline below the field, never as toast-only; announced via `aria-live`.

### 2.6c Motion Tokens
- Durations: `--motion-micro` 100ms (state changes, chips), `--motion-standard` 200ms (buttons, list items), `--motion-sheet` 300ms (bottom sheets, page transitions).
- Easing: `cubic-bezier(0.2, 0, 0, 1)` (decelerate) for entrances; `cubic-bezier(0.4, 0, 1, 1)` for exits. One family, no springs except map pin pulse.
- All motion collapses to opacity-only ≤100ms under `prefers-reduced-motion`.

### 2.6d Feedback Components
- **Toast/snackbar:** transient (4s), bottom-anchored above tab bar, one at a time, `--surface-raised` + status icon (e.g., "You're in line — 10% locked").
- **Banner/alert:** persistent inline strip at top of the affected surface, status-colored left edge + icon + text + optional action (e.g., "Pop-Up — expect a wait").

### 2.6e Loading & Skeletons
- Skeleton shimmer blocks matching the target component's geometry for lists, cards, and sheets — never a centered spinner for content.
- Spinner reserved exclusively for payment-in-flight and blocking submissions.

### 2.6f Bottom Sheet Behavior
- Three snap points: **peek** (~120px, title + status + primary action visible), **half** (~50%), **full** (edge-to-edge with sticky action row, header collapses to a compact bar).
- 32×4px drag handle, radius 16px top corners, scrim at 40% black behind half/full; drag-down or scrim-tap dismisses from half, full requires header back/close.

### 2.6g Imagery Ratios
- Business cover 16:9 · logo/pin source 1:1 with circular crop preview at upload · menu item 4:3 · gallery grid 1:1. All uploads pass the moderation pipeline (§2.5).

### 2.6h Map Theming
- Dedicated dark and light map styles (Mapbox/MapLibre custom styles) — desaturated basemap so status rings and logo pins carry the color hierarchy; roads/labels at reduced contrast vs. defaults. Pins must pass 3:1 contrast against both basemaps.

### 2.6i Web Dashboard Grid
- Breakpoints: 640 / 1024 / 1280px. Sidebar: full (≥1280) → icon rail (1024–1279) → hidden behind hamburger (<1024). Stat grids: 3–4 col (≥1280) → 2 (≥640) → 1. Content max-width 1440px.

### 2.6j Focus Ring
- 2px solid `--accent-secondary` ring, offset 2px, on every interactive element for keyboard navigation; never removed, only restyled. Applies identically in both themes.

### 2.7 Dark Mode / Light Mode
Both are first-class; dark is the default given the existing marketing site's aesthetic and the "check the map at night while vendors are out" real-world usage pattern. Theme should follow system preference by default with an explicit in-app override.

### 2.8 Accessibility Compliance
- WCAG 2.1 AA minimum across contrast, focus states, and touch-target size (44×44px minimum).
- Full functional parity for the list-view map alternative (Section 1).
- All status communicated by color also carries an icon/text label (never color-only, for colorblind users).
- Motion (pin pulses, queue animations) respects `prefers-reduced-motion`.

## 3. Information Architecture & Navigation

**Primary navigation (Customer) — updated to match the client's UI reference:** **Map · Favorites · Orders · Messages · Profile.**
- *Map:* home screen, live pins, search, category tabs (§2.5a).
- *Favorites:* businesses the customer Follows (§2b in User Flows), with at-a-glance status.
- *Orders:* direct-order history (§2d) alongside wave-down transactions and bookings — one unified history rather than three separate lists.
- *Messages:* scoped business chat threads (§2c).
- *Profile:* account settings, and the entry points for **Jobs/Sell** (switches into Street Seller mode) and **Wallet** (payments, tips, Spot Me) that an earlier draft of this document had as their own top-level tabs — folded into Profile to match the client's simpler 5-tab bar. **Open item:** confirm with the client that burying Jobs/Sell and Wallet a level deeper doesn't undercut their intended visibility, since both are core to the consignment/gig side of the product (see [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md)).

**Primary navigation (Vendor/Hub dashboard, separate app mode or in-app switch):** Live Status (Driving/Parked/Away-Closed toggle) · Queue/Bookings · Menu & Today's Special · Messages (incoming customer threads) · Orders · Inventory (if also a Hub) · Ping Sharing · Analytics · Payouts.

**Primary navigation (Street Seller mode):** Discover Inventory (map) · My Inventory (active checkouts) · AI Assistant · Earnings · Trust Score.

Role-switching happens via a single account-level switcher (per the additive-roles rule in [02-product-vision-personas-roles.md](02-product-vision-personas-roles.md)), not separate logins.
