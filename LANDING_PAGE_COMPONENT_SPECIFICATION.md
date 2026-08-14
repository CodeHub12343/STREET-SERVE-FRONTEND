# StreetServe — Landing Page Component Specification

> The component inventory for the marketing landing page: what's reused from the product library, what's new, and the props/state contract for each. Foundation: [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) (product primitives), `docs/06 §2.6` (design system).

---

## 1. Placement & principles

- New marketing components live in `src/features/marketing/components/` (feature-scoped per [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)); shared primitives stay in `components/primitives`.
- **Reuse before build:** product primitives (`Button`, `Chip/StatusChip`, `Input`, `Sheet`, `Tabs/SegmentedControl`, `Skeleton`, `Toast`, `Avatar`, `EmptyState`) are used verbatim — the landing page is a preview of the product, so shared DNA is a feature, not a shortcut.
- Every marketing component reads the same styled-components theme; the marketing route's layout injects the **marketing theme extension** (display-XL type steps, `motion.reveal/hero`, `surfaceGlass`) via a nested `ThemeProvider` — product tokens untouched ([LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §7 deltas).
- All are `"use client"` (styled-components constraint) except pure-content section wrappers where possible; content itself arrives via server-rendered props.

## 2. Reused product components (as-is or thin-wrapped)

| Product component | Landing use | Adaptation |
|---|---|---|
| `Button` | every CTA | none — variants/sizes per `docs/06 §2.6a` |
| `StatusChip` | pin states, discount chips in demos, banner | none |
| `MapPin` + `StatusRing` | hero/showcase pins | wrapped as `SimPin` (adds scripted-motion driver + label chip); visual identical |
| `Sheet` | pre-reg wizard (mobile), mobile nav menu | none |
| `SegmentedControl`/`Tabs` | benefits role tabs | adds URL-param sync |
| `Input` | pre-reg form, newsletter | none |
| `Skeleton` | metrics tiles pre-data | none |
| `ReceiptCard` (visual) | showcase beat 4, trust fee diagram | static "example" variant, `aria-label`ed as example |
| `QueuePositionCard`/`DiscountLadder` (visual) | line-up demos | non-interactive demo variant |
| `Countdown` | (not used — no fake urgency timers on marketing, ever) | — |

## 3. New marketing components

### Layout & chrome
| Component | Contract | Notes |
|---|---|---|
| `MarketingShell` | wraps `(marketing)` layout: nav + banner + footer + theme extension + analytics context | replaces placeholder Landing wrapper |
| `MarketingNav` | `links[], launchState` · state: `scrolled, menuOpen` | transparent→glass at 24px; mobile sheet menu; active-anchor highlight |
| `AnnouncementBanner` | `message, dismissKey` | localStorage persistence; Banner spec `docs/06 §2.6d` |
| `SectionShell` | `id, eyebrow, headline, support?, children` | enforces eyebrow→H2→support hierarchy + `aria-labelledby` + reveal choreography in one place |
| `MarketingFooter` | `columns[], onNewsletterSubmit` | includes theme toggle |
| `StickyMobileCta` | `visibleWhen` (hero exited ∧ cta section not visible ∧ wizard closed) | glass bar, safe-area inset |

### Hero & map scene
| Component | Contract | Notes |
|---|---|---|
| `HeroSection` | `launchState` | composes copy column + `LiveMapScene` + fallback ladder |
| `LiveMapScene` | `variant: 'hero'\|'showcase'\|'cta'`, `tier: T0–T3`, `theme` | owns the Mapbox instance, style, camera scripts; poster-first mount ([LANDING_PAGE_HERO_SPECIFICATION.md](LANDING_PAGE_HERO_SPECIFICATION.md) §6) |
| `SimulationDirector` (hook: `useSimulation`) | seeded 90s timeline; emits actor ticks + vignette events | pure logic, rAF-based, pausable; unit-testable |
| `SimPin` | `vendor{name,logo,status}, focusable` | DOM marker; keyboard focus; opens `PinPreviewCard` |
| `PinPreviewCard` | `vendor` · anchored popover, focus-trapped | compact BusinessProfileSheet look-alike; "Join the line ↗" → wizard |
| `FloatingActivityCard` | `icon, text, anchor` | glass, `aria-hidden`, lifecycle per animation spec §6 |
| `SimulatedPreviewChip` | — | the honesty chip; always mounted with any running simulation |

