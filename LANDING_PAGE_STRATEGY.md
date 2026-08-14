# StreetServe — Landing Page Strategy

> The definitive strategy for the StreetServe marketing landing page: business goals, conversion goals, storytelling arc, emotional progression, and the design-system audit that grounds every downstream spec.
> Companions: [LANDING_PAGE_INFORMATION_ARCHITECTURE.md](LANDING_PAGE_INFORMATION_ARCHITECTURE.md) · [LANDING_PAGE_SECTION_BREAKDOWN.md](LANDING_PAGE_SECTION_BREAKDOWN.md) · [LANDING_PAGE_HERO_SPECIFICATION.md](LANDING_PAGE_HERO_SPECIFICATION.md)
> Sources of truth: `docs/06-ux-and-design-system.md` (design system), `docs/01`–`docs/05` (product), `docs/13` (screen specs), `docs/design/*.html` (visual reference), existing `src/app/(marketing)/Landing.tsx` (placeholder to be replaced).

---

## 1. The one-sentence brief

**Within five seconds, a first-time visitor must understand that StreetServe is a live, map-based marketplace where mobile vendors are visible and reachable right now — and feel compelled to claim their place in it.**

Everything else on the page exists to deepen that first impression for whichever of the three audiences the visitor belongs to (customer, vendor, seller) and convert them.

---

## 2. Business goals (ranked)

| # | Goal | Landing-page expression |
|---|---|---|
| 1 | **Grow the pre-launch waitlist** in the pilot market (Modesto, CA) and beyond | Pre-registration is the primary conversion event on every viewport (`docs/03` Flow 1a: name, email, phone optional, role, city, notify opt-in) |
| 2 | **Seed all three sides of the marketplace** — a map with no vendors is worthless | Role-segmented value sections + role selector inside the pre-registration flow; vendor/seller CTAs are first-class, not footnotes |
| 3 | **Establish credibility for a money-moving platform** | Fintech-grade polish, security/trust section, transparent fee language, sponsor logos ("Wonder Ice — national partner") |
| 4 | **Feed the product** | "Explore the live demo" secondary path into the built PWA (`/map`) for stakeholders, sponsors, and press |
| 5 | **Rank for local discovery intent** | SSR marketing route, semantic HTML, structured data (Organization, FAQPage), fast LCP |

## 3. Conversion goals & hierarchy

- **Primary conversion:** pre-registration completion (role + city captured → `preregistrations` collection, `docs/08 §preregistrations`). Target: ≥ 8% of unique visitors start the form, ≥ 60% of starters complete (2-step form, low friction).
- **Secondary conversions:** "Explore the map" demo entry; vendor "List your business" intent (same form, role pre-selected = vendor); newsletter/launch-notification opt-in for out-of-market visitors.
- **Micro-conversions (engagement signals):** hero map interaction (pan/zoom/pin tap), scroll depth past "How it works," FAQ expansion, role-tab switching in the benefits section.
- **Guardrail metrics:** LCP ≤ 2.5s on mid-tier mobile, CLS < 0.1, hero interactive < 4s, bounce rate on mobile not worse than desktop (the hero must degrade gracefully — see [LANDING_PAGE_RESPONSIVE_GUIDE.md](LANDING_PAGE_RESPONSIVE_GUIDE.md)).

**CTA doctrine (from `docs/06 §2.6a` — one primary per region):** exactly one primary-filled CTA visible per viewport-height region. "Get early access" is the global primary. Vendor/seller CTAs use secondary style until inside their own dedicated sections, where they may take primary style because the global CTA is off-screen.

## 4. Audience & entry mindsets

Three personas arrive with different questions (from `docs/02`):

| Persona | Arrives asking | Must see within one scroll of their section |
|---|---|---|
| **Maria (customer)** | "Is the truck near me *right now*? Is this worth signing up for?" | Live pins moving on a map, wave-down explained in one line, line-up discount ("show up early, pay less") |
| **Deshawn (vendor)** | "Will this actually bring me customers without ad spend?" | Queue/discount engine, ping-to-ping viral reach, Block Party — framed as revenue tools, with a vendor-dashboard visual |
| **Angela (seller)** | "Can I really earn today with no capital? What's the catch?" | "You owe nothing until you sell" (the anti-anxiety line from `docs/06 §1`), consignment in 3 steps, AI assistant as a guide not a gimmick |

