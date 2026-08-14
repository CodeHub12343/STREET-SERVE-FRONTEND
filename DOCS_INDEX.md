# Documentation index — frontend

**Maintained as of 2026-08-02.** Start here. This repo has 38 markdown files at the root, 14 in
`docs/`, and two audit folders; several describe work that is finished, superseded, or was never
started. A reader who cannot tell which roadmap is current trusts none of them, so every document is
labelled below.

| Label | Meaning |
|---|---|
| **Current** | Describes the system as it is, or work still in progress. Trust it. |
| **Historical** | Was accurate when written and is kept as a record. Do not plan from it. |
| **Superseded** | Replaced by a named successor. Read the successor instead. |

---

## Start here

| Document | Label | What it is |
|---|---|---|
| [README.md](README.md) | Current | Setup, scripts, and how to run the app. |
| [audit/2026-08-marketplace-spec/IMPLEMENTATION_ROADMAP.md](audit/2026-08-marketplace-spec/IMPLEMENTATION_ROADMAP.md) | **Current — the active plan** | The live roadmap. Phases 1–6 complete; 7–8 open. |
| [audit/2026-08-marketplace-spec/FINAL_IMPLEMENTATION_CHECKLIST.md](audit/2026-08-marketplace-spec/FINAL_IMPLEMENTATION_CHECKLIST.md) | Current | The pre-launch checklist, ticked as work lands. |

**If you are picking up work, those three are the whole answer.** Everything below is reference.

---

## The 2026-08 marketplace-spec audit (`audit/2026-08-marketplace-spec/`)

The most recent full audit, covering the Part A feature list and Part B §31–§60. All Current.

| Document | What it is |
|---|---|
| [IMPLEMENTATION_AUDIT_REPORT.md](audit/2026-08-marketplace-spec/IMPLEMENTATION_AUDIT_REPORT.md) | The findings, with `file:line` evidence. Body describes the state **as audited**; the header records what has since been fixed. |
| [FEATURE_COMPLETION_MATRIX.md](audit/2026-08-marketplace-spec/FEATURE_COMPLETION_MATRIX.md) | Every requirement, classified. |
| [MISSING_FEATURES.md](audit/2026-08-marketplace-spec/MISSING_FEATURES.md) | Never built. |
| [PARTIALLY_IMPLEMENTED_FEATURES.md](audit/2026-08-marketplace-spec/PARTIALLY_IMPLEMENTED_FEATURES.md) | Built, incomplete. |
| [FEATURES_REQUIRING_FIXES.md](audit/2026-08-marketplace-spec/FEATURES_REQUIRING_FIXES.md) | Defects. All ten now closed. |
| [ARCHITECTURAL_IMPROVEMENTS.md](audit/2026-08-marketplace-spec/ARCHITECTURAL_IMPROVEMENTS.md) | A-1…A-10, with justifications. Nine of ten implemented; only A-4 remains. |
| [ADR-001-storefront-model.md](audit/2026-08-marketplace-spec/ADR-001-storefront-model.md) | The storefront decision (A-8). Blocks MS-1/MS-5/MS-6/HR-9/M-40. |
| [ADR-002-staff-vs-gig.md](audit/2026-08-marketplace-spec/ADR-002-staff-vs-gig.md) | Engagements, not employment (7.10). Why there is no employee entity, and the copy rule that follows. |
| [ADR-003-revenue-decisions.md](audit/2026-08-marketplace-spec/ADR-003-revenue-decisions.md) | Video ads, insurance, loans, processing markup — all four declined, with the rule they share. |
| [PRODUCTION_READINESS.md](audit/2026-08-marketplace-spec/PRODUCTION_READINESS.md) | **The Phase 8 result.** What is verified, and the six things that need a person rather than a commit. |
| [TECHNICAL_DEBT.md](audit/2026-08-marketplace-spec/TECHNICAL_DEBT.md) | D-1…D-15, by interest rate. |
| [PRODUCTION_READINESS_REPORT.md](audit/2026-08-marketplace-spec/PRODUCTION_READINESS_REPORT.md) | The **audit's** six-dimension assessment, as found (2026-08-01). Kept for the reasoning; superseded on facts by the file above. |
| [IMPLEMENTATION_PRIORITY_MATRIX.md](audit/2026-08-marketplace-spec/IMPLEMENTATION_PRIORITY_MATRIX.md) | Value vs effort. |
| [LEGAL_REVIEW_BRIEF.md](audit/2026-08-marketplace-spec/LEGAL_REVIEW_BRIEF.md) | The brief for M-1, the one remaining launch blocker. |

## The earlier audit (`audit/*.md`)

**Historical.** Written before the 2026-08 audit and reusing five of the same filenames — which is
why the newer audit lives in a subdirectory. Where the two disagree, the subdirectory wins.

`BACKEND_FRONTEND_GAP_ANALYSIS.md` · `BUG_FIX_LIST.md` · `FEATURE_COMPLETION_MATRIX.md` ·
`FINAL_IMPLEMENTATION_CHECKLIST.md` · `IMPLEMENTATION_PRIORITY.md` · `IMPLEMENTATION_STATUS.md` ·
`MISSING_FEATURES.md` · `PARTIALLY_IMPLEMENTED_FEATURES.md` · `PERFORMANCE_RECOMMENDATIONS.md` ·
`PROJECT_AUDIT_REPORT.md` · `SECURITY_AUDIT.md` · `TECHNICAL_DEBT.md` · `UX_IMPROVEMENTS.md`

