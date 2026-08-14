# StreetServe — Hero Section Specification

> The signature experience of the landing page: a living, interactive 3D map of the mobile economy. This document is the build spec — layout, map scene, simulation script, interaction model, states, and fallbacks.
> Motion timings: [LANDING_PAGE_ANIMATION_SPECIFICATION.md](LANDING_PAGE_ANIMATION_SPECIFICATION.md) §3 · camera/3D detail: [LANDING_PAGE_3D_INTERACTIONS.md](LANDING_PAGE_3D_INTERACTIONS.md) · components: [LANDING_PAGE_COMPONENT_SPECIFICATION.md](LANDING_PAGE_COMPONENT_SPECIFICATION.md).

---

## 1. Concept

**"The city, live."** A tilted 3D Mapbox scene of downtown Modesto at dusk, in the product's own dark map style, where a scripted-but-organic simulation of StreetServe activity plays out: vendors driving with glowing status rings, wave-downs arcing from customer dots, queues filling with discount chips, ping ripples spreading to friends, a Block Party cluster blooming. The visitor can grab the map and explore; pins are tappable and open real profile-card previews.

The hero uses **the product's actual map stack** (Mapbox GL JS 3.7, already a dependency; custom dark style per `docs/06 §2.6h`) — not a bespoke WebGL art scene. This is deliberate: the hero *is* a preview of the product, pin language and status rings included, so the first in-app map feels like coming home. It also means zero new heavyweight dependencies (no three.js — rationale in the 3D doc §1).

## 2. Layout

### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ nav (glass, transparent at top)                              │
│                                                              │
│  ┌─ content column (max 560px) ─┐        · pin →  ┌────────┐ │
│  │ ● LIVE eyebrow                │      route ~~~> │activity│ │
│  │ H1 (clamp 40→88px)           │        · pin    │ card   │ │
│  │ support paragraph             │     ripple ◎    └────────┘ │
│  │ [Get early access] [Explore ↗]│         · pin (pulsing)   │
│  │ trust line                    │                            │
│  └──────────────────────────────┘   "Simulated preview" chip │
│  scroll cue ⌄                                    (bottom-right)│
└─────────────────────────────────────────────────────────────┘
```
- Section: `100svh` (min 640px, max 1000px). Map canvas full-bleed underneath everything.
- Content column sits on a left-edge scrim: `linear-gradient(90deg, rgba(14,15,18,0.88) 0%, rgba(14,15,18,0.55) 45%, transparent 75%)` (light theme: white equivalents) — guarantees text contrast over any map region.
- Map's visual center of interest is offset to the right two-thirds (Mapbox `padding: { left: 480 }` so the camera composes around the content column).
- Scroll cue: subtle chevron + "See how it works", fades out after first scroll.

### Mobile (<640px)
- Vertical stack: content block (eyebrow → H1 → support → CTAs, top-aligned, ~45svh) above a map panel (~55svh, rounded-16 top corners, full-bleed width).
- The map panel runs the **lite simulation** (fewer actors, no pitch — see responsive guide §3). One floating activity card max at a time, anchored inside the map panel.
- CTAs full-width stacked; secondary becomes "See it in action ⌄" scrolling to the showcase.

## 3. The map scene

- **Camera (initial):** center on downtown Modesto (approx. `-120.9970, 37.6391`), zoom 15.2, pitch 55°, bearing −17°. Slow idle drift: bearing rotates ~1.2°/s cycling ±8°, imperceptible zoom breathing (±0.05) — the "living" feel even before any actor moves. Idle drift pauses during user interaction and under reduced motion.
- **Style:** dedicated marketing variant of the product dark map style — desaturated base (roads/labels at reduced contrast, `docs/06 §2.6h`), `fill-extrusion` 3D buildings at 60% opacity in a raised-surface tone, dusk atmosphere via Mapbox `fog` (soft horizon glow using a desaturated `accentSecondary` haze). Light-theme variant mirrors with the light map style at dawn tones.
- **Ground effects:** a subtle radial "activity heat" glow layer under pin clusters (semi-transparent `accentPrimary` at 8–12%), and animated route lines (line-gradient dash animation in `statusLive` green for en-route vendors).

## 4. Actors & simulation script

Simulation is a deterministic, seeded loop (~90s, then seamlessly repeats with re-seeded positions) driven by a single rAF-based director — not random timers — so QA can verify it and reduced-motion can freeze it at a good frame.

| Actor | Count | Behavior |
|---|---|---|
| **Vendor pins** (logo-in-status-ring, 48px, per `docs/06 §2.5`) | 7 | 3 Driving (green ring, pulse, moving along real street geometry via precomputed route lines), 3 Parked (blue ring, static), 1 Away (violet, dimmed) |
| **Customer dots** | ~12 | small soft dots that appear/fade near sidewalks; 2 of them initiate scripted events |
| **Wave-down vignette** | 1 per loop (~t=8s) | wave signal arcs customer→vendor; vendor ring flashes; route redraws to the customer; ETA chip ("4 min") counts down; on arrival a ✓ pop |
| **Queue vignette** | 1 per loop (~t=30s) | parked vendor sprouts a queue dot-rail; discount chips 15%→10%→5% get claimed one by one (violet `statusDiscount` chips) |
| **Ping ripple** | ~t=50s | expanding ripple from a pin; 3 friend-dots light up in sequence; a small "+$1 tip" coin chip lands on the forwarder |
| **Block Party** | ~t=70s | two driving vendors converge on a parked one; a warm glow radius blooms; "🎉 Block Party — 3 vendors at Graceada Park" toast card floats up |
| **Floating activity cards** | max 2 concurrent (desktop) | glass cards (`--surface-glass`) that rise from events and fade: "🌮 Tacos El Rey is 4 min away", "💜 Maria locked 15% off — #1 in line", "📣 Deshawn's ping brought 3 friends". 4s dwell, staggered. `aria-hidden` (decorative — content duplicated nowhere in AT) |

Names/brands in the simulation are fictional (Tacos El Rey, etc.) and consistent with the ones used in `docs/design/*` mockups. The "Simulated preview" chip (12px, `--surface-glass`, bottom-right) is always visible while the simulation runs — the honesty rule from [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §8.

## 5. Interaction model

| Input | Response |
|---|---|
| **Drag / scroll-pinch on map** | full pan/zoom (Mapbox defaults; scroll-zoom requires ctrl/cmd on desktop so page scroll is never hijacked; two-finger pan on touch, one-finger drag reserved for page scroll on mobile — Mapbox `cooperativeGestures: true`) |
| **Pointer move (desktop)** | parallax: content column translates up to 6px, floating cards up to 14px, opposite-sign to cursor (depth illusion); map camera unaffected. Disabled on touch + reduced motion |
| **Hover a pin** | ring brightens, name label chip fades in above, cursor pointer |
| **Click/tap a pin** | mini business-profile card (compact `BusinessProfileSheet` variant: cover thumb, logo, name, rating, status chip, "Join the line ↗" button → opens pre-registration) anchored to the pin, Esc/tap-out dismisses. Keyboard reachable (§7) |
| **Idle 20s** | camera performs one slow "tour" ease to a second vantage point and back |
| **User interacts with map** | idle drift + tour pause for 8s after last input, then resume |

## 6. Loading & states

1. **SSR frame (0ms):** content column + CTAs render server-side; map area shows the **poster** — a pre-rendered static image of the exact initial camera frame (WebP, ≤ 60KB, `fetchpriority=high`). This poster is the LCP element. A CSS-only pulse on two poster pin positions gives instant "alive" feel before any JS.
2. **Hydration:** simulation assets (routes, actor script ~5KB JSON) prefetch. Mapbox GL loads lazily on: pointer-enter hero, first scroll, or 1.5s idle — whichever first.
3. **Canvas swap:** map initializes at the poster's exact camera; canvas cross-fades over the poster in 400ms once `map.on('load')` + first actor tick — zero layout shift, no visible "map boot."
4. **Failure states:** WebGL unavailable / Mapbox error / data-saver (`prefers-reduced-data`) → poster stays, CSS pin pulses continue, everything else works. No error surface — the fallback *is* a designed state.
5. **Reduced motion:** poster + static pins with no pulse; a single "play preview ▶" affordance can opt in to the full scene ([LANDING_PAGE_ACCESSIBILITY.md](LANDING_PAGE_ACCESSIBILITY.md) §4).

## 7. Accessibility (hero-specific)

- H1, support, CTAs are plain DOM before any canvas exists — the hero's meaning never depends on the map.
- Map region: `role="region"`, `aria-label="Interactive map preview of live StreetServe vendors (simulated)"`. Canvas itself `aria-hidden`; an offscreen text alternative summarizes the scene ("A live map showing food trucks and mobile vendors moving through Modesto…").
- Pins are keyboard-focusable via a DOM overlay list (Tab reaches each named vendor pin; Enter opens its card; card is a focus-trapped popover). Focus ring per `docs/06 §2.6j`.
- Floating activity cards are decorative (`aria-hidden`) — they announce nothing (a live-region firing every few seconds would be hostile).
- Contrast: content column over scrim ≥ 4.5:1 in worst case; pin rings ≥ 3:1 against the basemap (`docs/06 §2.6h` requirement, verified in both themes).

## 8. Copy block (final draft for sign-off)

```
Eyebrow:   ● LIVE — THE MOBILE ECONOMY, ON THE MAP
H1:        Your city is open for business. Right now.
Support:   Every food truck, mobile pro, and street seller on one live map.
           Wave them down. Skip the line with early-bird discounts.
           Or start earning today — no inventory, nothing upfront.
CTA 1:     Get early access
CTA 2:     Explore the live map ↗
Trust:     Launching first in Modesto, CA · Backed by Wonder Ice · Free for customers
Caption:   Simulated preview
```

## 9. Acceptance criteria

- [ ] 5-second test passes (naive viewer identifies "live map of nearby vendors")
- [ ] LCP = poster image, ≤ 2.5s mid-tier mobile; CLS from canvas swap = 0
- [ ] All 6 vignettes fire per loop; loop seam invisible
- [ ] Pin tap → profile card → "Join the line" → pre-registration wizard, mouse + keyboard + touch
- [ ] Page scroll never hijacked by map gestures on any device
- [ ] Reduced-motion, no-WebGL, and data-saver each land on the designed static state
- [ ] "Simulated preview" chip visible whenever simulation runs