A fourth audience — **sponsors/partners/press** — reads the page as a credibility document. They convert via the demo link and the partners section, not the form.

## 5. Storytelling strategy — "The city comes alive"

The page is structured as a single narrative told through the map itself:

1. **Wonder** (Hero) — the city as a living map; pins glow, move, and transact in real time. Emotional register: *"whoa, this is happening near me."*
2. **Comprehension** (How it works) — three verbs, one per audience: **Find. Earn. Grow.** Each step animates on the same map language established in the hero.
3. **Belief** (Features + live showcase) — the mechanics that make it real: wave-down, line-up discounts, ping your squad, Block Party, consignment + AI assistant. Shown, not listed — every feature gets a micro-demo.
4. **Belonging** (Benefits by role + community) — "which one are you?" Role-tabbed benefits; the Shelter Partner Program framed with dignity ("an on-ramp, not a handout") under the "See good, do good" tagline.
5. **Trust** (Security, testimonials, sponsors, FAQ) — money-movement credibility: escrow-style payouts, verification tiers, transparent splits.
6. **Action** (Final CTA) — the map returns, zoomed to the visitor's city (or Modesto), with the pre-registration form and the live launch metrics counter ("You're #—— in line").

**Emotional progression:** curiosity → clarity → excitement → identification → confidence → commitment. Each section transition is designed to hand off one emotion to the next (see [LANDING_PAGE_USER_JOURNEY.md](LANDING_PAGE_USER_JOURNEY.md)).

**The connective device:** the map is the recurring visual motif. It opens the page (hero), re-appears mid-page (real-time showcase), and closes the page (final CTA). Nothing on the page uses stock photography of "happy people at food trucks" as a primary visual — the product *is* the visual.

## 6. Positioning & voice

- **Category claim:** "The live map of your city's mobile economy." Not "an app for food trucks" (too narrow), not "a gig marketplace" (too generic).
- **Voice:** energetic, street-level, plainspoken; credible enough for money movement (`docs/06 §2.1`). Short sentences. Second person. Numbers over adjectives.
- **AI language rule (binding, from `docs/05` FR-9.4 / `docs/11` Q6):** all copy says **"smart"** or **"AI-assisted"** recommendations — never "predicts," "AI-powered forecasting," or any claim of trained predictive AI. Include "gets smarter as more sellers use it."
- **Compliance-sensitive copy rules:** never promise "no license required" as a blanket claim (conflict logged in `docs/01 §6`) — use "start selling without buying inventory upfront." Never promise "instant payouts" unqualified — use "fast, automatic payouts" (tiered verification reality, `docs/01 §7.1`).
- **Tagline:** *"See good, do good."* appears once, in the community/impact section — not the hero (the hero sells the live map; the tagline seals the mission).

## 7. Design-system audit (Task 2) — verdict and deltas

The system in `docs/06 §2` is strong and remains **the** source of truth. Audit findings:

**Keep as-is (verified fit for a landing page):**
- Color tokens — dark-first with `--accent-primary` orange is distinctive against the sea of blue fintech landing pages; all pairings already AA-verified per the brand-palette deepening pass.
- Type stack (Inter Tight display / Inter body / tabular numerals) — the 56px top of the scale is the only gap (see delta 1).
- Motion tokens (100/200/300ms, decelerate/exit easings, reduced-motion collapse) — adopted wholesale as the *base* layer.
- Button hierarchy, focus ring, 44px targets, chip/pin/card radius language — used verbatim.

