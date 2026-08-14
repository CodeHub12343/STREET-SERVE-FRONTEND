# Map / Discover — Redesign Specification

**Surface:** C-10 Map Home · **Platform:** Mobile-first PWA (Next.js) · **Themes:** Light + Dark
**Status:** Design spec, pre-implementation
**Implements against:** [MapHome.tsx](src/features/livemap/components/MapHome.tsx), [MapShell.tsx](src/components/layout/MapShell.tsx), [Map.tsx](src/components/map/Map.tsx), [MapPin.tsx](src/components/map/MapPin.tsx), [mapbox.ts](src/lib/map/mapbox.ts)

---

## 1. Current UX Analysis

I read the shipped implementation rather than only the screenshot. Seven weaknesses, ordered by cost:

**1.1 — The header is a slab, not a layer.**
[MapShell.tsx:54-57](src/components/layout/MapShell.tsx#L54-L57) paints `linear-gradient(surfaceBase 55%, transparent)`. That is an *opaque* wash across the top 55% of its own box, and with a search row + category tabs + optional banner stacked inside it, it occupies roughly the top 28–34% of the viewport. The map's most valuable region — the area just above your thumb's resting zone, where nearby results actually live — is buried under solid chrome. The brief says "keep the map as the hero"; today the map is matting.

**1.2 — There is no browse layer at all.**
The only path from "I see pins" to "I chose a business" is: aim at a 48px target, tap, get a modal-ish sheet. Discovery of *many* businesses requires leaving the map entirely for `/map/list` via an icon button ([MapHome.tsx:72-77](src/features/livemap/components/MapHome.tsx#L72-L77)). The screenshot's "124 businesses near you" is a fact the UI states but never lets you traverse. This is the single biggest gap: **the map answers "where" but never "which".**

**1.3 — Two competing primary actions, both bottom-center-ish.**
`ServeNearMeFab` docks at `bottom: 78px + safe-area` ([MapShell.tsx:69](src/components/layout/MapShell.tsx#L69)) and `PitchToggle` docks at the *identical* offset on the right ([Map.tsx:481](src/components/map/Map.tsx#L481)). A 2D/3D toggle — a tertiary, curiosity-grade control — is rendered at the same visual altitude as the app's hero CTA. Meanwhile "Serve Near Me" is doing double duty as both a *locate-me* button and an *intent* button, which is why it reads as ambiguous.

**1.4 — Pin styling is dark-mode-native, ported to light.**
[MapPin.tsx:74-77](src/components/map/MapPin.tsx#L74-L77) uses `0 0 12px var(--ring-glow), 0 2px 8px rgba(0,0,0,0.35)`. A 35%-black ambient shadow plus a colored glow reads as *premium depth* on `#0E0F12`. On a `#F6F5F2` basemap the glow disappears into the light land color and the black shadow reads as smudge. Pins need per-theme elevation, not one shadow.

**1.5 — Status is encoded but not ranked.**
Driving / Parked / Away are three peer treatments. But a customer scanning the map cares about exactly one axis first: *can I get served, now?* Three equal-weight ring colors produce a confetti field with no gradient of attention. Away pins are desaturated ([MapPin.tsx:95](src/components/map/MapPin.tsx#L95)) — correct instinct, insufficient magnitude.

**1.6 — Clustering is screen-space only, with no low-zoom story.**
`groupByScreenDistance` at `CLUSTER_RADIUS_PX = 56` is O(n²) ([Map.tsx:92-118](src/components/map/Map.tsx#L92-L118)) and only merges pins that *already* overlap. It's a collision fixer, not a density visualization. At city zoom with 124 businesses you get a wall of 48px avatars, then a wall of cluster bubbles — neither tells you where the activity *is*.

**1.7 — Category tabs are a filter pretending to be navigation.**
A horizontal chip row that silently mutates the pin set, with no persistent indication of what was excluded or how many results the filter cost you. Users filter, see less, and don't connect cause to effect.

---

## 2. Map Readability Problems (why Light Mode is washed out)

### 2.1 The root cause is the style choice, not the tiles

```ts
// src/lib/map/mapbox.ts:8-11
export const MAP_STYLES: Record<ThemeMode, string> = {
  dark:  'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
};
```

`light-v11` and `dark-v11` are **not** general-purpose basemaps. Mapbox ships them explicitly as *muted backdrops for data overlays* — they are engineered to have low internal contrast so that a choropleth or heatmap layered on top wins the eye. Using one as a primary wayfinding map means fighting the style's entire design intent.

The file's own comment already flags this as pilot scaffolding ("swap these for the bespoke desaturated StreetServe styles when they're produced"). This spec produces them — and inverts the "desaturated" instruction for light mode, which is precisely the mistake to avoid.

### 2.2 The four specific failures

**Insufficient land↔road separation.** `light-v11` renders land at ~`#F8F8F8` and residential road fill at ~`#FFFFFF`. That is a **1.07:1** contrast ratio. Roads are technically drawn and perceptually absent. Street grids — the thing that makes a map legible as a *place* — vanish.

**Label contrast below usable threshold.** `light-v11` road labels sit near `#8C8C8C` on `#F8F8F8` ≈ **2.6:1**, under WCAG's 4.5:1 for body text and under even the 3:1 large-text floor. Outdoors on a phone at 400 nits in daylight, effective contrast drops further. Users report this as "faded" — it is literally sub-threshold.

**No road hierarchy.** In `light-v11`, motorway / primary / residential differ mainly by *width*, barely by *color*. Width alone collapses at low zoom when all strokes converge toward 1px. You lose the arterial skeleton that lets someone orient in two seconds.

**Halo starvation.** Labels use thin, low-opacity halos. Where a label crosses a road casing or a park polygon, the glyph edges dissolve. Combined with the pin field, text becomes unreadable exactly where pins are densest — the highest-value region.

### 2.3 The compounding factor

Even with a perfect basemap, three app-side choices erode contrast further:
- The `surfaceBase 55%` header wash desaturates the top third before the map is even seen.
- 48px avatar pins are full-color photographic content sitting on pale land — they *reduce* apparent map contrast by dominating local adaptation.
- No scrim under floating controls means white-on-white glass buttons over white residential roads.

**Fixing the style alone gets ~70% of the win. The remaining 30% is layout and elevation, covered in §7–§8.**

---

## 3. Recommended Mapbox Style Improvements

### 3.1 Base style recommendation

**Fork `mapbox://styles/mapbox/standard`, not `light-v11`.**

Rationale: Standard (Mapbox GL JS v3) gives you dynamic lighting presets (`dawn`/`day`/`dusk`/`night`), built-in 3D buildings with real materials, and — critically — a `light`/`dark` preset swap that does **not** require `setStyle()`. Today [Map.tsx:246](src/components/map/Map.tsx#L246) calls `setStyle()` on every theme change, which tears down and reinstalls every layer and forces the `style.load` handler to re-run `installCinematicLayers`. With Standard you swap a config property, and the transition is a smooth interpolation rather than a flash.

```ts
// Recommended replacement for src/lib/map/mapbox.ts
export const MAP_STYLE = 'mapbox://styles/streetserve/streetserve-v1'; // fork of standard

export const LIGHT_PRESET: Record<ThemeMode, 'day' | 'night'> = {
  light: 'day',
  dark:  'night',
};

// Theme change becomes a config set, not a style reload:
map.setConfigProperty('basemap', 'lightPreset', LIGHT_PRESET[mode]);
map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
map.setConfigProperty('basemap', 'showTransitLabels', false);
map.setConfigProperty('basemap', 'showPlaceLabels', true);
map.setConfigProperty('basemap', 'showRoadLabels', true);
```

**Fallback if Standard's customization ceiling proves too low:** fork `mapbox://styles/mapbox/streets-v12` (a real wayfinding style with proper hierarchy) and apply the palette below. Do **not** fork `light-v11` under any circumstance.

### 3.2 Light Mode palette ("Paper")

The strategy is a **warm, slightly-off-white land** with **pure-white roads**. Warm land is the trick: it separates from white roads, makes the green brand pop, and avoids the clinical blue-grey that makes every startup map look identical.

| Element | Color | Notes |
|---|---|---|
| Land / background | `#F4F2ED` | Warm paper. Never `#FFFFFF` — you need white as a road color. |
| Parks / green space | `#E2EDDD` | Desaturated, cool-shifted so it never competes with brand green. |
| Water | `#C3D9E8` | Water label `#40728F` |
| Buildings (fill) | `#EAE7E0` | Outline `#DCD8CF` — visible massing at z16+ |
| Building extrusion top | `#EFECE5` | Side `#E3DFD7` for cinematic tier |
| Motorway fill | `#FFD79A` | Casing `#E8B25C` — the only saturated road color |
| Trunk / Primary fill | `#FFFFFF` | Casing `#D6D1C6` |
| Secondary / Tertiary | `#FFFFFF` | Casing `#DFDAD0` |
| Residential | `#FCFBF8` | Casing `#E7E2D8` |
| Path / pedestrian | `#EDE9E1` (dashed) | Low priority, fades below z15 |
| Rail | `#D3CEC4` | |
| Admin boundary | `#CFC9BE` | Dashed, 0.6 opacity |

**Contrast delivered:** residential `#FCFBF8` on land `#F4F2ED` = **1.09:1** by fill alone — still low, *which is why the casing does the work*. Casing `#E7E2D8` against land `#F4F2ED` reads clearly at 1px, and against the road fill at 1.5px it defines the edge. **Roads are legible because of their outline, not their fill.** This is how Apple Maps achieves clarity on a near-white land color, and it is the single most important technical note in this section.

### 3.3 Typography & labels — preventing "faded"

| Label class | Color | Halo | Size ramp | Weight |
|---|---|---|---|---|
| Country / Region | `#6B675E` | `#F4F2ED` @ 1.2px | 12→16 | 600, +0.08em tracking, uppercase |
| City | `#232220` | `#FFFFFF` @ 1.8px | 13→22 | 700 |
| **District / Neighborhood** | `#3A3833` | `#FFFFFF` @ 1.6px | 12→17 | **650, +0.06em tracking, uppercase** |
| Street label | `#54514A` | `#FFFFFF` @ 1.4px | 10→13 | 600 |
| Water label | `#40728F` | `#DDEBF5` @ 1.2px | 11→15 | 500 italic |
| POI label | `#5C594F` | `#FFFFFF` @ 1.3px | 10→12 | 500 |

Five rules that actually fix faded labels:

1. **Halo width ≥ 1.4px on every label that overlaps a road or polygon.** This is the number one cause of perceived fading. A dark glyph on light land is fine until it crosses a `#FFFFFF` road, at which point contrast is 4.5:1 → 8:1 → back, and the eye reads the *inconsistency* as blur. A solid white halo makes the local background constant everywhere.
2. **`text-halo-blur: 0`.** Blurred halos are the mushiness. Hard-edged halos read as crisp letterpress.
3. **Never drop street labels below `#5A5750` in light mode.** That is 5.9:1 on `#F4F2ED` — comfortably AA, and it is the floor.
4. **Minimum 10px, and bump the whole ramp +1px versus Mapbox defaults.** Mapbox tunes for desktop viewing distance; phones are held closer but rendered denser, and the net is that defaults read small.
5. **Uppercase + letter-spacing for districts only.** This is the "clearer district names" requirement. Uppercasing exactly one label class creates unmistakable hierarchy without adding a color or size step, and it reads as editorial rather than default.

### 3.4 Dark Mode palette ("Ink")

| Element | Color |
|---|---|
| Land | `#101216` |
| Parks | `#16211A` |
| Water | `#0A1721` (label `#6E93AB`) |
| Buildings | `#191C22`, outline `#232830` |
| Motorway | `#4A4335` fill, `#6B5F45` casing |
| Primary / Secondary | `#2C313A` fill, `#3B424E` casing |
| Residential | `#212630` fill, `#2B313B` casing |
| Street label | `#A8ADB8`, halo `#101216` @ 1.4px |
| District label | `#D6DAE2`, halo `#101216` @ 1.6px |
| City label | `#F0F2F6`, halo `#0A0C0F` @ 1.8px |

Dark mode inverts the technique: land is darker than roads, so **road fill carries the hierarchy and casing is nearly vestigial.** Do not mirror the light-mode casing weights.

### 3.5 POI visibility

Selective, not global. Three tiers:

- **Always on:** transit stations, hospitals, major landmarks, parks. These are wayfinding anchors.
- **Zoom-gated (z15+), 60% opacity, icon-only until z16.5:** food, retail, fuel. Context without competition.
- **Suppressed entirely:** anything in a StreetServe business category. **If a category is on the map as a StreetServe pin, its generic Mapbox POIs must be hidden** — otherwise every coffee-shop pin sits next to a Mapbox coffee icon and the map reads as duplicated and noisy. This is a `filter` expression on the POI layer against the active category set, and it is not optional.

```js
// poi-label filter — suppress categories StreetServe renders as pins
['all',
  ['!', ['in', ['get', 'maki'], ['literal', ['restaurant','cafe','fast-food','grocery','bakery','bar']]]],
  ['>=', ['zoom'], 15]
]
```

### 3.6 Zoom behavior

| Zoom | State |
|---|---|
| ≤ 10 | Density heat only. No individual pins. City + region labels. |
| 11–12.9 | Cluster bubbles with counts. District labels prominent. |
| 13–14.9 | Individual pins, avatar-less (dot + status ring). Street labels appear. |
| 15–16.9 | Full avatar pins. ETA chips appear. POIs fade in at 60%. |
| ≥ 17 | Building extrusions (cinematic tier). Pin labels show business name. |

`DEFAULT_ZOOM = 12.5` ([mapbox.ts:19](src/lib/map/mapbox.ts#L19)) currently lands users in the cluster band with no individual pins — correct for orientation, but it means **first paint shows zero avatars.** Recommend `13.4` as the default: individual pins visible immediately, which is the "instantly see businesses" success criterion.

---

## 4. Five Design Concepts

### Concept A — "Peek Rail"
A persistent 96px peek sheet at the bottom showing a horizontally-scrolling carousel of nearby businesses. Map controls stack in a vertical rail on the right edge. Search collapses to a pill on scroll. Dragging the sheet up expands to a full list; dragging pans the map to follow the centered card.

*Strength:* browse and locate are the same gesture. *Weakness:* permanently consumes ~110px of map.

### Concept B — "Radial Serve"
No bottom sheet. Tapping "Serve Near Me" triggers a radar sweep from your location; businesses resolve in rings by ETA (under 5 / 5–15 / 15+ min). Results orbit your location dot as a compass ring you rotate with a thumb drag to cycle through.

*Strength:* genuinely unique, perfectly matches "serve near me" intent, one-handed by construction. *Weakness:* poor for "show me all coffee in Lekki" — it's an *urgency* interface, not a *browse* interface. Also a discoverability risk: nothing teaches the rotate gesture.

### Concept C — "Split Canvas"
Map occupies the top 60%, a fixed scrollable list occupies the bottom 40%. Selecting a list row highlights its pin; panning the map re-sorts the list. Classic Airbnb / Zillow split.

*Strength:* zero ambiguity, highest browse throughput, trivially accessible. *Weakness:* explicitly in the brief's "avoid" list — Google/Uber clone territory. The map stops being the hero.

### Concept D — "Ambient Layers"
The map is fully edge-to-edge with no persistent chrome at all. All UI lives in a single translucent "lens" that follows your thumb: a floating puck bottom-right that expands radially into search / filter / list / locate on long-press. Business info appears as inline map annotations, never in a sheet.

*Strength:* maximum map, most distinctive, best one-handed reach. *Weakness:* every affordance is hidden behind a gesture. High learning cost, terrible for screen readers, and an accessibility rewrite rather than an accessibility pass.

### Concept E — "Layered Depth" ★
Three explicit z-planes with different behaviors:
- **Plane 1 (map):** full-bleed, edge-to-edge, always the background, never covered by opaque chrome.
- **Plane 2 (glass):** a floating search capsule that shrinks on pan, a category rail, and a right-edge vertical control stack. All true translucent glass with scrims — the map is legible *through* them.
- **Plane 3 (sheet):** a 3-detent bottom sheet — `peek` (72px handle + count + top result), `half` (44%, scrollable list), `full` (88%, list + filters). It is the browse surface *and* the business-detail surface, with a shared-element transition between them.

Serve Near Me is a distinct, high-contrast pill docked above the sheet handle — visually separated from map controls so its role as *intent*, not *navigation*, is unambiguous.

*Strength:* map stays hero; browse is first-class; every affordance is visible; sheet detents are a known pattern executed at higher craft. *Weakness:* the least "novel" of the five — it wins on execution, not on invention.

---

## 5. Comparison Matrix

Weighted against the brief's stated success criteria. Score 1–5.

| Criterion | Weight | A Peek Rail | B Radial | C Split | D Ambient | **E Layered** |
|---|---|---|---|---|---|---|
| Map remains hero | ×3 | 3 | 5 | 1 | 5 | **4** |
| Business discoverability | ×3 | 4 | 2 | 5 | 2 | **5** |
| One-handed usability | ×2 | 4 | 5 | 2 | 5 | **4** |
| Learnability / zero-instruction | ×3 | 4 | 2 | 5 | 1 | **5** |
| Distinctiveness (not a clone) | ×2 | 3 | 5 | 1 | 5 | **4** |
| Accessibility ceiling | ×2 | 4 | 2 | 5 | 1 | **5** |
| Scales to future features | ×2 | 3 | 1 | 4 | 2 | **5** |
| Implementation risk (5 = low) | ×1 | 4 | 1 | 5 | 1 | **4** |
| **Weighted total** | **/90** | **62** | **50** | **62** | **48** | **▲ 80** |

**Read of the matrix:** B and D score highest on distinctiveness and lose everywhere it matters. C is the inverse — safe, effective, forgettable, and explicitly ruled out. A is a credible runner-up that fails only on the permanent map tax. E is the only concept without a structural weakness.

---

## 6. Recommended Solution — Concept E, "Layered Depth"

**Chosen.** The reasoning, stated plainly:

Concepts B and D are more *inventive*, and both would fail in production. The brief's own innovation constraint — "prioritize usability over novelty" — is the tiebreaker, and it is the correct one. A radial ETA compass is a beautiful demo and a support ticket generator; a gesture-only lens is an accessibility regression that no amount of polish redeems.

The real insight is that **premium is not a layout — it is the quality of the transitions between states.** Apple Maps and Linear both use utterly conventional structures; what makes them feel expensive is that every state change is continuous, interruptible, and physically plausible. Concept E takes the structure users already understand and spends the entire innovation budget on execution: glass that actually refracts the map, a sheet whose detents are rubber-banded and velocity-aware, markers that scale from a dot to an avatar to a card without a single hard cut, and a basemap that is genuinely beautiful rather than merely present.

Concept E also absorbs the best idea from each rejected concept:
- From **A**: the peek detent showing the top nearby result — browse begins before any gesture.
- From **B**: ETA-first ranking and the pulse-outward "Serve Near Me" activation.
- From **D**: edge-to-edge map with zero opaque chrome, and thumb-zone control placement.
- From **C**: a real, scrollable, screen-reader-navigable list — just reached by a drag instead of owning 40% permanently.

**Implementation note:** this is an evolution of the existing `MapShell`, not a rewrite. `MapShell` already has the correct slots (`header` / `floatingAction` / `overlay`). The changes are: make `header` translucent, promote `overlay` to a first-class detented sheet, and move the control stack out of `Map.tsx` into the shell.

---

## 7. Complete Map Page Layout

```
┌─────────────────────────────────────────┐
│ ░░░ status bar — map visible through ░░░│  ← no opaque chrome, ever
│                                         │
│  ╭───────────────────────────╮  ╭────╮  │  Plane 2 · glass
│  │ ⌕  Search businesses      │  │ ⚙︎ │  │  56px capsule + filter
│  ╰───────────────────────────╯  ╰────╯  │
│  ╭────╮╭──────╮╭──────╮╭─────╮╭──────╮  │  category rail, h-scroll
│  │ All││ Food ││Coffee││ Svc ││ Shop │  │  40px, edge-bleeds right
│  ╰────╯╰──────╯╰──────╯╰─────╯╰──────╯  │
│                                         │
│         ╭──────────────────╮            │
│         │ ⟳ Search this area│           │  contextual, on pan only
│         ╰──────────────────╯            │
│                                         │
│                                    ╭─╮  │  Plane 2 · right rail
│         ●  ← you, pulsing          │◈│  │  compass (rotated only)
│                                    ├─┤  │
│      ◉ Cafe One                    │◱│  │  layers
│        0.3 km                      ├─┤  │
│                                    │2D│ │  2D/3D (cinematic only)
│              ◉ FixWell             ├─┤  │
│                0.6 km              │◎│  │  recenter
│                                    ╰─╯  │
│                                         │
│         ╭───────────────────╮           │
│         │ ◎  Serve Near Me  │           │  intent CTA, brand green
│         ╰───────────────────╯           │
│  ═══════════════════════════════════    │  Plane 3 · sheet handle
│  ╭─────────────────────────────────╮    │
│  │ ▬▬▬▬                            │    │  grabber
│  │ 124 nearby        · 18 serving  │    │  peek content
│  │ ╭──╮ Cafe One                   │    │  top result preview
│  │ ╰──╯ Coffee · 0.3 km · ★4.8     │    │
│  ╰─────────────────────────────────╯    │
├─────────────────────────────────────────┤
│   Map   Messages  ⊞  Orders   Alerts    │  existing tab bar
└─────────────────────────────────────────┘
```

### 7.1 Vertical budget (390×844 reference)

| Zone | Height | Notes |
|---|---|---|
| Safe area top | 47px | map visible through |
| Search capsule | 56px | `top: safe + 12` |
| Gap | 10px | |
| Category rail | 40px | |
| **Free map** | **~430px** | **51% of viewport, fully unobstructed** |
| Serve Near Me | 52px | |
| Sheet peek | 128px | |
| Tab bar | 78px + safe | existing |

Compare to today: the opaque header wash plus FAB leaves roughly 38% genuinely clear. **Concept E returns ~13 points of viewport to the map while simultaneously adding a browse surface** — because the header stops being opaque and the sheet earns its space by doing real work.

### 7.2 Sheet detents

| Detent | Height | Content | Map behavior |
|---|---|---|---|
| `peek` | 128px | Count, serving count, single top result | Full pan/zoom |
| `half` | 44% (372px) | Scrollable result list, sort control | Pan/zoom; camera padded `bottom: 372` |
| `full` | 88% | List + filter panel + saved | Map dims to 40%, gestures disabled |

Sheet is **non-modal at `peek` and `half`** — the map stays fully interactive underneath. This is the critical difference from a standard bottom sheet and the reason it doesn't violate "map stays hero."

`MapHome` already implements sheet-aware camera padding ([MapHome.tsx:38-42](src/features/livemap/components/MapHome.tsx#L38-L42)) — that mechanism generalizes directly to detents. Feed `focus.padding.bottom` from the sheet's live translation value, not just its final height, so the camera tracks the drag in real time.

### 7.3 Header behavior on pan

The search capsule and category rail translate up and fade as the map pans, collapsing to a 40px pill in the top-left after 200px of cumulative pan. Re-expands on pan-stop or tap. This is the "clean without covering the map" requirement resolved dynamically instead of by compromise.

---

## 8. Floating UI System

### 8.1 The glass recipe

Every floating surface uses one material. Do not create variants.

```css
.glass {
  background: color-mix(in srgb, var(--surface-raised) 72%, transparent);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border: 0.5px solid color-mix(in srgb, var(--line-2) 60%, transparent);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.04),
    0 8px 24px -8px rgb(0 0 0 / 0.12);
  border-radius: 20px;
}

@media (prefers-reduced-transparency: reduce), (--no-backdrop-filter) {
  .glass { background: var(--surface-raised); backdrop-filter: none; }
}
```

Three notes that make this work rather than look cheap:

- **`saturate(1.6)` is mandatory.** Blur alone averages the map to grey mud. Boosting saturation preserves the sense that *there is a map back there* — this is the entire difference between Apple's material and a generic frosted div.
- **`0.5px` border, not 1px.** At 3x DPI a 0.5px hairline is a real, crisp 1.5 device pixels. 1px reads as chunky.
- **Two-layer shadow.** A tight 1px contact shadow plus a wide soft one. A single blurred shadow is the most common tell of amateur elevation.

**Dark mode:** raise to 78% opacity, drop the shadow to `0 8px 24px -8px rgb(0 0 0 / 0.5)`, and add `inset 0 1px 0 rgb(255 255 255 / 0.06)` as a top highlight — dark glass needs a lit edge to read as a surface rather than a hole.

### 8.2 Component inventory

| Component | Size | Position | Behavior |
|---|---|---|---|
| Search capsule | 56px h, full-width − 32 | `top: safe+12, left: 16` | Collapses to 40px pill on pan |
| Filter button | 48×48 | Trailing inside capsule row | Badge dot when filters active |
| Voice input | 24px icon | Inside capsule, trailing | Inline, not a separate button |
| Category chip | 40px h, auto w | Rail, 8px gap | Selected = brand fill, white text |
| Search-this-area | 40px h pill | Centered, `top: 156` | Appears only after >300px pan |
| **Control rail** | 44px w | `right: 12`, vertically centered | Single glass column, dividers between |
| ↳ Compass | 44×44 | Rail item 1 | **Hidden unless bearing ≠ 0** |
| ↳ Layers | 44×44 | Rail item 2 | Opens a small popover |
| ↳ 2D/3D | 44×44 | Rail item 3 | Cinematic tier only |
| ↳ Recenter | 44×44 | Rail item 4 (bottom) | Filled brand when off-center |
| Serve Near Me | 52px h, 200px w | Centered, above sheet | Solid brand, not glass |
| Sheet | 3 detents | Bottom | Glass at peek, solid at full |

**Consolidating the four map controls into one vertical glass rail** is the highest-leverage change in this section. Four separate floating circles is visual noise; one grouped column reads as a single instrument. It also fixes the collision where `PitchToggle` currently shares an offset with the FAB ([Map.tsx:481](src/components/map/Map.tsx#L481) vs [MapShell.tsx:69](src/components/layout/MapShell.tsx#L69)).

**Serve Near Me must not be glass.** It is the one element permitted to be fully opaque brand green. Making the primary CTA translucent is how apps end up with no visual hierarchy at all.

### 8.3 The scrim rule

Every glass surface gets a 1px-tall gradient scrim beneath it (`transparent → rgb(0 0 0 / 0.06)`, 24px tall, blur 8px). Without it, white glass over white residential roads has literally zero separation. This is the detail that survives contact with a real, high-contrast basemap.

---

## 9. Business Marker Design

### 9.1 Anatomy

```
        ╭─────────╮
       ╱  ┌─────┐  ╲     ← status ring, 3px, brand-or-status color
      │   │ ◉◉◉ │   │    ← avatar, 40px, business logo
      │   │ ◉◉◉ │   │
       ╲  └─────┘  ╱
        ╰────┬────╯
             ▼           ← 6px tail (NEW — anchors pin to a point)
         ╭───────╮
         │ 0.3 km│       ← distance chip, tabular numerals
         ╰───────╯
```

Current `MapPin` ([MapPin.tsx:63-96](src/components/map/MapPin.tsx#L63-L96)) is a floating circle with no tail. **Add the tail.** A circle with no anchor is ambiguous about *which point* it marks — it appears to hover near a location rather than mark one. The tail is a 6px triangle in the ring color, and it is the difference between "sticker" and "pin."

### 9.2 Zoom-responsive levels of detail

| Zoom | Rendering |
|---|---|
| ≤ 12.9 | Cluster bubble only |
| 13–14.4 | **Dot pin**: 16px status-colored circle, 2px white stroke, no avatar, no chip |
| 14.5–15.9 | **Compact**: 36px avatar + ring + tail, no chip |
| ≥ 16 | **Full**: 48px avatar + ring + tail + distance/ETA chip |
| Selected | **Expanded**: 64px, chip becomes name + ETA, elevated shadow |

This is missing today — pins render identically at every zoom, which is why z12.5 city view is a wall of avatars. LOD is the primary fix for marker-field noise, and it is more effective than any clustering tweak.

### 9.3 Status hierarchy (revised)

Current implementation treats three statuses as peers. Rank them:

| Status | Ring | Avatar | Motion | Priority |
|---|---|---|---|---|
| **Driving (live)** | `#17B26A` 3px | Full color | Pulse ring, 2.4s | **Highest** — renders above all |
| **Parked (open)** | `#1E6FFF` 3px | Full color | Static | High |
| **Away (closed)** | `#9B8AFA` 2px | `saturate(0.25) opacity(0.55)` | None | **Lowest** — renders below, 0.8 scale |

Two changes from current:
- Away desaturation goes from `saturate(0.5) opacity(0.75)` → `saturate(0.25) opacity(0.55)` **and scales to 0.8**. Size is a stronger de-emphasis signal than color, and it is the one the current implementation isn't using.
- **Explicit z-ordering by status.** A live driving vendor must never be occluded by a closed one. Sort markers by status priority before adding to the map.

Status remains encoded by ring color + desaturation + scale + chip text — never color alone, preserving the a11y contract already documented in [MapPin.tsx:6-7](src/components/map/MapPin.tsx#L6-L7).

### 9.4 Category variation

Ring color carries status, so category carries via a **6px category dot** in the ring's lower-right notch (food/coffee/services/shopping/other). Subtle at a glance, decisive when comparing two adjacent pins. Do not tint the whole ring by category — that collides irreconcilably with status.

### 9.5 Per-theme elevation

Replace the single shadow at [MapPin.tsx:74-77](src/components/map/MapPin.tsx#L74-L77):

```css
/* light */
box-shadow:
  0 0 0 3px color-mix(in srgb, var(--surface-raised) 90%, transparent), /* white knockout */
  0 2px 6px rgb(0 0 0 / 0.14),
  0 6px 16px -4px rgb(0 0 0 / 0.10);

/* dark */
box-shadow:
  0 0 14px var(--ring-glow),
  0 2px 8px rgb(0 0 0 / 0.45);
```

The **white knockout ring** is what light mode needs and currently lacks. A 3px white halo between the status ring and the map guarantees the pin separates from *any* basemap color underneath — road, park, water, building. The colored glow is a dark-mode-only device; it does nothing on pale land and should not render there.

### 9.6 Clustering

Replace screen-space greedy grouping with a proper density model:

- **z ≤ 10:** heatmap layer, brand-green ramp at 35% max opacity. Shows *where the city is alive* without a single marker.
- **z 11–12.9:** cluster bubbles sized by count (36 / 44 / 56px for <10 / <50 / 50+), count in tabular numerals, ring segmented into an arc proportional to how many members are live.
- **z ≥ 13:** individual pins; keep the existing `groupByScreenDistance` at `CLUSTER_RADIUS_PX = 56` purely as a collision fallback for genuine overlaps.

The existing implementation ([Map.tsx:92-118](src/components/map/Map.tsx#L92-L118)) becomes tier 3 only. Tiers 1–2 should use Mapbox's native `cluster: true` on a GeoJSON source — it runs in the worker, is O(n log n), and removes the O(n²) hot path from `moveend`.

---

## 10. Interaction & Animation Details

### 10.1 Motion tokens

```ts
export const MOTION = {
  instant: 120,   // hover, press
  quick:   200,   // chip select, toggle
  base:    320,   // sheet detent, marker select
  camera:  700,   // eased map move  (matches Map.tsx focus)
  hero:    900,   // Serve Near Me    (matches Map.tsx flyTo)
};

export const EASE = {
  standard:   'cubic-bezier(0.2, 0, 0, 1)',      // matches EASE_DECELERATE
  emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)', // sheet, camera
  spring:     { stiffness: 380, damping: 32, mass: 0.9 },
};
```

The 700/900ms camera durations are already correct in [Map.tsx:254](src/components/map/Map.tsx#L254) and [Map.tsx:274](src/components/map/Map.tsx#L274) — keep them.

### 10.2 Interaction catalog

**Marker tap → selection**
1. `0ms` — haptic `impactLight`; marker scales 1 → 1.18 → 1.0 (spring, 320ms)
2. `0ms` — a 2px ring expands outward from the marker and fades (400ms)
3. `40ms` — all other markers drop to 0.55 opacity (200ms)
4. `60ms` — camera eases to marker with `padding.bottom = sheetHeight` (700ms, `EASE_DECELERATE`)
5. `120ms` — sheet rises to `half`; the marker's avatar performs a **shared-element transition** into the sheet header's avatar slot

Step 5 is the premium moment. The avatar is *the same element* moving from map to sheet, not a crossfade between two avatars. It costs a `FLIP` measurement and buys the single strongest impression in the whole flow.

**Sheet drag**
- Rubber-banded past `full` with 0.35 resistance
- Velocity-projected detent snapping (project 300ms ahead, snap to nearest)
- Map camera padding tracks the drag **continuously**, not on release — this is what makes the map feel physically coupled to the sheet
- Interruptible at any frame: a new drag during a snap animation takes over from current position and velocity

**Serve Near Me activation**
1. Button scales to 0.96, haptic `impactMedium`
2. Three concentric rings pulse outward from the location dot (staggered 180ms, 1400ms total)
3. Camera flies to user at z14 (900ms) — already implemented at [MapHome.tsx:98-108](src/features/livemap/components/MapHome.tsx#L98-L108)
4. Live pins re-sort by ETA and **stagger-fade in at 30ms intervals**, nearest first
5. Sheet rises to `peek` with the count: "18 serving near you"
6. Success haptic `notificationSuccess`

The nearest-first stagger is not decoration — it encodes proximity in *time*, giving a second read of the same information for free.

**Category switch**
- Chip fills with brand color (200ms), haptic `selectionChanged`
- Outgoing pins scale 1 → 0.8 and fade (160ms, staggered 15ms by distance from center)
- Incoming pins scale 0.8 → 1 and fade in (200ms, staggered 15ms)
- Result count animates on the sheet handle with a tabular-numeral roll

**Map pan / zoom**
- Header collapses after 200px cumulative pan (240ms)
- "Search this area" appears after 300px (spring, from `scale 0.9 / translateY 8`)
- Pins reproject continuously; existing glide loop ([Map.tsx:280-309](src/components/map/Map.tsx#L280-L309)) is already correct and should be preserved verbatim
- Pinch zoom crossing an LOD boundary crossfades the two marker renderings over 180px of zoom, never hard-cuts

**Loading**
- Skeleton pins: 48px circles at plausible positions, shimmering, **on the real map** — never a full-screen spinner. The map loads first and is immediately pannable; pins arrive as data does.

### 10.3 Haptics

| Event | Pattern |
|---|---|
| Marker tap | `impactLight` |
| Category select | `selectionChanged` |
| Sheet detent snap | `impactLight` |
| Serve Near Me press | `impactMedium` |
| Results arrived | `notificationSuccess` |
| Cluster expand | `impactLight` |
| No results | `notificationWarning` |

Web: `navigator.vibrate()` where available, feature-detected, respecting `prefers-reduced-motion`.

### 10.4 Reduced motion

`prefers-reduced-motion: reduce` collapses all of the above to opacity-only transitions ≤ 120ms. Specifically: pin pulse stops (already handled via GlobalStyle per [MapPin.tsx:5](src/components/map/MapPin.tsx#L5)), marker glide snaps (already handled at [Map.tsx:339-341](src/components/map/Map.tsx#L339-L341)), camera moves become instant `jumpTo`, sheet detents snap without spring, stagger delays go to 0.

**Exception, and it's a deliberate one:** explicit user actions — cluster expand, 2D/3D toggle — keep their camera animation via `essential: true`, exactly as implemented at [Map.tsx:405](src/components/map/Map.tsx#L405) and [Map.tsx:420](src/components/map/Map.tsx#L420). Instantly teleporting the camera in response to a deliberate tap is *more* disorienting than animating it, reduced-motion preference notwithstanding. This existing decision is correct and should be documented as intentional.

---

## 11. Accessibility & Responsive Behavior

### 11.1 Accessibility

**Contrast** — every value in §3.2/§3.4 meets AA. Street labels at 5.9:1, district at 8.1:1, city at 13.4:1. Pin distance chips use `textPrimary` on `surfaceRaised` = 15.8:1. Brand green `#17B26A` on white is 3.1:1 — **acceptable for the 52px Serve Near Me button as large text, not acceptable for body copy on white anywhere**, which the existing token set already respects.

**Never color alone** — status carries via ring color + saturation + scale + chip text + `aria-label`. The existing `aria-label` construction at [MapPin.tsx:31](src/components/map/MapPin.tsx#L31) already does this correctly and needs only the category and distance appended.

**Screen readers** — the map canvas is `role="application"` with an `aria-label` and full keyboard panning. Critically, **the sheet's result list is the accessible equivalent of the map.** A screen reader user never needs to interact with the canvas: the same 124 businesses are a linear, navigable, sorted list. This is why Concept D was rejected and it should be treated as a hard requirement, not a nice-to-have.

**Keyboard** — `Tab` through search → categories → control rail → Serve Near Me → sheet handle → results. Arrow keys pan the map when the canvas has focus; `+`/`-` zoom. Every marker is a real focusable `<button>` (already true — [MapPin.tsx:28](src/components/map/MapPin.tsx#L28)).

**Targets** — 44×44 minimum everywhere. Current 48px pins pass; the 36px compact LOD pin needs a transparent 44px hit area, which is a padding change, not a size change.

**Reduced transparency** — `prefers-reduced-transparency: reduce` swaps all glass for solid `surfaceRaised`. Required for iOS accessibility settings parity and it's a two-line media query.

**Live regions** — result count changes announce politely: "18 businesses serving near you." Errors announce assertively.

### 11.2 Responsive

| Breakpoint | Layout |
|---|---|
| < 380px | Category rail shows 3 chips; sheet peek drops to 104px |
| 380–767px | Reference layout as specced |
| 768–1023px | Sheet becomes a **left side panel**, 380px, full-height. Map fills remainder. Controls move to bottom-right. |
| ≥ 1024px | Side panel 420px. Cinematic tier activates (pitch, 3D buildings, fog). Hover previews on markers. |
| Landscape phone | Sheet → right-side panel 320px; header collapses to icon-only |

The `useMapCapability` tier system ([Map.tsx:132-133](src/components/map/Map.tsx#L132-L133)) already gates cinematic features on device capability — the responsive layout should key off the *same* signal so a low-end tablet doesn't get 3D extrusions merely for being wide.

**Safe areas** — every fixed element already uses `env(safe-area-inset-*)`; preserve this. The sheet must extend *behind* the home indicator with its content padded above it.

---

## 12. Why This Design Feels Premium

**The map is genuinely beautiful, not merely present.** Most apps treat the basemap as infrastructure and spend all design effort on the chrome. Forking Standard and hand-tuning a warm-paper palette with letterpress-crisp labels means the *background* is the most attractive thing on screen. That inversion is what separates Apple Maps from every clone of it.

**Nothing is opaque that doesn't need to be.** Exactly one element is fully solid: the Serve Near Me CTA. Everything else is glass with real saturation boost and hairline borders, so you are always aware of the map continuing beneath. Depth is communicated by translucency and layered shadow rather than by stacking cards, which is why the interface reads as light despite carrying more functionality than the current one.

**Continuity over cuts.** Nothing appears; everything arrives from somewhere. Markers grow from dots to avatars across zoom. The selected avatar physically travels into the sheet header. Camera padding tracks the sheet drag frame by frame. The absence of hard cuts is the most reliable perceptual signal of expensive software, and it is entirely a discipline question rather than a technology one.

**Restraint as a feature.** The compass hides at bearing 0. POIs suppress themselves where StreetServe pins exist. The header collapses while you pan. Away vendors shrink and desaturate. Every one of these is the interface *removing* something to protect the map — and the cumulative effect is an interface that feels like it is paying attention.

**Information density without noise.** A single pin communicates identity, status, category, distance, and live-ness in 48 pixels — via avatar, ring color, notch dot, chip, and pulse. Five channels, one glance, zero clutter. That ratio is the actual definition of premium information design.

**It scales.** The three-plane model has an obvious home for everything that's coming: new map layers become rail entries; new filters become sheet-`full` sections; routing becomes a fourth plane above the map and below the sheet; Block Party and Wave overlays become basemap layers with the pin system unchanged. Nothing in §7's structure needs to move to accommodate the roadmap — which is the difference between a design and a design *system*.

---

## Appendix — Implementation Sequence

| Phase | Work | Files | Impact |
|---|---|---|---|
| **1** | Custom Mapbox style (fork Standard, apply §3 palette) | [mapbox.ts](src/lib/map/mapbox.ts) | **Highest — ~70% of perceived fix, one file** |
| **2** | Glass header, remove opaque wash; consolidate control rail | [MapShell.tsx](src/components/layout/MapShell.tsx), [Map.tsx](src/components/map/Map.tsx) | High |
| **3** | Pin LOD + tail + white knockout + status z-order | [MapPin.tsx](src/components/map/MapPin.tsx) | High |
| **4** | 3-detent sheet with continuous camera padding | new `DiscoverySheet`, [MapHome.tsx](src/features/livemap/components/MapHome.tsx) | High |
| **5** | Native GeoJSON clustering + heatmap tier | [Map.tsx](src/components/map/Map.tsx) | Medium (perf) |
| **6** | Shared-element transition, stagger, haptics | across | Medium (delight) |
| **7** | Responsive side-panel ≥768px | [MapShell.tsx](src/components/layout/MapShell.tsx) | Medium |

**Phase 1 alone resolves the stated problem.** It is a single-file change behind an existing abstraction that was explicitly built for this swap — start there and evaluate before committing to the rest.
