# StreetServe — Landing Page User Journey

> The emotional and behavioral journey through the page, per persona, with the intended state change at each beat and the exit ramps. Section anatomy: [LANDING_PAGE_SECTION_BREAKDOWN.md](LANDING_PAGE_SECTION_BREAKDOWN.md). Strategy: [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md).

---

## 1. The master journey (all personas)

```
arrive → WONDER → COMPREHENSION → BELIEF → BELONGING → TRUST → ACTION → share
         (hero)   (how it works)   (features/  (role tabs/  (security/  (pre-reg)
                                    showcase)    impact)      faq)
```

| Beat | Visitor's internal state | What the page must do | Failure mode to design against |
|---|---|---|---|
| **0–5s · Wonder** | "What is this?" | Living map answers it visually before a word is read; headline confirms it | Map reads as decoration, not product → visitor files it as "another app site" |
| **5–20s · Comprehension** | "How does it work? Which part is for me?" | Metrics strip legitimizes; Find·Earn·Grow triad names the three doors | Jargon (consignment, ping-chain) before plain verbs |
| **20–60s · Belief** | "Is this real / would it actually work?" | Feature micro-demos + scroll-driven showcase *show* wave-down, queue discounts, ping-chain working | Static screenshots that could be mockups |
| **1–2min · Belonging** | "This is for people like me" | Role tabs mirror the visitor's identity back; impact section gives the mission halo | Making one audience (customers) the hero and others an afterthought |
| **2–3min · Trust** | "What's the catch? Is my money/data safe?" | Verified-payouts language, verification tiers, transparent splits, FAQ kills specific objections | Vague "bank-level security" boilerplate |
| **3min+ · Action** | "Fine — what do I do?" | Map returns zoomed to *their* city; #-in-line counter creates scarcity-with-honesty; 2-step form | A long form, or a CTA that restates features instead of the payoff |
| **Post-conversion · Share** | "I want my people on this" | Confirmation screen's "Ping your squad" share = first taste of the core mechanic | Dead-end thank-you page |

## 2. Persona-specific paths

### 2.1 Maria — Convenience Customer (arrives via a friend's shared link, on a phone, likely at night)
- **Scroll path:** hero (taps a pin, sees the profile card pop) → metrics → How-it-works "Find" panel → skims features, stops on **line-up discount** micro-demo → benefits tab already on "Customers" (default) → FAQ ("Is it free?") → converts via sticky mobile CTA.
- **Key moments:** the pin she taps should show a *food* vendor with a "Live · 3 in line · 15% off next spot" chip — the entire value prop in one tap. Dark theme matches her nighttime context (dark is default).
- **Time to convert:** 60–90s. She should never need the showcase section to convert; it's reinforcement.
- **Exit ramp risk:** slow map on mobile → she bounces. Mitigation: poster-first loading, lightweight mobile hero variant ([LANDING_PAGE_RESPONSIVE_GUIDE.md](LANDING_PAGE_RESPONSIVE_GUIDE.md) §3).

### 2.2 Deshawn — Mobile Vendor (arrives from a vendor Facebook group, desktop or tablet, skeptical)
- **Scroll path:** hero (watches 10s — notices the *vendor-side* queue counter on a pin) → jumps via nav to "Who it's for" → Vendors tab → reads queue management, Pop-Up mode, ping-budget reach → checks Security & trust (payouts, fees) → FAQ ("What does it cost me?", "Do I need a license?") → converts with `role=vendor`.
- **Key moments:** the Vendors tab must lead with **money and time** ("fewer wasted stops, reward your regulars, reach without ad spend" — his exact frustrations, `docs/02` P2), and show a real dashboard visual (from `docs/design/v-01` reference). Fee transparency is his trust gate — show the split, don't hide it.
- **Exit ramp risk:** page feels consumer-only → he assumes vendors are the product being sold. Mitigation: a vendor pin's POV appears in the hero simulation itself (a wave-down request arriving and being accepted).

### 2.3 Angela — Street Seller (arrives from a "make money today" search or TikTok, on a phone, guard fully up)
- **Scroll path:** hero → How-it-works "Earn" panel → **stops hard on the anti-risk line: "You owe nothing until you sell — return anything unsold for $0."** → benefits Sellers tab (3-step consignment visual, AI-assisted coaching mention) → impact section (this tells her the platform respects people in her position) → FAQ ("Do I need money to start?", "What if nothing sells?") → converts with `role=seller`.
- **Key moments:** her single conversion lever is risk-removal, stated early and repeated at the CTA. "AI-assisted guidance" is framed as a coach in her corner, not surveillance. Copy must never smell like an MLM pitch — no income claims, no "up to $X/day."
- **Exit ramp risk:** scam-pattern matching ("no capital needed" is also scam language). Mitigation: the mechanics are explained concretely (reserve → pick up → sell → auto-split payout), the Trust section shows *how* the money flows, and the Shelter-Program partnership signals institutional legitimacy.

### 2.4 Sponsor / Hub / Press (arrives deliberately, desktop, evaluative)
- **Scroll path:** hero (judges craft quality in 5 seconds) → skims everything → partners section → demo link → contact.
- The page's *polish level itself* is the conversion surface for this group. The demo entry (`/map`) must be prominent enough for them to find without a hunt (hero secondary CTA).

## 3. Scroll choreography as emotional pacing

- **Hero → metrics:** the map hands off motion to the counters (count-up animation) — energy transfers rather than stops.
- **How-it-works:** pace slows; one concept per viewport-third; generous whitespace = comprehension space.
- **Showcase:** pace peaks — the scroll-driven wave-down sequence is the page's cinematic climax ([LANDING_PAGE_ANIMATION_SPECIFICATION.md](LANDING_PAGE_ANIMATION_SPECIFICATION.md) §4).
- **Impact & testimonials:** pace drops to its calmest — human faces, quiet motion, longer dwell.
- **Final CTA:** energy returns (map + glow + counter) but the form itself is still and simple. Excitement gets them to the form; calm gets them through it.

## 4. Return-visitor & state-aware behavior

- Dismissed banner stays dismissed (localStorage). A returning visitor who completed pre-registration sees the hero CTA swap to "You're in line — #N in {city}" + "Ping your squad" share (localStorage flag from the confirmation step; server truth not required pre-launch).
- Deep links: `/?register=1` opens the wizard directly (for ads/social); `/#how-it-works` etc. scroll with sticky-nav offset.
- `?role=vendor|seller` (for targeted campaigns) preselects the wizard role *and* switches the benefits tab default.

## 5. Journey instrumentation map

Each beat has one canonical event (defined in [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §10). The funnel dashboard reads: `landing_view → hero_map_interact → section_view:how-it-works → section_view:benefits → prereg_start → prereg_complete:{role}`. Drop-off between `benefits` and `prereg_start` is the primary optimization surface post-launch (copy/CTA experiments); drop-off before `how-it-works` is a hero/performance problem, not a copy problem.
