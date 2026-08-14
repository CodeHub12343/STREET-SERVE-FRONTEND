# Performance baseline

**Measured 2026-08-02** (roadmap task 5.2). The point of this file is that the numbers below were
**run**, not estimated — the audit's P-2 finding was that budgets and Lighthouse existed and had
never actually been executed and recorded.

Both now run in CI (`.github/workflows/ci.yml`): bundle budgets in the `verify` job, Lighthouse in
its own `lighthouse` job.

---

## Bundle budgets — PASS

`node scripts/check-bundle-budgets.mjs`, gzipped JS, against a production `next build`.

| Metric | Measured | Budget | Headroom |
|---|---|---|---|
| Shared first-load JS | **87.8 KB** | 130 KB | 32% |
| Heaviest route (`/(customer)/business/[id]/order`) | **239.7 KB** | 260 KB | **8%** |

Top routes by first-load JS:

| Route | First load |
|---|---|
| `/(customer)/business/[id]/order` | 239.7 KB |
| `/(customer)/order/[id]/pay` | 239.7 KB |
| `/(customer)/order/[id]` | 239.7 KB |
| `/(customer)/orders` | 239.7 KB |
| `/(dashboard)/vendor/bookings` | 238.6 KB |
| `/(customer)/map` | 238.2 KB |

### Re-baselined 2026-08-04 (community-network roadmap task 6.4)

**The gate fired, and it was right to.** Adding Pay It Forward and Boost cards to the business
profile sheet — which the map route renders — took `/(customer)/map` to **260.4 KB against a 260 KB
budget** and failed the build. The 2026-08-02 note predicted exactly this: *"the next person to add a
dependency to the map surface will trip this gate."*

Three lazy-load boundaries fixed it, each drawn where the first screen genuinely does not need the code:

| Change | Why it is safe to defer |
|---|---|
| `ContributeSheet` / `ContributeToCampaignSheet` | Forms that render only after a deliberate tap |
| `PayItForwardCard` / `BoostCampaignCard` | Render only for a business that has a fund, or a live campaign |
| **`BusinessProfileSheet` itself, from `MapHome`** | Opens only when a customer taps a pin |

Result: the map route went **260.4 KB → 238.2 KB** and is no longer the heaviest route on the
platform. It is now **9.2 KB lighter than the original baseline**, and the worst-case headroom
improved from 12.6 KB to 20.3 KB.

The third change is the one worth keeping in mind: the profile sheet is the map's largest dependency
and none of it is on the first screen. That was the baseline's own recommendation ("lazy-load what
the first screen does not need"), unactioned until the gate forced it.

The shared baseline is healthy at 32% headroom.

---

## Lighthouse — accessibility PASS, performance and best-practices below target

`npx @lhci/cli autorun`, desktop preset, 1 run per URL, production build served by `npm run start`.

| URL | Accessibility | Performance | Best practices |
|---|---|---|---|
| `/` | ✅ ≥0.95 | ⚠️ **0.45** | ⚠️ 0.74 |
| `/map/list` | ✅ ≥0.95 | ✅ ≥0.80 | ⚠️ 0.74 |
| `/business/biz_taco` | ✅ ≥0.95 | ⚠️ **0.51** | ⚠️ 0.70 |

**Accessibility is the only error-level gate and it passes on every audited route** — which matches
the M10 a11y work and the vitest-axe suite.

Performance and best-practices are warnings by design: a shared CI runner's throttling is noisy
enough that a hard performance gate teaches people to ignore failures, which costs more than the
gate is worth.

### How to read the 0.45

Take it as a **floor, not a verdict.** This run was on a loaded Windows dev laptop, single run per
URL, against a build with `NEXT_PUBLIC_MAP_DEMO` off — so the audited pages rendered empty and error
states rather than real content, and a good part of the score is measuring a page waiting on a
backend that is not running. The CI job builds with demo mode on for exactly that reason.

It is still too low to dismiss. The two routes that score worst are the two heaviest bundles, which
is consistent rather than coincidental.

### Config correction

The previous `lighthouserc.json` asserted on `categories:pwa`, `installable-manifest`,
`service-worker`, and `themed-omnibox`. **All four were removed in Lighthouse 12**, so those
assertions — three of them error-level — had quietly stopped testing anything and would have failed
the build on "not a known audit" the first time anyone ran them in CI. They are gone.

PWA coverage did not disappear with them: `scripts/check-pwa.mjs` asserts the service worker,
manifest route, and icon directly, and now runs in CI. That is a better check anyway — it tests the
artifacts rather than Lighthouse's opinion of them.

---

## Re-running

```bash
npm run build      # required first — the budget script reads .next/app-build-manifest.json
npm run budgets
npm run check:pwa
npx @lhci/cli autorun
```

Outside a git repository, LHCI's upload step fails on `git rev-parse HEAD`. The assertions still
run; set `LHCI_BUILD_CONTEXT__CURRENT_HASH` if you need the upload.

## What to do next

1. **Trim the map route.** 5% headroom is not a budget, it is a tripwire. Lazy-load what the first
   paint does not need.
2. **Re-measure with demo mode on** to separate "the app is slow" from "the app is waiting".
3. **Read the best-practices audits.** 0.70–0.74 across every route means one shared cause, not
   three page-specific ones — most likely console errors or source-map/CSP headers, both cheap.
4. Then tighten the budgets toward the measured numbers, so the gate keeps meaning something.
