# StreetServe Frontend — Launch Readiness (Milestone 10)

Polish & launch-readiness gate for the pilot (Modesto, CA). This is the acceptance checklist
for shipping V1: **a11y audit, performance budgets, e2e green, cross-device matrix,
empty/error/offline states on every screen, Lighthouse PWA pass.**

Everything below is enforceable — each item names the automated check or the manual procedure
that proves it.

---

## 1. How to run the full gate

All commands run through PowerShell with node on PATH
(`$env:Path = "C:\Program Files\nodejs;" + $env:Path`).

| Gate | Command | What it proves |
| --- | --- | --- |
| Types | `npm run typecheck` | No type errors (app + e2e + config). |
| Lint | `npm run lint` | ESLint + import-layering rules clean. |
| Unit + a11y | `npm run test` | Vitest suite incl. `src/test/a11y.test.tsx` (axe on primitives + live screens). |
| Build (PWA on) | `npm run build` | Production build; Serwist emits `public/sw.js`. |
| Perf budgets | `npm run budgets` | Gzipped first-load JS within budget (fails the build on regression). |
| PWA artifacts | `npm run check:pwa` | SW + icon + manifest route present. |
| E2E + devices | `npm run e2e` | Playwright smoke/offline/a11y/pwa across 3 device profiles. |
| Lighthouse | `npm run lhci` | Full PWA/a11y/perf scoring (see §6). |

Composite: `npm run verify` runs typecheck → lint → test → build → budgets → check:pwa.
E2E and Lighthouse are separate because they boot a server and (first time) download a browser.

**First-time e2e setup:** `npm run e2e:install` (downloads the Chromium build Playwright drives).
The e2e `webServer` builds in **demo mode** (`NEXT_PUBLIC_MAP_DEMO=true`) so every flow runs with
no backend, Mapbox token, or Clerk keys.

---

## 2. Accessibility audit (axe + manual SR)

**Automated — structural (fast gate).** `src/test/a11y.test.tsx` runs axe-core in jsdom over the
shared primitives (Button variants, labelled Input, EmptyState, ErrorState) and two live demo
screens (WelcomeCarousel, NearbyList). Catches missing labels, bad roles, orphaned controls,
duplicate ids. jsdom can't compute layout, so `color-contrast` is deferred to the browser pass.

**Automated — in-browser (e2e).** `e2e/a11y.spec.ts` runs axe against WCAG 2.1 A/AA on the
marketing home, map list, and business profile across all 3 devices, asserting **zero
serious/critical violations** — this is where `color-contrast` is actually verified.

**Audit results (this pass).** The in-browser axe run (light + dark, 3 screens) surfaced real
defects, all now fixed and green:

- **ARIA:** `Avatar` and the review star-rating spans carried `aria-label` on a role-less
  element (`aria-prohibited-attr`) → added `role="img"`.
- **Color-contrast (WCAG AA):** the brand palette failed 4.5:1 in several places. Per the
  design decision to keep the hues but deepen them, the light-theme accents were darkened
  (`accentPrimary #FF5A33 → #C4410C`, `accentSecondary #1E6FFF → #175CD3`), the neutral tertiary
  grays were nudged (light `#6E717B → #64676F`, dark `#82858F → #8A8D96`), and same-hue status
  **text** (StatusChip, TrustScoreBadge, rating numbers, discount-card labels) now mixes toward
  the theme's text color for AA while the status **tokens stay vibrant** for pins/dots.

Automated coverage is the 3 public screens + shared primitives; expanding per-screen axe specs
to the vendor/seller/hub/admin surfaces is a tracked follow-up (the shared primitives they build
on are already covered).

**Manual screen-reader pass (pre-launch, once per release).** Automated axe catches ~40% of
issues; the rest need a human. Run each core flow end to end with a real SR and confirm:

- [ ] **VoiceOver (iOS Safari)** — Wave → Queue → Pay: every step is announced; the countdown
      and queue-position updates are announced via their `aria-live` regions (not silently).
- [ ] **TalkBack (Android Chrome)** — map list → business profile sheet: focus moves into the
      sheet on open and is trapped; Escape/close returns focus to the triggering card.
- [ ] **NVDA (Windows Firefox)** — vendor dashboard: the live-status toggle, wave inbox
      accept/decline, and order kanban are all operable and labelled.
- [ ] Forms: every input has a programmatic label; inline errors announce via `role="alert"`.
- [ ] Focus visible on every interactive element; tab order matches visual order.
- [ ] Touch targets ≥ 44px (enforced in primitives; spot-check dense screens).
- [ ] Reduced-motion honored (`prefers-reduced-motion`) on the countdown/spinner/skeleton shimmer.

---

## 3. Empty / error / offline states — every screen

Coverage is provided by three layers, so **no screen is a dead end**:

**Route-segment boundaries (global).**
- `src/app/loading.tsx` — skeleton while a segment streams.
- `src/app/error.tsx` — recoverable segment error with a reset button.
- `src/app/global-error.tsx` — last-resort full-document error.
- `src/app/not-found.tsx` — 404 with a route back to the map.

