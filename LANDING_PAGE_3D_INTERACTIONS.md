# StreetServe — Landing Page 3D & Depth Interactions

> How the page achieves its 3D, depth, and lighting effects: the Mapbox-as-3D-engine decision, camera design, depth system, glassmorphism rules, and input-driven parallax. Timings live in [LANDING_PAGE_ANIMATION_SPECIFICATION.md](LANDING_PAGE_ANIMATION_SPECIFICATION.md); hero scene content in [LANDING_PAGE_HERO_SPECIFICATION.md](LANDING_PAGE_HERO_SPECIFICATION.md).

---

## 1. Engine decision: Mapbox GL **is** the 3D layer

**Decision: no three.js / react-three-fiber.** All true 3D on the page comes from Mapbox GL JS 3.x (already a project dependency), which natively provides everything the creative direction needs:

| Creative requirement | Mapbox capability |
|---|---|
| Tilted 3D city view | `pitch` (55°) + `bearing`, terrain-capable camera |
| 3D buildings with depth | `fill-extrusion` layers (height-mapped, ambient-occlusion shading in v3 "Standard"-style lighting) |
| Modern lighting / dusk atmosphere | v3 lights API (`ambient` + `directional`), `fog` with horizon glow |
| Smooth cinematic camera moves | `easeTo` / `flyTo` with custom easing + free-camera API for the idle drift |
| Glowing pins, route animations | symbol/line layers + per-frame paint-property animation |

