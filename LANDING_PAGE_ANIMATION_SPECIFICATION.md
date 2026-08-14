# StreetServe — Landing Page Animation Specification

> Every motion on the page: tokens, scroll system, hero choreography, showcase scroll-scene, micro-interactions, and the reduced-motion contract. 3D/camera work is in [LANDING_PAGE_3D_INTERACTIONS.md](LANDING_PAGE_3D_INTERACTIONS.md).
> Base motion system: `docs/06 §2.6c` — extended (not replaced) by the marketing tier defined in [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §7.

---

## 1. Motion principles

1. **Motion explains, never decorates.** Every animation answers "what just happened / where did this come from / what can I do." The only sanctioned pure-atmosphere motion is the hero map's idle drift and pin pulses — because "alive" *is* the message.
2. **One easing family.** Entrances: `cubic-bezier(0.2, 0, 0, 1)` (decelerate). Exits: `cubic-bezier(0.4, 0, 1, 1)`. No springs except the map-pin pulse (existing product exception).
3. **Choreograph in one direction.** Reveals move up (8–24px) and fade in. Nothing slides in from left/right except the showcase captions (which follow the reading rail).
4. **60fps or don't.** Only `transform` and `opacity` animate (plus Mapbox-internal camera). No animated `box-shadow`, `filter: blur()` transitions, layout properties, or scroll-linked `top`.
5. **Everything collapses gracefully.** `prefers-reduced-motion` turns the page into a fully-functional still version (§7) — a first-class design state, not a degradation.

## 2. Token table

| Token | Value | Used for |
|---|---|---|
| `motion.micro` (product) | 100ms | chips, hover states, toggles |
| `motion.standard` (product) | 200ms | buttons, cards, tab switches |
| `motion.sheet` (product) | 300ms | pre-reg sheet/modal, mobile nav |
| `motion.reveal` (marketing) | 500ms | scroll-reveal of section content |
| `motion.hero` (marketing) | 600ms | hero entrance choreography, canvas cross-fade (400ms), camera eases (via Mapbox, 800–1500ms) |
| stagger unit | 70ms | sibling reveal offset, max 5 siblings (>5 = grouped) |

**Library decision:** Framer Motion (`motion/react`) for DOM animation + `IntersectionObserver` for reveal triggers + native rAF director for the map simulation. Rationale: declarative variants/stagger, built-in `useReducedMotion`, `LazyMotion` keeps it ~5KB on the marketing route; no GSAP (second animation grammar + license consideration, unjustified), no Lottie (nothing here needs baked vector video).

## 3. Hero entrance choreography (once, on load)

Timeline (t=0 is first paint; all entrances decelerate-ease):

| t | Element | Animation |
|---|---|---|
| 0ms | Poster/map, scrim | present immediately (LCP — never animated in) |
| 100ms | Eyebrow | fade + 8px rise, 400ms; live dot begins 2s pulse loop |
| 180ms | H1 | fade + 16px rise, 600ms (single block — no per-word/letter animation; splitting text harms screen readers and looks dated) |
| 320ms | Support paragraph | fade + 12px rise, 500ms |
| 460ms | CTA row | fade + 12px rise, 500ms |
| 600ms | Trust line + scroll cue | fade, 400ms |
| ~1.5–3s | Canvas swap | map cross-fades over poster 400ms; simulation starts at loop t=0 |
| +800ms | First floating card | rises 24px + fade, 500ms in / 4s dwell / 300ms exit |

Rule: the visitor can read and click before anything finishes — no animation blocks interactivity; CTAs are clickable from SSR paint.

## 4. Map showcase — scroll-driven scene (`#map-showcase`)

- **Mechanism:** section is `position: sticky` map panel + a 300vh scroll track. Scroll progress (0–1) maps to a 4-beat timeline; beats snap-complete (a beat, once >60% entered, animates to completion rather than scrubbing frame-by-frame — avoids the janky half-state problem and keeps map camera moves smooth).
- **Progress → beats:**

| Scroll | Beat | Map animation | Caption rail |
|---|---|---|---|
| 0.00–0.25 | 1 · Go live | pin drops (scale 0.6→1 + settle), ring colors to Driving green, pulse starts, camera eases to follow route start | caption 1 activates (opacity 0.4→1, 12px rise) |
| 0.25–0.50 | 2 · Wave-down | wave arc draws customer→vendor (SVG line-draw 600ms), ring flash, route redraw (line-gradient sweep), ETA chip counts 5→4 min | caption 2 |
| 0.50–0.75 | 3 · The line | queue dot-rail populates (5 dots, 70ms stagger), discount chips 15/10/5% flip to "claimed" state sequentially | caption 3 |
| 0.75–1.00 | 4 · Paid & square | receipt card rises (sheet motion, 300ms): rows itemize base → −15% → +round-up tip → split bar fills | caption 4; on exit, panel unpins and scrolls away normally |

- Scrolling back up reverses beat *activation* (captions dim) but completed map beats simply rewind to their start state at beat boundaries — no reverse-scrubbing of route draws.
- **Mobile & reduced-motion fallback:** the sticky-scroll scene is replaced by a swipeable 4-card carousel (static renders of each beat + same captions). Decision point: <768px or `prefers-reduced-motion` or no-WebGL.

## 5. Scroll reveals (all other sections)

- Trigger: IntersectionObserver at 20% visibility, once per element group (no re-animation on scroll-up — re-triggering reads as glitchy).
- Pattern: container opacity 0→1 + 16px rise over `motion.reveal`; children stagger 70ms (cap 5 groups — e.g., the 8 feature cards animate as 2 rows, not 8 items).
- Metrics strip: counters count-up 900ms with tabular numerals, ease-out, starting when 50% visible; fires once. Values are real (API) — skeleton width reserves space to avoid CLS.
- Section eyebrows: no separate animation (they ride the container reveal).

## 6. Micro-interactions

| Element | Interaction | Spec |
|---|---|---|
| Buttons | hover / press | product spec verbatim (`docs/06 §2.6a`): −8% lightness on press, 100ms; hover raises lightness +4%; loading = spinner swap, width locked |
| Feature cards | hover (pointer only) | border-color → `accentSecondary` 200ms + card `translateY(-2px)`; **micro-demo inside plays on hover/focus, else shows its first frame** (demos also autoplay when card is ≥80% visible on touch devices, one at a time top-to-bottom) |
| Benefit tabs | switch | active pill slides (layout-projection, 200ms); panels cross-fade 200ms + 8px rise; height animates via measured container |
| FAQ accordion | expand | chevron rotates 180° 200ms; panel height auto-animates 250ms decelerate; one open at a time |
| Nav | scrolled state | background/border fade in 200ms at scrollY > 24px; mobile hide/reveal 250ms transform |
| Pre-reg wizard | step change | slide 24px + fade 250ms (forward: left, back: right); progress dots fill 200ms |
| Confirmation | success | check-circle draw-on 400ms + "#N in line" counter tick-up 600ms; one 1.2s confetti-lite burst (≤24 particles, brand palette, `transform`-only, skipped under reduced motion) |
| Floating hero cards | lifecycle | 24px rise + fade 500ms in, 4s dwell, 300ms fade-down out; max 2 concurrent |
| Logo row | hover | grayscale→color + opacity 0.7→1, 200ms |
| Sticky mobile CTA | appear | slides up 250ms once hero exits viewport; respects safe-area |
| Testimonial carousel | auto-advance | 8s interval, 400ms cross-fade + 12px slide; pauses on hover/focus/touch; dots clickable |

## 7. Reduced-motion contract (binding, page-wide)

Under `prefers-reduced-motion: reduce` (single global switch — Framer `MotionConfig reducedMotion="user"` + CSS media query + simulation director flag):

- All reveals/staggers → opacity-only, ≤100ms (`docs/06 §2.6c` rule).
- Hero: static poster, no pin pulse, no idle drift, no floating cards; optional "Play preview ▶" button starts the full scene on explicit request.
- Showcase: carousel fallback (static renders).
- Counters render final values instantly. Confetti skipped. Carousel auto-advance off (manual only). Parallax off.
- Nothing loses function: every demo's information exists as text/static image.

## 8. Performance rules

- One shared IntersectionObserver per threshold config (not per element). All rAF work (simulation director, count-ups) suspends when `document.hidden` or the hero/section is off-screen.
- Mapbox canvas capped at `devicePixelRatio ≤ 2`. Simulation actors are Mapbox layers/GeoJSON sources updated per tick — not 20 absolutely-positioned DOM markers (DOM markers only for the ≤7 interactive pins + max-2 floating cards).
- Animation JS (Framer via LazyMotion + director) budget: ≤ 18KB gz on the marketing route.
- CI check: Lighthouse "non-composited animations" audit must report zero.