**Deltas (additive, marketing-scope only — no product token changes):**
1. **Extended display scale:** add `72 / 88px` steps (clamp-based, `clamp(40px, 8vw, 88px)`) for hero headlines. 56px is a dashboard-scale max, not a hero max. Scoped to marketing via a `marketing` theme extension, not a change to `styles/tokens.ts` product values.
2. **Marketing motion tier:** add `--motion-hero: 600ms` and `--motion-reveal: 500ms` durations with the existing decelerate easing for scroll reveals and hero choreography. Product surfaces stay at 100/200/300ms; the landing page may be more cinematic. Both collapse under `prefers-reduced-motion` identically (`docs/06 §2.6c` rule extends to these).
3. **Glassmorphism token:** `--surface-glass: rgba(23,24,28,0.72) + backdrop-blur(16px) + 1px rgba(255,255,255,0.08) border` (dark) / `rgba(255,255,255,0.78)` (light) — for floating cards over the hero map only. Constraint: glass surfaces must still meet 4.5:1 text contrast over the *worst-case* map region beneath them; the map style is desaturated (`docs/06 §2.6h`) which makes this achievable.
4. **Gradient discipline:** one sanctioned gradient — `accentPrimary → #FF9E45` (already in the placeholder Landing) — for headline emphasis spans and the final-CTA glow. No multi-hue gradients; the map's status colors carry the color story.
5. **No new icon family:** Lucide/Phosphor per `docs/06 §2.5`; marketing site and product share one set (explicit rule in §2.5).

**Rejected improvements (considered, not justified):** a third accent hue (dilutes the status-color semantics), heavy 3D WebGL scenes beyond the map (see [LANDING_PAGE_3D_INTERACTIONS.md](LANDING_PAGE_3D_INTERACTIONS.md) — Mapbox GL *is* the 3D engine), light-mode-first marketing (dark-first is the established brand aesthetic per `docs/06 §2.1` and the map reads dramatically better dark).

## 8. Page-state strategy: pre-launch vs. launched

The page ships **pre-launch-first** with a config flag (`NEXT_PUBLIC_LAUNCH_STATE = 'prelaunch' | 'live'`):

| Element | Pre-launch | Live |
|---|---|---|
| Primary CTA | "Get early access" → pre-registration wizard | "Open the map" → `/map` (+ app install) |
| Hero map data | Simulated live activity (clearly delightful, not deceptive — see honesty rule below) | Real anonymized live pin data for the visitor's city |
| Launch metrics | Pre-registered count + sponsor count + "Launching in Modesto, CA" | Live counts (vendors live now, sales today) |
| Empty-market messaging | "Coming soon in your area" + widen-notify CTA (`docs/03` Flow 1 empty state) | City selector |

**Honesty rule (binding):** simulated hero activity is labeled — a small "Simulated preview" caption chip on the map (peripheral, non-intrusive). We never present fabricated counts as real metrics; the launch counters read from the real `preregistrations` count. This is a trust product; the landing page cannot start with a lie.

## 9. SEO / performance strategy (summary — details in roadmap)

- `(marketing)` route group renders the full page shell server-side; the interactive map hydrates progressively behind a styled static placeholder (poster image of the exact same map style) so LCP is the poster, not the WebGL canvas.
- Mapbox GL JS (~250KB gz) loads lazily on interaction-intent (pointer near hero / idle after 2s / scroll into any map section) — never blocks first paint.
- Semantic sections (`<header> <main> <section aria-labelledby>`), FAQPage + Organization JSON-LD, OG image = the hero map poster.
- Target budget: ≤ 90KB JS on first paint (excluding lazily-loaded map), LCP ≤ 2.5s / TTI ≤ 4s on Moto-G-class hardware.

## 10. Success measurement plan

Instrument (respecting a consent banner if analytics requires one):
- `landing_view`, `hero_map_interact`, `section_view:{id}` (scroll depth), `role_tab_switch`, `prereg_start`, `prereg_step`, `prereg_complete:{role}`, `demo_enter`, `faq_expand:{q}`.
- Weekly funnel review: visitors → prereg_start → complete, segmented by role and device class. The role mix (customer : vendor : seller) is a launch-readiness metric in itself — a 95% customer waitlist means the supply side needs targeted acquisition.
