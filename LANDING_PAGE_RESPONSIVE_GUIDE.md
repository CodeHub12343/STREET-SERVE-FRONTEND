# StreetServe — Landing Page Responsive Guide

> How every section adapts across desktop, tablet, and mobile, plus PWA considerations. Breakpoints and principles inherit from [RESPONSIVE_STRATEGY.md](RESPONSIVE_STRATEGY.md) (`sm:640 / md:1024 / lg:1280`, mobile-first min-width queries).

---

## 1. Marketing-specific principles

1. **Mobile is the majority visitor** (shared links, social, QR at events) — the mobile experience is designed first, then desktop adds cinema, not the reverse.
2. Unlike the product's phone-width app column, the marketing page **uses full desktop width** (content max 1200px, full-bleed map/visual bands) — it's a stage, not an app shell.
3. The hero map is the most expensive element on the page; its responsive strategy is a **capability ladder** (3D doc §7 tiers), not just layout reflow.
4. Touch never loses information to hover: every hover-revealed demo/label also triggers on tap/focus/in-view.

## 2. Global grid & type

| Range | Container | Columns | Display type |
|---|---|---|---|
| <640 | 100% − 2×20px | single column | H1 `clamp(40px, 11vw, 56px)`; H2 32px |
| 640–1023 | 100% − 2×32px | 2-col where noted | H1 up to 72px; H2 36px |
| 1024–1279 | max 1080px | full layouts | H1 up to 80px; H2 40px |
| ≥1280 | max 1200px (visual bands full-bleed) | full layouts | H1 `clamp` cap 88px; H2 40px |

Body 16–17px throughout (inputs ≥16px — iOS zoom-on-focus rule). Spacing between sections: 96px desktop / 72px tablet / 56px mobile. Safe areas: sticky CTA bar and any bottom-anchored UI pad with `env(safe-area-inset-bottom)`.

## 3. Per-section adaptation

| Section | Desktop (≥1024) | Tablet (640–1023) | Mobile (<640) |
|---|---|---|---|
| **Nav** | 64px bar, center anchors, right CTAs | anchors collapse into menu at <900px width | 56px bar: wordmark + primary CTA + hamburger → full sheet menu |
| **Banner** | above nav content, single line | same | below nav, may truncate with tap-to-expand |
| **Hero** | 100svh; overlay content column left over full-bleed T1 map; parallax on | 100svh; content column narrows; map T2 (pitch ≤45°); parallax off | stacked: content ~45svh above 55svh map panel (T2-lite: pitch 0–30°, 4 pins, 1 floating card, `cooperativeGestures`); CTAs full-width |
| **Metrics strip** | 3 tiles + sponsor in one row | 2×2 grid | horizontal snap-scroll row of tiles |
| **How it works** | 3 panels side by side | 3 stacked, wide | 3 stacked |
| **Feature bento** | 12-col bento (2 large + 4 med + 2 small) | 2-col grid, all equal | single column; large cards first; demos autoplay in-view (no hover) |
| **Map showcase** | pinned sticky scene, 300vh track, caption rail left | pinned scene retained ≥768px; captions overlay bottom | **carousel fallback** (4 static beat cards, swipe + dots) — no sticky scene <768px |
| **Benefits tabs** | horizontal tabs, panel = text left + device visual right | tabs; panel stacks text above visual | tabs horizontally scrollable; stacked panel |
| **Impact** | text + vignette 2-col | stacked | stacked |
| **Testimonials** | 3-card row | 2 + swipe | 1-card swipe carousel |
| **Trust** | 4 tiles + fee diagram beside | 2×2 tiles, diagram below | stacked tiles; fee diagram simplified to a static labeled bar |
| **Partners** | single logo row | wrap 2 rows | wrap; smaller marks |
| **FAQ** | accordion max 720px centered | same | full-width accordion |
| **Final CTA** | map backdrop full-bleed; inline 2-field form + role select | same, form narrower | map backdrop simplified (static poster ok on T2-); button → wizard sheet instead of inline form |
| **Footer** | 4 columns | 2×2 | stacked accordion-style groups |
| **Sticky mobile CTA** | never | never | appears after hero, per component spec |

## 4. The hero/showcase capability ladder (recap, binding)

Layout breakpoints and capability tiers are **independent axes**: a powerful phone gets T2 visuals in the mobile layout; an old desktop gets T3 in the desktop layout. Detection order: reduced-motion → no-WebGL/`prefers-reduced-data` → `deviceMemory`/UA-class → default T1. Full ladder in [LANDING_PAGE_3D_INTERACTIONS.md](LANDING_PAGE_3D_INTERACTIONS.md) §7.

## 5. Input-modality rules

- Hover effects (card lift, logo color, pin labels) are pointer-only enhancements (`@media (hover: hover)`); tap equivalents: first tap = reveal state where a hover reveals info, second tap = action — avoided wherever possible by making reveals in-view-triggered on touch instead.
- Map gestures: `cooperativeGestures: true` everywhere the map shares a scroll page (two-finger pan / ctrl+scroll zoom) — page scroll is sacred.
- Keyboard: every pointer path has a keyboard path (nav anchors, pins via overlay list, tabs with arrow keys, accordion, wizard) — detailed in [LANDING_PAGE_ACCESSIBILITY.md](LANDING_PAGE_ACCESSIBILITY.md).
- Wizard on desktop = centered modal (max 480px); on mobile = full-height `Sheet`. Same component, container swaps at `sm`.

## 6. PWA & platform considerations

- The marketing route is part of the same Next.js PWA but **excluded from any app-shell precache** (marketing assets shouldn't bloat the product's offline cache); cache-first for its static assets via normal HTTP caching/CDN instead.
- Post-launch, the final CTA's install path: on capable browsers surface the `beforeinstallprompt`-driven "Add StreetServe to your home screen" instead of store badges (pre-launch copy: "Works on any phone — no app store needed").
- `viewport-fit=cover` + `100svh` (not `100vh`) for the hero — correct behavior with mobile browser chrome; test iOS Safari toolbar collapse specifically.
- Social/OG: OG image = hero poster frame (1200×630 static render); Twitter card `summary_large_image`. The page must look intentional inside in-app browsers (Instagram/TikTok webviews = a top referrer class): T2 tier forced there (webview WebGL is flaky), sticky CTA verified against their bottom bars.
- Battery: simulation + drift suspend on `document.hidden` and when the map section is off-screen (shared IntersectionObserver).

## 7. Test matrix (minimum)

| Device class | What must be verified |
|---|---|
| iPhone SE/12-class Safari | 100svh hero, safe-area CTA bar, cooperative gestures, wizard sheet |
| Mid-tier Android Chrome (Moto G-class) | T2 tier auto-selected, LCP ≤2.5s, 60fps scroll with map idle |
| iPad Safari (portrait + landscape) | tablet layouts, showcase pinned-scene ≥768px |
| 1440p desktop Chrome/Firefox/Edge | T1 full scene, parallax, bento grid |
| Instagram/TikTok in-app webview | T2 forced, CTA reachable, no gesture traps |
| Keyboard-only + NVDA/VoiceOver | full journey to conversion (a11y doc) |
