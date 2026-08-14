# StreetServe — Responsive Strategy

> How one Next.js codebase serves mobile-viewport product surfaces (customer/seller), desktop-first dashboards (vendor/hub/admin), and everything between — with the breakpoints, layout adaptations, and accessibility parity the design system requires.
> Companion: [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) §3, [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md) §0, `docs/06 §2.6i`.

---

## 1. The core principle

There are **two design intents in one responsive app** (recall `NEXTJS_ARCHITECTURE §0`):

| Surface | Primary viewport | Must also work at |
|---|---|---|
| Customer `(customer)`, Seller `(seller)` | **Mobile** (≤640px), installed PWA | up to desktop (centered, max-width app column) |
| Vendor/Hub `(dashboard)`, Admin `(admin)` | **Desktop** (≥1024px) | down to mobile (a vendor on a phone) |

We do **not** ship separate mobile/desktop codebases — same React tree, responsive via styled-components media queries on the token breakpoints.

---

## 2. Breakpoints (`docs/06 §2.6i`)

```ts
// styles/tokens.ts
breakpoints = { sm: 640, md: 1024, lg: 1280 };   // min-width, mobile-first
```

| Range | Customer/Seller | Dashboards |
|---|---|---|
| `<640` | full mobile app (bottom tab bar, sheets full-width) | sidebar hidden behind hamburger; stat grid 1-col; tables → stacked cards |
| `640–1023` | app column max ~480px, centered, more breathing room | sidebar as **icon rail**; stat grid 2-col |
| `1024–1279` | centered app column; map can widen | sidebar icon rail → expandable; stat grid 3-col |
| `≥1280` | centered app column (product stays phone-width by design) | **full sidebar**; stat grid 3–4 col; content max-width **1440px** |

Mobile-first: base styles target the smallest viewport; `min-width` media queries add desktop affordances.

---

## 3. Per-template responsive behavior

| Template | Mobile | Tablet | Desktop |
|---|---|---|---|
| **MapShell** | full-bleed map, bottom tab bar, sheets slide from bottom | same, wider map | map fills a centered app column; sheets become a side panel option |
| **SheetStack** | bottom sheet, 3 snaps | bottom sheet | on wide screens, business profile may render as a right-docked panel instead of a bottom sheet (optional enhancement) |
| **TabPage** | single column + bottom tab bar | single column, wider | centered column; bottom tab bar may move to a top/side nav |
| **WizardFlow** | full-screen steps | centered card | centered card, max ~560px |
| **DashboardShell** | hamburger drawer + stacked content; tables → cards | icon-rail sidebar; 2-col grids | full sidebar + topbar; 3–4-col grids; 1440 max |
| **SettingsList** | full-width rows | centered list | centered list, max ~640px |
| **ConversationView** | full-screen thread | thread + optional list pane | list pane + thread side-by-side (inbox layout) |

---

## 4. Navigation adaptation

- **Customer/Seller bottom tab bar** (Map·Favorites·Orders·Messages·Profile) is the mobile primary nav; on very wide screens it can shift to a top bar but the app stays phone-width (the product is inherently one-handed/outdoor — `docs/06 §1`).
- **Dashboard sidebar** collapses full → icon rail → hamburger across `1280/1024/640` (`docs/06 §2.6i`).
- **Role switcher** is in the profile (mobile) / topbar (dashboard) — same `mode.store`, different placement.

---

## 5. Touch, pointer & input

- **44×44px minimum touch targets** everywhere (`docs/06 §2.8`) — enforced in primitives, not per screen.
- Hover states are progressive enhancement (desktop); never the only affordance (touch has no hover).
- Map: pinch-zoom + drag on touch; scroll-zoom + drag on pointer; both drive the same `mapViewport.store`.
- Dashboards add pointer conveniences (drag-and-drop order kanban V-05, hover tooltips on charts) that degrade to tap equivalents on touch.
- Forms use appropriate mobile keyboards (`inputmode`, `type`) and avoid iOS zoom-on-focus (≥16px inputs).

---

## 6. The map on every viewport

- The map is the most viewport-sensitive component: it fills available space but keeps controls (search, tabs, FAB) within thumb reach on mobile and repositions for pointer on desktop.
- **Safe areas**: respect `env(safe-area-inset-*)` for notches/home indicators (the design's 78px tab bar includes home-indicator padding, `docs/13 C-10`).
- Map dark/light styles switch with theme at any size (`docs/06 §2.6h`).

---

## 7. Accessibility parity across viewports (non-negotiable)

- **List view (C-12) is full functional parity** for the map at **every** viewport — the only way screen-reader/low-vision users use the core feature (`docs/06 §1, §2.8`). It is not a mobile-only or desktop-only affordance.
- Focus order, focus ring (2px `--blue`, `docs/06 §2.6j`), and keyboard operability identical across sizes; dashboards are fully keyboard-navigable (tables, kanban, calendar).
- Color-plus-icon-plus-text for all status at all sizes; `prefers-reduced-motion` respected regardless of viewport.
- Orientation: support both portrait and landscape; never lock (WCAG).

---

## 8. Implementation mechanics

- **styled-components media queries** from a `media` helper reading `breakpoints` (no magic numbers in components).
- **Container queries** where a component's layout should depend on its container, not the viewport (e.g. a stat tile grid inside a resizable dashboard panel) — used selectively.
- **`next/dynamic`** for viewport-heavy widgets (map, charts) with `ssr:false`.
- Avoid `window`-based conditional rendering for layout (hydration mismatch) — prefer CSS media/container queries; use a `useMediaQuery` hook only for genuinely behavioral branches (e.g. sheet-vs-panel), guarded against SSR.
- **Test matrix**: 360px (small phone), 390/430px (typical phones), 768px (tablet), 1024/1280/1440px (desktop) — plus the installed-PWA standalone viewport with safe-area insets.
```
