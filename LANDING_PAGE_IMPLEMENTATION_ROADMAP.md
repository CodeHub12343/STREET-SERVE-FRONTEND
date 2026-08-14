# StreetServe — Landing Page Implementation Roadmap

> Build order, dependencies, backend needs, risks, and definition of done — for the implementation phase that follows this planning suite. No production code is written in the current phase.
> Specs: [Strategy](LANDING_PAGE_STRATEGY.md) · [IA](LANDING_PAGE_INFORMATION_ARCHITECTURE.md) · [Sections](LANDING_PAGE_SECTION_BREAKDOWN.md) · [Hero](LANDING_PAGE_HERO_SPECIFICATION.md) · [Animation](LANDING_PAGE_ANIMATION_SPECIFICATION.md) · [3D](LANDING_PAGE_3D_INTERACTIONS.md) · [Components](LANDING_PAGE_COMPONENT_SPECIFICATION.md) · [Responsive](LANDING_PAGE_RESPONSIVE_GUIDE.md) · [A11y](LANDING_PAGE_ACCESSIBILITY.md) · [Checklist](LANDING_PAGE_CHECKLIST.md)

---

## 0. Pre-build decisions (client sign-off required before LP-1)

| # | Decision | Recommended default | Owner |
|---|---|---|---|
| D1 | Final copy (hero block, H2s, FAQ answers) | drafts in Section Breakdown | client + us |
| D2 | Launch-state: ship pre-launch or live variant first | pre-launch (`NEXT_PUBLIC_LAUNCH_STATE=prelaunch`) | client |
| D3 | Sponsor logos + permissions (Wonder Ice lockup) | required assets before §LP-4 | client |
| D4 | Testimonials: real quotes available? | section off via config until real | client |
| D5 | "Founding-member perks" claim in final CTA | omit until defined | client |
| D6 | Partner-contact channel (impact section CTA) | mailto → shared inbox | client |
| D7 | Display font license: Inter Tight (free, recommended) vs. General Sans | Inter Tight via `next/font` | us |
| D8 | Mapbox account/token + style-editing access for the two marketing styles | needed by LP-2 | client/us |

## 1. New dependencies & assets

| Item | Size cost | Why |
|---|---|---|
| `framer-motion` (via `LazyMotion`) | ~5KB on route | reveals, wizard, tabs — animation spec §2 |
| Marketing map styles ×2 (dark dusk / light dawn) | — | Mapbox Studio variants of the product styles (`docs/06 §2.6h`) |
| Hero poster images (dark/light × desktop/mobile crops) | ≤60KB each | LCP + T3 fallback + OG image |
| Simulation dataset `modesto.json` | ~5KB | pins, routes (precomputed polylines), vignette timings |
| Showcase beat renders ×4 | ~40KB ea | carousel fallback + reduced-motion |
| Mini-scene SVGs (how-it-works ×3, feature demos ×8) | inline | authored during build |

No three.js, no GSAP, no Lottie (rationale: 3D doc §1, animation doc §2).

## 2. Backend dependencies (STREET-SERVE-APPLICATION-BACKEND)