### Sections
| Component | Contract | Notes |
|---|---|---|
| `MetricsStrip` | `metrics[] {label, value?, format}` from `/preregistrations/count` etc. | count-up on reveal; hides tiles with absent values (no fake numbers) |
| `HowItWorksTriad` | 3 static panels + illustrated mini-scenes (SVG) | scene SVGs share map visual language |
| `FeatureBentoGrid` / `FeatureCard` | `demo: ReactNode, title, body, size` | demo = self-contained CSS/SVG animation honoring the global reduced-motion flag; plays on hover/focus/in-view |
| `MapShowcase` | scroll-scene: sticky `LiveMapScene variant='showcase'` + `CaptionRail steps[4]` + progress→beat mapping | swaps to `ShowcaseCarousel` fallback (<768px / reduced-motion / no-WebGL) |
| `ShowcaseCarousel` | 4 static beat renders + captions, swipeable | shared caption content with MapShowcase (single source) |
| `BenefitsTabs` | `defaultRole` (from `?role=`), per-role: benefits[3], visual, cta | one primary CTA at a time |
| `ImpactSection`, `TestimonialCarousel`, `TrustTiles`, `FeeSplitDiagram`, `PartnerLogoRow`, `FaqAccordion` | per [LANDING_PAGE_SECTION_BREAKDOWN.md](LANDING_PAGE_SECTION_BREAKDOWN.md) §7–11 | `TestimonialCarousel` renders nothing when quote list is empty (pre-launch config); `FaqAccordion` emits FAQPage JSON-LD |
| `FinalCtaSection` | `launchState, nextInLine?` | map backdrop (`LiveMapScene variant='cta'`) + inline form or wizard trigger |

### Conversion flow
| Component | Contract | Notes |
|---|---|---|
| `PreRegistrationWizard` | `defaultRole?, city?` · steps: role → details → confirmation · renders in `Sheet` (mobile) / `Modal` (desktop); deep-link `?register=1` | WizardFlow pattern; state in component + URL step param; submits to `POST /preregistrations` (`docs/08` shape); duplicate-email → friendly "you're already in line — you're #N" |
| `RoleSelectCards` | 4 role cards, radio-group semantics | 44px+ targets, arrow-key navigable |
| `RegistrationConfirmation` | `position, city` | "#N in line" tick-up + native-share "Ping your squad" + demo link; sets localStorage flag for return-visit hero state |
| `NewsletterForm` | email-only capture | footer block; reuses Input/Button |

## 4. States matrix (every component ships these)

| Component | Loading | Empty/absent | Error |
|---|---|---|---|
| `LiveMapScene` | poster (designed) | — | poster persists (T3) — silent, designed |
| `MetricsStrip` | skeleton tiles (width-reserved) | tile hidden | tile hidden |
| `PreRegistrationWizard` | button spinner (width-locked) | — | inline error below field (`docs/06 §2.6b`), submit re-enabled; network failure → retry banner in-sheet |
| `TestimonialCarousel` | — | section unrendered | section unrendered |
| `PartnerLogoRow` | — | row hidden (never placeholder logos) | hidden |
| `FaqAccordion` | static content (build-time) | — | — |

## 5. Data contracts

| Need | Source | Notes |
|---|---|---|
| Pre-registration submit | `POST /preregistrations` — **exists in backend** (`{fullName, email, phone?, intendedRole?, citySlug?, utmCode?}`, write-rate-limited) | wizard passes `utmCode` from `?utm=` param (sponsor attribution is already wired server-side); `notifyOptIn` + duplicate-email/position response are small backend additions (roadmap §2) |
| Waitlist count / position | `GET /preregistrations/count` (public, cached 60s) | powers metrics strip + "#N in line"; **needs building** |
| Partner logos | `GET /sponsors` (public, exists) + `POST /sponsors/impression` for UTM impressions | `PartnerLogoRow` consumes this instead of hardcoded assets |
| Simulation data | static seeded JSON in-repo (`features/marketing/sim/modesto.json`: pin positions, precomputed route polylines, vignette timings) | no runtime API; ~5KB |
| Launch state / section flags | `NEXT_PUBLIC_LAUNCH_STATE` + a `marketing.config.ts` (testimonials on/off, counts on/off, banner copy) | single config module, no CMS pre-launch |

## 6. Analytics contract

`useMarketingAnalytics()` exposes `track(event, props)`; components fire the canonical events from [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §10 (`SectionShell` auto-fires `section_view` via its reveal observer; wizard fires `prereg_*`; `LiveMapScene` fires `hero_map_interact` once per session on first gesture). Implementation-agnostic (wraps whatever analytics lands) — components never import a vendor SDK directly.

## 7. Storybook coverage

Every new component gets stories (the project already ships Storybook): default + all states-matrix rows + reduced-motion mode + both themes. `SimulationDirector` gets unit tests for the seeded timeline (beat times, loop seam) rather than stories.