**Why this beats a bespoke three.js scene:** (1) the hero doubles as a *product preview* — same map style, pins, and status rings the user meets in-app; (2) −0 new heavy deps (~600KB saved vs. adding three.js alongside Mapbox); (3) one WebGL context instead of two competing for the GPU; (4) the geo-data pipeline (real streets, real routes) makes the simulation credible for free. A custom 3D art scene would be more novel and strictly worse for every goal in [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §2.

Everything else that reads as "3D" on the page is **layered 2.5D depth** (transforms, glass, shadow/glow, parallax) — cheap, robust, and honest to render on any device.

## 2. Camera design (the "cinematography")

| Moment | Camera behavior |
|---|---|
| Hero initial | zoom 15.2 · pitch 55° · bearing −17°, composition offset right (padding-left 480 desktop) |
| Hero idle drift | free-camera micro-orbit: bearing ±8° over ~40s cycle, zoom breathing ±0.05 — sinusoidal, phase-offset so it never looks mechanical |
| Hero idle 20s "tour" | one `easeTo` to a second vantage (zoom 14.6, bearing +22°, 6s, decelerate) and back; canceled instantly by user input |
| Wave-down vignette | camera nudges (300m pan, 1200ms) to keep the arc in frame — only if user hasn't taken control |
| Showcase beats | each beat owns a keyframed `easeTo` (800–1500ms): beat 1 follows the route start; beat 2 pulls back to frame customer+vendor; beat 3 tightens on the queue; beat 4 holds while the receipt card takes focus |
| Final CTA map | static camera, zoom 11, pitch 35°, centered on visitor's IP-approx city; very slow bearing drift only |
| Mobile (all) | pitch 0–30° max, no idle drift (battery), no tour; camera cuts between showcase beats use 600ms eases |

**Camera rules:** user input always wins instantly (any gesture cancels scripted moves; scripts resume after 8s idle). Max one camera move at a time. All moves use the decelerate easing family. Pitch never exceeds 60° (label legibility + tile cost).

## 3. Depth system (2.5D layer model)

Five named depth planes, back to front — every hero/showcase element belongs to exactly one:

| Plane | z | Contents | Depth cues |
|---|---|---|---|
| P0 basemap | canvas | streets, extrusions, fog | Mapbox lighting, atmospheric fade |
| P1 ground fx | canvas | heat glows, route lines, ripples | additive-style transparency |
| P2 pins | DOM markers | vendor pins, customer dots, queue rails | 3px ring, soft cast shadow (static, pre-blurred PNG/CSS — never animated blur) |
| P3 floating UI | DOM | activity cards, pin profile card, ETA chips | `--surface-glass` blur, 1px light border, parallax 14px |
| P4 page content | DOM | headline column, CTAs, captions, nav | scrim backing, parallax 6px (opposite sign to P3) |

Parallax (desktop pointer only): P3 and P4 translate opposite directions from cursor delta (springless lerp at 0.08 factor, `transform: translate3d`, ±14px / ±6px max). This differential is what sells depth — not any real 3D on the cards. Off for touch, reduced-motion, and while the pre-reg wizard is open.

## 4. Lighting & glow language

- **Map lighting:** dusk preset — low-angle warm directional light (buildings catch an `#FF9E45`-tinted edge on their west faces), cool ambient, fog horizon in desaturated blue. Light theme = dawn preset (higher ambient, cooler direction). Defined once in the two marketing map styles.
- **Pin glow:** status-colored outer glow (2 stacked CSS shadows, static per status; Driving pulses via a scaling pseudo-element ring — `transform`-only). Glow radii: rest 12px / active 20px.
- **CTA glow (final section only):** primary button carries a soft `accentPrimary` ambient glow (24px, 20% alpha) — the only glowing button on the page; hero primary stays clean (legibility over scrim first).
- **Rule:** glow = "live/actionable," never decoration on static content. If it glows, it's either live on the map or the page's commitment moment.

## 5. Glassmorphism rules

- Token: `--surface-glass` (`rgba(23,24,28,0.72)` + `backdrop-filter: blur(16px)` + 1px `rgba(255,255,255,0.08)` border + 16px radius) / light-theme `rgba(255,255,255,0.78)` + `rgba(20,21,26,0.06)` border.
- **Where allowed:** scrolled nav bar, floating activity cards, pin profile card, "Simulated preview" chip, sticky mobile CTA bar. **Nowhere else** — glass over flat page surfaces is noise; glass earns its blur only over the moving map.
- Text on glass must hold 4.5:1 over the worst-case map region (verified against the darkest and lightest tiles of both map styles).
- Fallback: `@supports not (backdrop-filter: blur(16px))` → solid `--surface-raised` at 96% opacity. `backdrop-filter` is never animated (compositing cost) — glass elements animate transform/opacity only.

## 6. Interactive hotspots (hero + showcase)

- The 7 hero vendor pins are true interactive hotspots (hover label, click → profile card → CTA) — spec in hero doc §5.
- Showcase map is **not** interactive while pinned (scroll owns the input; a gesture-vs-scroll fight inside a sticky scene is a UX trap). A "Explore this map ↗" tertiary link under the caption rail hands off to the hero/`/map` for free exploration.
- Final-CTA map: pan/zoom enabled, no hotspots (nothing should compete with the form).

## 7. Performance & fallback ladder

| Tier | Detection | Experience |
|---|---|---|
| T1 full | desktop-class GPU, no flags | full 3D scene, extrusions, fog, drift, parallax |
| T2 lite | mobile / `deviceMemory ≤ 4` / mid GPU | pitch ≤30°, no extrusions (flat dark style), fewer actors (4 pins), no idle drift, no parallax |
| T3 static | no WebGL / `prefers-reduced-data` / map load error | designed poster + CSS pin pulses; all content and CTAs intact |
| T0 reduced-motion | `prefers-reduced-motion` (overrides all) | T3 visuals + opt-in "Play preview ▶" |

- One Mapbox map instance per *visible* section — hero map is destroyed/parked when the showcase map pins (they never render simultaneously; the final-CTA map is a third lightweight instance at flat pitch, or reuses the parked instance — implementation choice, budgeted either way).
- GPU budget: sustained < 30% mid-tier mobile GPU during idle drift; canvas `devicePixelRatio ≤ 2`; simulation ticks pause off-screen and on `document.hidden`.