`PHASE_1_IMPLEMENTATION_PLAN.md`, `PHASE_2_…`, `PHASE_3_…` are **Historical but still cited**: the
backend source references them by section number (e.g. "PHASE_1_IMPLEMENTATION_PLAN.md §3" in
`orders/pricing.ts`). Keep them.

## Product specification (`docs/`)

**Current.** The PRD and architecture blueprint — the source of product truth, distinct from any
roadmap.

`00-README.md` (the index for this folder) · `01-executive-summary-and-requirements` ·
`02-product-vision-personas-roles` · `03-user-flows` · `04-feature-breakdown` ·
`05-prd-functional-spec` · `06-ux-and-design-system` · `07-technical-architecture-and-stack` ·
`08-database-design` · `09-api-specification` · `10-security-and-scalability` ·
`11-roadmap-and-open-questions` · `12-screen-inventory-and-sitemap` · `13-screen-design-specs` ·
`docs/consignment/` · `docs/design/`

## Frontend architecture references (root)

**Current.** Describe how the app is built; cited from source comments.

| Document | Covers |
|---|---|
| [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md) | App Router structure, server/client boundaries |
| [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) | Where code goes |
| [ROUTING_STRUCTURE.md](ROUTING_STRUCTURE.md) | Route groups per role |
| [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) | TanStack Query conventions, optimistic updates |
| [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md) | Query keys, caching, invalidation |
| [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) | The design system |
| [RESPONSIVE_STRATEGY.md](RESPONSIVE_STRATEGY.md) | Breakpoints |
| [PWA_IMPLEMENTATION.md](PWA_IMPLEMENTATION.md) | Service worker, install, offline |
| [REALTIME_IMPLEMENTATION.md](REALTIME_IMPLEMENTATION.md) | Socket handling |
| [AUTHENTICATION_IMPLEMENTATION.md](AUTHENTICATION_IMPLEMENTATION.md) | Clerk integration, role gating |
| [PAYMENTS_IMPLEMENTATION.md](PAYMENTS_IMPLEMENTATION.md) | Stripe on the client |
| [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md) | Screen → endpoint. Cited from hooks. |
| [SCREEN_TO_COMPONENT_MAPPING.md](SCREEN_TO_COMPONENT_MAPPING.md) | Screen → component |
| [API_CONTRACT_RECONCILIATION.md](API_CONTRACT_RECONCILIATION.md) | Frontend↔backend contract drift inventory |

## Feature and roadmap documents (root)

| Document | Label | Note |
|---|---|---|
| [FRONTEND_FEATURE_INVENTORY.md](FRONTEND_FEATURE_INVENTORY.md) | Current | What exists on the client |
| [FRONTEND_IMPLEMENTATION_ROADMAP.md](FRONTEND_IMPLEMENTATION_ROADMAP.md) | **Historical** | M0–M10, all delivered. Superseded as a *plan* by the audit roadmap. |
| [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) | **Superseded** | → `audit/2026-08-marketplace-spec/FINAL_IMPLEMENTATION_CHECKLIST.md` |
| [LAUNCH_READINESS.md](LAUNCH_READINESS.md) | **Superseded** | → `audit/2026-08-marketplace-spec/PRODUCTION_READINESS_REPORT.md` |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Current | Measured bundle + Lighthouse baseline (roadmap 5.2). The numbers were run, not estimated. |
| [VISION_GAP_ROADMAP.md](VISION_GAP_ROADMAP.md) | **Historical** | Phases A–F, all shipped. |
| [MAP_REDESIGN_SPECIFICATION.md](MAP_REDESIGN_SPECIFICATION.md) | Current | Phase 1 shipped; Phases 2–7 deferred and still the plan of record for the map. |

## Business platform (root, 5 files)

**Current.** The vendor-archetype/module design.

[BUSINESS_PLATFORM_VISION.md](BUSINESS_PLATFORM_VISION.md) ·
[BUSINESS_MODULE_SYSTEM.md](BUSINESS_MODULE_SYSTEM.md) ·
[BUSINESS_CATEGORY_MATRIX.md](BUSINESS_CATEGORY_MATRIX.md) ·
[BUSINESS_REGISTRATION_REDESIGN.md](BUSINESS_REGISTRATION_REDESIGN.md) ·
[BUSINESS_IMPLEMENTATION_ROADMAP.md](BUSINESS_IMPLEMENTATION_ROADMAP.md) (Historical — delivered)

## Landing page (root, 12 files)

**Current.** The marketing site's specification set, prefixed `LANDING_PAGE_*`. The prelaunch→live
switch is a single env var; see [LANDING_PAGE_IMPLEMENTATION_ROADMAP.md](LANDING_PAGE_IMPLEMENTATION_ROADMAP.md).

`STRATEGY` · `INFORMATION_ARCHITECTURE` · `USER_JOURNEY` · `SECTION_BREAKDOWN` ·
`COMPONENT_SPECIFICATION` · `HERO_SPECIFICATION` · `3D_INTERACTIONS` · `ANIMATION_SPECIFICATION` ·
`RESPONSIVE_GUIDE` · `ACCESSIBILITY` · `IMPLEMENTATION_ROADMAP` · `CHECKLIST`

---

## Rule for adding a document

Add a row here in the same commit. A document not in this index is invisible within a month, and an
index that lags the folder is worse than none — it makes a stale document look vouched-for.
