# StreetServe — Landing Page Information Architecture

> The complete section order, content hierarchy, navigation model, and link map for the landing page. Ordering is conversion-optimized per [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §5; per-section content detail lives in [LANDING_PAGE_SECTION_BREAKDOWN.md](LANDING_PAGE_SECTION_BREAKDOWN.md).

---

## 1. Page skeleton (final order)

The brief's 23-section list has been consolidated to **14 rendered sections** — several requested sections are merged where separating them would dilute the narrative or duplicate content (rationale per merge below). Nothing from the brief is dropped; everything is placed.

| # | Section id | Name | Narrative beat | Merged from brief |
|---|---|---|---|---|
| 0 | `nav` | Navigation bar | persistent | Navigation |
| 0b | `banner` | Announcement banner | persistent (dismissible) | Announcement Banner |
| 1 | `hero` | **Hero — the living map** | Wonder | Hero + Interactive 3D Map Experience + Live Activity Preview (the hero *is* the interactive map with live activity — splitting them would demote the page's signature asset to a mid-page demo) |
| 2 | `social-proof` | Launch metrics strip | Wonder → Belief bridge | Interactive Statistics (part 1) + Partners (logo strip teaser) |
| 3 | `how-it-works` | How StreetServe works — Find · Earn · Grow | Comprehension | How StreetServe Works |
| 4 | `features` | Core features (interactive grid) | Belief | Core Features + Marketplace & Services |
| 5 | `map-showcase` | Real-time map showcase (scroll-driven demo) | Belief (peak) | Real-Time Map Showcase |
| 6 | `benefits` | Who it's for (role tabs: Customers / Vendors / Sellers & Businesses) | Belonging | Why Choose + Benefits for Customers + Vendors + Businesses (four separate stacked sections = 4 viewport-heights of "not for me" for ⅔ of readers; tabs let each visitor self-select in one viewport) |
| 7 | `impact` | Community & impact — "See good, do good" | Belonging | Success Stories (Shelter Program framing) |
| 8 | `testimonials` | Voices from the street | Trust | Testimonials + Success Stories (quotes) |
| 9 | `trust` | Security & trust | Trust | Security & Trust + Pricing note (fee transparency lives here — StreetServe has no SaaS pricing table pre-launch; transparent fee-split language replaces "Pricing") |
| 10 | `partners` | Partners & sponsors | Trust | Partners & Integrations |
| 11 | `faq` | FAQ | Trust (objection handling) | FAQ |
| 12 | `cta` | Final CTA — claim your spot (map returns + pre-registration) | Action | Download App / CTA + Interactive Statistics (live "#-in-line" counter) |
| 13 | `footer` | Footer (incl. newsletter) | — | Footer + Newsletter (newsletter as a footer block, not its own section — pre-launch, "notify me at launch" in the pre-reg form already captures the same intent; a separate newsletter section would compete with the primary conversion) |

**Ordering rationale (conversion logic):**
- Metrics strip (#2) sits immediately under the hero because social proof is most persuasive at the moment of maximum curiosity, before comprehension effort is asked of the visitor.
- The scroll-driven map showcase (#5) comes *after* the feature grid: features name the mechanics, the showcase proves them in motion — claim → evidence.
- Role benefits (#6) sit past the midpoint deliberately: by then the visitor understands the platform and can self-identify, which makes the role-tagged CTA click far more qualified.
- FAQ (#11) is last-before-CTA: it's the objection-clearing step adjacent to the commitment moment.

## 2. Content hierarchy rules

- **One H1 on the page** (hero headline). Each section has exactly one H2 (`aria-labelledby` target), sub-blocks use H3. No heading-level skips.
- **Eyebrow → headline → support → proof → action** is the internal order of every section: a 12px uppercase eyebrow label (section context), H2 (the claim), one short support paragraph (≤ 2 sentences), the interactive/visual proof, then at most one CTA.
- **Copy budgets:** hero headline ≤ 8 words; H2s ≤ 7 words; support paragraphs ≤ 40 words; feature-card body ≤ 20 words. If a section needs more words, it needs a better visual.
- Numbers use tabular figures (`docs/06 §2.3`); money and percentages always show the "why" nearby (trust-transparency rule, `docs/06 §1`).

## 3. Navigation model

### 3.1 Top nav (sticky)
- **Left:** StreetServe wordmark (links to `#hero` / scroll-top).
- **Center (≥1024px):** anchor links — How it works · Features · Who it's for · FAQ. Anchor-scroll with `scroll-margin-top` compensating for the sticky bar; active-section highlighting via IntersectionObserver.
- **Right:** "Sign in" (tertiary, → `/sign-in`) + **"Get early access"** (primary button, → opens pre-registration).
- Behavior: transparent over the hero (glass token at 0 elevation), gains `--surface-glass` background + hairline border after 24px of scroll. Height 64px desktop / 56px mobile. Hides on scroll-down / reveals on scroll-up on mobile only.
- **Mobile:** wordmark + primary CTA + hamburger → full-screen sheet menu (anchor links + Sign in), using the product `Sheet` primitive at full snap.

### 3.2 Announcement banner
- Single line above/below nav (below on mobile): "🚀 Launching first in Modesto, CA — pre-register to be first in line." Dismissible (persisted in `localStorage`), status-colored left edge per `docs/06 §2.6d` Banner spec. Content driven by launch-state config.

### 3.3 Persistent mobile CTA
- After the visitor scrolls past the hero, a compact bottom-docked CTA bar (glass surface, safe-area padded) appears on <640px: "Get early access →". Disappears while the pre-registration sheet is open and within the final CTA section (no duplicate primaries in one region).

## 4. Link map (every route the page touches)

| From | To | Type |
|---|---|---|
| Nav "Sign in" | `/sign-in` | existing auth route |
| Primary CTA (all instances) | Pre-registration wizard (modal/sheet on-page; `?register=1` deep-linkable) | on-page flow |
| Hero secondary CTA "Explore the live map" | `/map` (live) or interactive demo scroll-target `#map-showcase` (pre-launch) | conditional |
| Vendor section CTA | Pre-registration with `role=vendor` preselected | on-page flow |
| Seller section CTA | Pre-registration with `role=seller` preselected | on-page flow |
| Impact section "Partner with us" | `mailto:`/contact form (open question: partner contact channel — flag to client) | external |
| Footer legal | `/terms`, `/privacy` (must exist before launch — currently unbuilt; tracked in roadmap) | new routes |
| Footer product links | `/map`, `/welcome`, `/vendor/register`, `/hub/register` | existing routes |

## 5. Pre-registration flow IA (the conversion surface)

Rendered as a bottom sheet (mobile) / centered modal (desktop) over the page — the visitor never leaves the landing context (WizardFlow pattern, `COMPONENT_LIBRARY.md §3`).

- **Step 1 — Who are you?** Role selector as 4 large cards: Find food & services near me (Customer) · I run a mobile business (Vendor) · I want to earn by selling (Street Seller) · I have inventory or a location (Hub/Partner). Sponsor intent routes to the partner contact instead of the form.
- **Step 2 — Claim your spot.** Name, email, phone (optional, labeled optional), city/area (default "Modesto, CA", editable), launch-notification opt-in (checked). One tap to submit.
- **Confirmation:** "You're **#N** in line in {city}." + share action ("Ping your squad" — pre-written share text, native share API) + "Explore the demo map" link. The share step turns every conversion into a ping-mechanic preview.
- Data contract: matches `preregistrations` (`docs/08`): full_name, email, phone?, intended_role, city, created_at.

## 6. Footer IA

Four columns (stack on mobile): **Product** (Live map, How it works, For vendors, For sellers) · **Company** (About/mission, Partners, Contact) · **Legal** (Terms, Privacy, Community guidelines) · **Stay in the loop** (newsletter email capture + social icons). Bottom row: wordmark, © line, launch-city line, theme toggle (the marketing page respects the same dark/light system as the product, dark default).