| Endpoint | Status (verified in backend repo) | Needed by |
|---|---|---|
| `POST /preregistrations` | **exists** (`sponsors.routes.ts`: `{fullName, email, phone?, intendedRole?, citySlug?, utmCode?}`, write-rate-limited, sponsor UTM attribution) | LP-5 |
| ↳ gaps on the existing POST | `notifyOptIn` field absent (add or fold into semantics); duplicate-email behavior + "#N in line" position in the response need adding for the confirmation UX | LP-5 |
| `GET /preregistrations/count` (public, 60s cache) | **missing** — powers metrics strip + "#N in line" | LP-4 |
| Honeypot/turnstile on the public POST (rate limit alone won't stop distributed bots) | missing | LP-5 |
| Newsletter capture (or fold into preregistrations with a flag) | decision D-item | LP-6 |
| `GET /sponsors` (public logo list) + `POST /sponsors/impression` (UTM) | **exist** — partners section should consume them instead of hardcoding logos | LP-4 |

These are small (one collection, two routes) — schedule as a half-day backend task early so the frontend never mocks the conversion path.

## 3. Build phases

### LP-1 · Shell & structure (foundation)
Marketing theme extension (display-XL, motion.reveal/hero, surfaceGlass) · `MarketingShell`, `MarketingNav`, `AnnouncementBanner`, `SectionShell`, `MarketingFooter` · all 14 sections scaffolded as SSR content with final copy (D1) and zero animation · replaces placeholder `Landing.tsx` · skip links, landmarks, JSON-LD.
**Exit:** full page reads top-to-bottom, semantic, responsive at the grid level, Lighthouse a11y ≥95 already.

### LP-2 · Hero map scene
Poster-first `LiveMapScene` + lazy Mapbox mount + canvas cross-fade · marketing dark style + camera (pitch/bearing/padding) · `SimulationDirector` (seeded loop, unit-tested) · pins, routes, vignettes, floating cards, honesty chip · interaction model (cooperative gestures, pin popovers, keyboard overlay) · capability ladder T1–T3 + reduced-motion opt-in.
**Exit:** hero acceptance criteria (hero spec §9) all pass. *This is the highest-risk phase — start it first among visual work, timebox the simulation polish.*

### LP-3 · Motion layer
Reveal system (shared observers + variants + stagger) · hero entrance choreography · micro-interactions (cards, tabs, accordion, nav states) · reduced-motion contract verified page-wide.

### LP-4 · Mid-page sections
`MetricsStrip` (live count wiring) · `HowItWorksTriad` SVGs · `FeatureBentoGrid` + 8 demos · `MapShowcase` pinned scene + `ShowcaseCarousel` fallback · `BenefitsTabs` · impact/testimonials(config)/trust/partners/FAQ.

### LP-5 · Conversion flow
`PreRegistrationWizard` (sheet/modal, deep links, role preselect) · confirmation + share · `FinalCtaSection` (third map variant) · `StickyMobileCta` · duplicate/error/offline handling · analytics events end-to-end.

### LP-6 · Hardening & launch gate
Full [LANDING_PAGE_CHECKLIST.md](LANDING_PAGE_CHECKLIST.md) execution: perf budgets, a11y audit gate, device matrix, SEO/OG, legal pages (`/terms`, `/privacy` — must exist before the form collects PII), analytics QA, launch-state config rehearsal (prelaunch↔live flip).

**Dependency graph:** LP-1 → (LP-2 ∥ LP-4-static) → LP-3 → LP-4-motion → LP-5 → LP-6. Backend §2 must land before LP-5 starts.

## 4. Performance budgets (CI-enforced where possible)

| Metric | Budget |
|---|---|
| First-paint JS (marketing route, excl. lazy map) | ≤ 90KB gz |
| Animation JS | ≤ 18KB gz |
| Hero poster | ≤ 60KB |
| LCP (Moto-G class, 4G) | ≤ 2.5s |
| CLS | < 0.1 (canvas swap = 0) |
| TBT | < 200ms |
| Lighthouse (mobile): Perf / A11y / SEO | ≥ 85 / ≥ 95 / 100 |
| Non-composited animations audit | 0 findings |

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Mapbox GL cost/perf on low-end mobile | capability ladder is designed-in from LP-2 day one, not retrofitted; T3 poster is a *good* hero, not an apology |
| Simulation looks janky → damages the "polished" goal | seeded deterministic director = reviewable; timebox polish; the loop ships only when it passes the 5-second test with fresh viewers |
| Backend endpoints slip | metrics tiles hide gracefully (no fake numbers); wizard can launch against a stub queue **only in staging** — never ship a form that drops registrations |
| Simulated activity mistaken for real usage (trust damage) | honesty chip is non-negotiable; counters always real |
| Copy legal exposure ("no license", "instant payout", AI claims) | copy rules in Strategy §6 are binding; final copy review against `docs/01 §6` conflicts before D1 sign-off |
| Webview referrers (IG/TikTok) break WebGL | forced T2/T3 in webviews; tested in LP-6 matrix |
| Scope creep on the showcase scene | carousel fallback is also the *contingency ship state* — if the pinned scene isn't excellent by gate, ship the carousel everywhere and iterate post-launch |

## 6. Definition of done

The landing page is done when: every checklist item in [LANDING_PAGE_CHECKLIST.md](LANDING_PAGE_CHECKLIST.md) is checked; the 5-second hero test passes with ≥4/5 fresh viewers; a keyboard-only user and a VoiceOver user can each complete pre-registration unaided; budgets in §4 hold on the device matrix; and a real pre-registration lands in the database from production.