**Per-screen data states (TanStack Query).** Data screens branch:
`isLoading → <Skeleton/>`, `isError → <ErrorState onRetry={refetch}/>`,
`empty → <EmptyState/>` (always actionable — docs/06 §1 "empty state as a sales tool").
Current usage: 53 Skeleton, 10 ErrorState, 22 EmptyState call sites.

**Offline (global).** `<OfflineBanner/>` (mounted in `providers.tsx`, `role="status"`) announces
loss of network and queued-action count; `useOfflineQueue` auto-replays on reconnect with
idempotency keys. Seller QR checkout enqueues offline (`consignment/QrCheckout`).

**Verification matrix** — states confirmed present per surface:

| Surface | Loading | Error+retry | Empty (actionable) | Offline |
| --- | :-: | :-: | :-: | :-: |
| Live map / list (C-10/12) | ✅ | ✅ | ✅ "no vendors nearby → widen radius" | ✅ banner |
| Business profile (C-14) | ✅ | ✅ | ✅ | ✅ |
| Wave → Queue → Pay (C-18–24) | ✅ | ✅ | n/a (flow) | ✅ queue survives drop |
| Orders / history (C-25) | ✅ | ✅ | ✅ "browse the map" | ✅ |
| Messages (C-32/33) | ✅ | ✅ | ✅ | ✅ optimistic send |
| Vendor loop (V-02–06) | ✅ | ✅ | ✅ | ✅ |
| Seller consignment (S-01–10) | ✅ | ✅ | ✅ | ✅ QR enqueue |
| Hub (H-01–06) | ✅ | ✅ | ✅ | ✅ |
| Admin (A-01–07) | ✅ | ✅ | ✅ | ✅ |
| Notifications / settings | ✅ | ✅ | ✅ | ✅ |

`e2e/offline.spec.ts` proves the offline banner reacts to connectivity and the shell survives a
network drop on the shared shell. The per-screen empty/error branches are exercised by the
existing demo render tests + manual pass.

---

## 4. Performance budgets

`scripts/check-bundle-budgets.mjs` (`npm run budgets`) reads Next's `app-build-manifest.json`,
gzips each route's first-load JS, and fails if:

- **Shared first-load JS > 130 KB** (framework + shared app chunks every route pays), or
- **Heaviest route > 260 KB** gzipped.

Runs in `npm run verify` after every build. Heavy libs are already route-scoped (Mapbox loads
only on map routes; Stripe only on pay routes; html5-qrcode only on QR routes) via dynamic import,
so the shared baseline stays lean. Tighten budgets as the app is optimized; a bump is a reviewed
decision, never silent.

---

## 5. E2E suite + cross-device matrix

Playwright (`playwright.config.ts`) runs every spec across **3 device profiles**:

| Project | Device | Engine |
| --- | --- | --- |
| `desktop-chrome` | Desktop Chrome | Chromium |
| `mobile-android` | Pixel 5 | Chromium (mobile viewport + touch) |
| `mobile-ios` | iPhone 13 | WebKit |

Specs: `smoke` (every public/demo surface loads, renders real content, no console/page errors),
`offline` (connectivity banner + shell survival), `a11y` (axe WCAG A/AA, run in both `light` and
`dark`), `pwa` (manifest + SW + theme-color). Extend the smoke spec with the full Wave→Pay chain
against a **staging backend** before GA — the demo build stubs timers, so the timed commitment
escalator is best asserted live.

> **Browser install note:** run `npm run e2e:install` once to fetch the browsers Playwright
> drives. In this sandbox the WebKit download host was unreachable, so the `mobile-ios` project
> was validated by config only; the Chromium projects (`desktop-chrome`, `desktop-dark`,
> `mobile-android`) ran green — **33 passed**. On CI/dev with network access, all four run.

---

## 6. Lighthouse PWA pass

`lighthouserc.json` (`npm run lhci`, needs `@lhci/cli`) scores `/`, `/map/list`,
`/business/biz_taco` against thresholds: **PWA ≥ 0.90, a11y ≥ 0.95** (errors), performance ≥ 0.80
& best-practices ≥ 0.90 (warnings), plus hard asserts on `installable-manifest`, `service-worker`,
and `viewport`.

Run against a production build (`npm run build` with PWA on, then `npm run lhci`). The installable
contract is also guarded on every e2e run by `e2e/pwa.spec.ts` and the build artifacts by
`npm run check:pwa`, so a regression fails CI even without a full Lighthouse run.

**Manual Lighthouse (Chrome DevTools):** build → `npm run start` → DevTools ▸ Lighthouse ▸
Mobile ▸ PWA + Accessibility. Confirm the install prompt appears and the app opens standalone
from the home screen, online and offline.

---

## 7. Pre-GA checklist

- [ ] `npm run verify` green.
- [ ] `npm run e2e` green on all 3 device projects.
- [ ] `npm run lhci` meets thresholds (or manual Lighthouse PWA + a11y pass).
- [ ] Manual SR pass (§2) signed off on the 3 core flows.
- [ ] Real keys wired in the deploy env (Clerk, Stripe, Mapbox, VAPID) — never committed.
- [ ] Backend gaps closed for pilot scope (GAP-2 admin overview, GAP-3 notifications, GAP-4 push).
- [ ] Smoke the timed Wave→Pay chain against staging (not demo) once end to end.
