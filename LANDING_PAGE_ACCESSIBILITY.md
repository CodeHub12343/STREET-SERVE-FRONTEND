# StreetServe — Landing Page Accessibility Specification

> WCAG 2.1 AA is the floor (`docs/06 §2.8`), and the landing page must prove the brand's accessibility values before the product does — it's the first thing anyone meets. This doc covers structure, keyboard, screen readers, motion, contrast, and the audit gate.

---

## 1. Standards & principles

- **Target: WCAG 2.1 AA** across all four principles; the handful of AAA items we adopt anyway: focus-visible everywhere, ≥44px targets (already product law), no timed content the user can't control.
- **The canvas is never the content.** Every fact the map scene communicates exists in DOM text. The page must be 100% consumable with the map entirely absent (which is literally the T3 fallback tier).
- Accessibility ships in the primitives (product rule, `COMPONENT_LIBRARY.md §0.4`) — marketing components inherit focus rings, targets, and reduced-motion from the same primitives.

## 2. Semantic structure

- Landmarks: `<header>` (nav + banner) → `<main>` (all sections) → `<footer>`. Skip link ("Skip to content") as first tab stop → `#hero` content column; a second skip target ("Skip map preview") appears when focus enters the hero map region.
- One `<h1>` (hero). Every section: `<section aria-labelledby="{id}-title">` with a single `<h2>`. Visual eyebrows are presentational (not headings).
- Reading order = visual order = tab order; parallax and reveals never reposition DOM.
- Language `lang="en"`; JSON-LD (Organization, FAQPage) supplements, never replaces, visible content.

## 3. Keyboard navigation map

| Surface | Behavior |
|---|---|
| Skip links | first tab stops; visible on focus (glass chip style) |
| Nav | left→right; anchor links move focus to the target section's H2 (`tabindex="-1"` + programmatic focus so context follows the jump); mobile menu = focus-trapped sheet, Esc closes, focus returns to trigger |
| Hero map pins | after hero CTAs, an offscreen-labeled group "Live vendors (simulated preview)" exposes the ≤7 pins as focusable buttons (DOM overlay, not canvas hit-testing); Enter/Space opens `PinPreviewCard` (focus-trapped popover: Esc/Tab-out closes, focus returns to pin) |
| Map panning | the map region exposes Mapbox's built-in keyboard handlers (arrows pan, +/- zoom) when focused; focusing the region shows a "Use arrow keys to pan" hint chip; Esc exits to the next tab stop |
| Feature cards | cards are not interactive (no click target) → not focusable; demos autoplay in-view; any card with a link uses the link as the tab stop |
| Benefits tabs | WAI-ARIA tabs pattern: `role="tablist"`, arrow keys move, Home/End jump, panel is next tab stop |
| Showcase | scroll-driven scene needs no interaction; caption rail steps are plain content; carousel fallback: arrow-key + button navigation, `aria-roledescription="carousel"` |
| FAQ accordion | `<button aria-expanded>` per header inside an `<h3>`; Enter/Space toggles |
| Pre-reg wizard | modal/sheet: focus-trapped, labelled by step title, Esc prompts-then-closes (unsaved-input confirm), focus returns to opener; role cards = `role="radiogroup"` with arrow-key selection; errors: inline + `aria-describedby` + focus moves to first invalid field |
| Sticky mobile CTA | ordinary button in DOM flow order (end of `<main>`), visually fixed |

## 4. Motion & vestibular safety

Single global reduced-motion switch (CSS media + `MotionConfig` + simulation flag) per [LANDING_PAGE_ANIMATION_SPECIFICATION.md](LANDING_PAGE_ANIMATION_SPECIFICATION.md) §7:
- Reveals → opacity ≤100ms; parallax off; idle drift/camera tours off; pin pulses off; counters instant; carousel manual-only; confetti skipped.
- Hero/showcase render their static designed states with an explicit **"Play preview ▶"** opt-in (a real button, focusable, labelled "Play animated map preview").
- Even without reduced-motion: no flashing >3/s anywhere (strobe rule), no scroll-jacking (the pinned showcase advances only with real scroll distance, never hijacks wheel velocity), auto-moving content (carousel, floating cards) pauses on hover/focus per 2.2.2.

## 5. Screen reader specifics

- Map canvas `aria-hidden="true"`. The map region carries a text alternative: "Simulated preview: a live map of Modesto showing food trucks and mobile vendors — three driving, three parked — receiving wave-down requests and forming discount lines."
- Floating activity cards, ping ripples, glows: `aria-hidden` (pure decoration; their information is narrative, told in section copy).
- **No auto-firing live regions on the marketing page.** The only `aria-live` surfaces: form validation (`polite`), wizard step announcements (`polite`), submit success ("You're number 48 in line in Modesto" — `polite`).
- Count-up metrics: the final value is in the DOM from render (SR reads the real number; the count-up is visual-only via `aria-hidden` animated layer over a static accessible value).
- Images/illustrations: meaningful → descriptive `alt`; decorative scene SVGs → `aria-hidden` + adjacent text. Partner logos → `alt="{Partner} logo"`.
- Icon-only buttons (menu, close, carousel arrows, theme toggle) all carry `aria-label`s.

## 6. Color & contrast (both themes)

- All text ≥4.5:1; large display text ≥3:1; UI components/focus indicators ≥3:1 (tokens already AA-verified — the landing page introduces **no new text/surface pairings** outside these):
  - Text over hero scrim: verified against the *lightest* map tile under the scrim's thinnest point, both themes.
  - Text on `--surface-glass`: verified over worst-case map regions (3D doc §5).
  - `accentPrimary` on dark: use the dark-theme variant `#FF6B45` for text-scale usage; gradient headline spans must keep every gradient stop ≥3:1 for display-size text.
- Nothing is color-only: pin statuses pair ring color + label chip text; discount chips show the % text; form errors pair color + icon + message (`docs/06 §2.8`).
- Focus ring: 2px `accentSecondary`, 2px offset, both themes, never suppressed (`docs/06 §2.6j`).

## 7. Forms (conversion accessibility = conversion rate)

- Labels above fields, never placeholder-as-label (`docs/06 §2.6b`); phone marked "(optional)" in the label.
- `autocomplete` attributes (`name`, `email`, `tel`, `address-level2`); `inputmode` set; inputs ≥16px.
- Errors: inline below field, icon + text, `aria-live="polite"`, described-by wiring, focus to first invalid. Submit button loading state announces via label swap ("Submitting…").
- The entire pre-registration completes with keyboard alone in ≤ 12 tab stops from wizard-open.

## 8. Audit gate (pre-launch, blocking)

1. **Automated:** vitest-axe on every marketing component story (project already wired for vitest-axe); Lighthouse a11y ≥ 95 on the built page; `eslint-plugin-jsx-a11y` clean.
2. **Manual keyboard pass:** full journey (land → explore pins → tabs → FAQ → convert) with keyboard only, both themes.
3. **Screen reader pass:** NVDA+Chrome and VoiceOver+Safari(iOS): landing comprehension, map alternative read, wizard completion, confirmation announcement.
4. **Motion pass:** OS reduced-motion on → verify every §4 collapse, including the opt-in play button.
5. **Zoom/reflow:** 200% zoom and 320px-wide reflow (1.4.10) — no horizontal scroll, no loss; text-spacing override (1.4.12) survives.
6. Findings logged and fixed before launch — the checklist doc carries the sign-off line.
