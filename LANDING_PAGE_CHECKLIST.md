# StreetServe — Landing Page Master Checklist

> The launch gate. Every box checked = the page ships. Organized by discipline; each item cites its spec. Run fully in [LP-6](LANDING_PAGE_IMPLEMENTATION_ROADMAP.md) (§3), with per-phase items verified as their phase exits.

---

## 1. Strategy & content
- [ ] Final copy signed off (D1) and matches copy budgets (IA §2)
- [ ] AI language rule holds everywhere: "smart"/"AI-assisted," never predictive claims (Strategy §6 / FR-9.4)
- [ ] No blanket "no license required" claim; FAQ #5 uses the compliant answer (Strategy §6)
- [ ] No unqualified "instant payout" claim (Strategy §6)
- [ ] Tagline "See good, do good" appears exactly once (impact section)
- [ ] All numbers real or labeled "example"; no fabricated testimonials/metrics/logos (Sections §2, §8, §10)
- [ ] "Simulated preview" chip present whenever simulation runs (Hero §4, honesty rule)
- [ ] One primary-filled CTA per viewport region, page-wide (`docs/06 §2.6a`)
- [ ] Pre-launch/live config flip rehearsed; both variants reviewed (Strategy §8)

## 2. Hero (spec §9)
- [ ] 5-second comprehension test passes with fresh viewers (≥4/5)
- [ ] LCP = poster, ≤2.5s mid-tier mobile; canvas swap CLS = 0
- [ ] All 6 simulation vignettes fire per 90s loop; loop seam invisible
- [ ] Idle drift + 20s tour run; any user gesture cancels instantly, resumes after 8s
- [ ] Pin hover/tap/keyboard → profile card → "Join the line" → wizard (all input modes)
- [ ] Page scroll never hijacked (cooperative gestures verified, desktop + touch)
- [ ] T1/T2/T3/T0 tiers each land on their designed state (3D §7)
- [ ] Parallax desktop-pointer-only, off under reduced motion (3D §3)

## 3. Sections
- [ ] Nav: transparent→glass at 24px; active-anchor highlight; mobile sheet menu focus-trapped (IA §3)
- [ ] Banner dismissal persists (localStorage)
- [ ] Metrics: real values, count-up once, skeleton reserves width, absent tiles hidden (Sections §2)
- [ ] Feature demos: play on hover/focus (pointer) and in-view (touch); first-frame meaningful when idle (Animation §6)
- [ ] Showcase: 4 beats complete on scroll ≥768px; carousel fallback <768px / reduced-motion / no-WebGL (Animation §4)
- [ ] Benefits tabs: `?role=` preselects tab and wizard role (Journey §4)
- [ ] Testimonials config-off renders no empty shell (Components §4)
- [ ] FAQ: one-open accordion, deep-linkable, FAQPage JSON-LD validates
- [ ] Final CTA: "#N in line" from live count; map backdrop tiers correctly; app badges absent pre-launch (Sections §12)
- [ ] Footer: legal links live (`/terms`, `/privacy` exist), newsletter submits, theme toggle works

## 4. Conversion flow
- [ ] Wizard: role → details → confirmation; ≤12 tab stops keyboard-only (A11y §7)
- [ ] `?register=1` deep link opens wizard; `role=` preselects
- [ ] Submits to real `POST /preregistrations`; production test row verified in DB (Roadmap §6)
- [ ] Duplicate email → friendly "already in line, #N" (Components §3)
- [ ] Network failure → in-sheet retry; no lost input on step navigation
- [ ] Confirmation: position, native share ("Ping your squad"), demo link; return-visit hero state set (Journey §4)
- [ ] Rate limiting + bot protection live on the endpoint (Roadmap §2)
- [ ] Sticky mobile CTA: appears post-hero, hides during wizard + final CTA section, safe-area padded

## 5. Motion
- [ ] Only transform/opacity animated; non-composited-animations audit = 0 (Animation §1, §8)
- [ ] Single easing family; reveals animate once, no scroll-up re-trigger (Animation §5)
- [ ] Hero entrance never blocks interaction; CTAs clickable from SSR paint (Animation §3)
- [ ] Reduced-motion collapses everything per contract incl. "Play preview ▶" opt-in (Animation §7)
- [ ] rAF work suspends when hidden/off-screen (Animation §8)
- [ ] Carousel/auto-advancing content pauses on hover/focus/touch (WCAG 2.2.2)

## 6. Accessibility (audit gate, A11y §8 — blocking)
- [ ] vitest-axe clean on all marketing component stories
- [ ] Lighthouse a11y ≥95; `jsx-a11y` clean
- [ ] Landmarks, single H1, no heading skips, skip links (incl. "Skip map preview")
- [ ] Full keyboard journey: land → pins → tabs → FAQ → conversion, both themes
- [ ] NVDA + VoiceOver passes: map text alternative, wizard completion, confirmation announced
- [ ] No auto-firing live regions; decorative layers `aria-hidden` (A11y §5)
- [ ] Contrast verified: scrim worst-case, glass over map, gradient headline stops, both themes (A11y §6)
- [ ] 200% zoom + 320px reflow + text-spacing override survive (1.4.10/1.4.12)
- [ ] Nothing color-only; focus ring everywhere per `docs/06 §2.6j`

## 7. Responsive & platform (Responsive §7 matrix)
- [ ] iPhone SE/12 Safari · mid-Android Chrome · iPad both orientations · 1440p desktop ×3 browsers
- [ ] Instagram/TikTok webviews: T2 forced, CTA reachable
- [ ] `100svh` hero correct through iOS toolbar collapse; safe-area insets respected
- [ ] Inputs ≥16px (no iOS zoom-on-focus); touch targets ≥44px
- [ ] Hover-only affordances have touch/focus equivalents

## 8. Performance (Roadmap §4 budgets)
- [ ] First-paint JS ≤90KB gz; animation JS ≤18KB gz; poster ≤60KB
- [ ] LCP ≤2.5s / CLS <0.1 / TBT <200ms on Moto-G-class
- [ ] Mapbox lazy-loads on intent; never blocks first paint
- [ ] Lighthouse mobile: Perf ≥85 · A11y ≥95 · SEO = 100
- [ ] dPR cap ≤2; simulation GPU idle <30% mid-mobile (3D §7)
- [ ] Fonts via `next/font` (no FOIT/CLS); images AVIF/WebP + `sizes`

## 9. SEO, meta & compliance
- [ ] Title/description; OG + Twitter cards (poster image 1200×630); canonical
- [ ] Organization + FAQPage JSON-LD validate (Rich Results test)
- [ ] All content SSR'd (view-source shows full copy); works with JS disabled (content + CTAs)
- [ ] `/terms` + `/privacy` published before form collects PII; form links to privacy
- [ ] Analytics events firing per canonical list (Strategy §10); consent handled if required
- [ ] Location approximation (final CTA) is IP-level only — no geolocation permission prompt

## 10. Quality bar (the billion-dollar-startup test)
- [ ] Hero screenshot holds up beside Stripe/Linear/Airbnb heroes in a side-by-side
- [ ] Both themes feel equally intentional (dark default)
- [ ] Every interactive element has designed hover/focus/active/disabled states
- [ ] Empty/error/loading states all designed — no browser-default anything
- [ ] Zero lorem ipsum, placeholder logos, or TODO copy anywhere
- [ ] The team would put this page in their portfolio

**Sign-off:** ☐ Design · ☐ Engineering · ☐ Accessibility · ☐ Client — date: ______
