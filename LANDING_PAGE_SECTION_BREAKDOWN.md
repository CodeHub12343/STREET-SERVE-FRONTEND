# StreetServe — Landing Page Section Breakdown

> Per-section anatomy: purpose, content, copy direction, visuals, and CTAs — in final page order per [LANDING_PAGE_INFORMATION_ARCHITECTURE.md](LANDING_PAGE_INFORMATION_ARCHITECTURE.md). Hero detail lives in [LANDING_PAGE_HERO_SPECIFICATION.md](LANDING_PAGE_HERO_SPECIFICATION.md); motion detail in [LANDING_PAGE_ANIMATION_SPECIFICATION.md](LANDING_PAGE_ANIMATION_SPECIFICATION.md); component contracts in [LANDING_PAGE_COMPONENT_SPECIFICATION.md](LANDING_PAGE_COMPONENT_SPECIFICATION.md).
>
> All copy below is **recommended draft copy** — final wording is a client sign-off item. Copy rules (AI language, license claims, payout claims) from [LANDING_PAGE_STRATEGY.md](LANDING_PAGE_STRATEGY.md) §6 are binding.

---

## 0. Navigation + Announcement banner

Specified in IA doc §3. Components: `MarketingNav`, `AnnouncementBanner`.

---

## 1. Hero — "The living map" (`#hero`)

- **Purpose:** communicate *live, map-based, happening-now* in under 5 seconds; capture the primary CTA click.
- **Layout (desktop):** full-viewport (100svh) interactive 3D map as the canvas; content column overlaid left (max 560px) on a soft scrim gradient; floating simulated-activity cards rise from map events on the right two-thirds. Mobile: content stacks above a 55svh map panel (see responsive guide).
- **Copy (draft):**
  - Eyebrow: `● LIVE — the mobile economy, on the map` (pulsing live dot)
  - H1: **"Your city is open for business. Right now."** (alt: "The street just got a map.")
  - Support: "StreetServe puts every food truck, mobile pro, and street seller on one live map — wave them down, skip the line with early-bird discounts, or start earning today with zero inventory of your own."
  - Trust line (under CTAs, 13px): "Launching first in Modesto, CA · Backed by Wonder Ice · Free for customers"
- **CTAs:** Primary "Get early access" · Secondary (outline) "Explore the live map ↗".
- **Map content:** see hero spec — animated vendor pins (business logos in status rings per `docs/06 §2.5`), a wave-down request/accept vignette, a queue filling with discount chips, a ping-chain ripple, Block Party cluster glow. "Simulated preview" caption chip bottom-right (honesty rule).
- **Success test:** screenshot the hero, show it to someone for 5 seconds — they should say "it's a live map of vendors near you."

## 2. Launch metrics strip (`#social-proof`)

- **Purpose:** legitimacy at the moment of peak curiosity; bridge wonder → comprehension.
- **Layout:** one slim band (`--surface-raised`), 3 stat tiles + sponsor mark. Count-up animation on first reveal (tabular numerals).
- **Content:** `{N} pre-registered` (live from API) · `Launching first: Modesto, CA` · `{N} local sponsors & partners` · Wonder Ice logo lockup "National launch partner."
- **Rule:** real numbers only. If a count is embarrassingly small pre-launch, show the launch-city line + sponsor lockup and omit the count (config-driven) — never inflate.

## 3. How StreetServe works (`#how-it-works`)

- **Purpose:** three doors, three verbs — let every visitor find their door in one viewport.
- **Layout:** eyebrow "HOW IT WORKS" + H2 **"Find it. Earn from it. Grow with it."** Three panels (desktop: 3-col; mobile: vertical stack), each an illustrated mini-scene using the map visual language (not stock photos):
  1. **FIND** (customer) — mini-map with a pin and a wave gesture. "See who's live near you, wave them down, and lock an early-bird discount by getting in line first."
  2. **EARN** (seller) — inventory card → map → payout receipt micro-diagram. "Reserve products from local businesses with nothing upfront. Sell on the live map. Return what doesn't sell for $0. Get paid automatically." *(the anti-anxiety promise, verbatim priority from `docs/06 §1`)*
  3. **GROW** (vendor) — pin with a queue and a ping-ripple. "Broadcast where you are, turn your line into loyalty with tiered discounts, and let customers ping your next customers."
- Each panel has a tertiary link ("For customers →" etc.) that jumps to the corresponding `#benefits` tab.

## 4. Core features (`#features`)

- **Purpose:** prove depth — this is a platform, not a single gimmick. Belief through micro-demos.
- **Layout:** H2 **"Built for the street."** Bento grid (desktop 12-col: 2 large + 4 medium + 2 small cells; mobile: single column, large cells first). Every card contains a live micro-demo (CSS/SVG animation, not video), a name, and ≤20 words.
- **Cells (8):**
  | Card | Micro-demo | Copy hook |
  |---|---|---|
  | **Wave Down** (large) | pin receives a hand-wave signal, route line draws to the customer | "See a vendor moving? Wave. They come to you or drop a stop." |
  | **Line-Up Discounts** (large) | queue dots fill; discount chips 15%→10%→5% claimed in order | "The earlier you line up, the less you pay. Vendors set the cap." |
  | **Ping Your Squad** | ripple radiates pin→friends; a tip coin lands | "Forward the alert. If your ping brings a buyer, you earn the tip." |
  | **Block Party** | 3 pins converge; glow radius blooms | "When vendors cluster, the whole neighborhood gets the alert." |
  | **Consignment Selling** | product card → checkmark → split receipt | "Sell real products with zero upfront cost. Split the profit automatically." |
  | **Smart Seller Assistant** | recommendation card slides in with a 'why' line | "Smart suggestions on what to sell and where — it gets sharper as the street does." |
  | **Gifting & Spot Me** | gift card hand-off animation | "Buy for a friend to redeem — or spot someone now, they pay it back later." |
  | **Scheduling** | calendar chip snaps onto a pin | "Book the mobile groomer for Tuesday. Reminders included." |
- Marketplace breadth line under the grid: category chip row (Food · Coffee · Detailing · Grooming · Beauty · Repairs · Handmade · +90 more) — echoes the product's category tabs (`docs/06 §2.5a`).

## 5. Real-time map showcase (`#map-showcase`)

- **Purpose:** the cinematic climax — one full wave-down story told by scroll.
- **Layout:** full-width pinned scene (~300vh scroll length, map stays pinned while scroll drives the story). Left rail: 4 step captions that activate in sequence; the map animates each beat.
- **Story beats (scroll-driven, spec in animation doc §4):**
  1. "Tacos El Rey goes live" — pin appears, status ring turns Driving-green, starts moving along a route.
  2. "Maria waves them down" — wave signal arcs from a customer dot; vendor accepts; route redraws toward her; ETA chip counts down.
  3. "The line forms — early birds win" — queue dots populate; discount ladder chips get claimed 15/10/5%.
  4. "One tap to pay. Everyone's square." — receipt card slides up: base − discount + round-up tip, split shown transparently.
- H2 above scene: **"Watch a wave-down happen."** Caption chip: "Simulated preview."
- Fallback (mobile/reduced-motion/no-WebGL): the same 4 beats as a swipeable card carousel with static renders ([LANDING_PAGE_RESPONSIVE_GUIDE.md](LANDING_PAGE_RESPONSIVE_GUIDE.md) §4).

## 6. Who it's for (`#benefits`)

- **Purpose:** identification + qualified CTA clicks.
- **Layout:** H2 **"Which one are you?"** SegmentedControl tabs: **Customers · Vendors · Sellers · Businesses & Hubs** (default from `?role=` param, else Customers). Each tab: 3 benefit rows (icon + bold claim + one line) + a device-frame visual from the corresponding product surface + role CTA.
  - **Customers:** never miss a truck again (proximity alerts) · pay less for showing up first · one tap to tip, gift, or spot a friend. CTA: "Join the waitlist" (primary).
  - **Vendors:** fewer wasted stops — see where demand actually is · turn your line into loyalty (tiered discounts, Pop-Up mode) · reach without ad spend (ping-to-ping, Block Party). Visual: vendor dashboard queue view. CTA: "List your business" (`role=vendor`).
  - **Sellers:** start with $0 inventory cost · smart guidance on what to sell and where · fast, automatic payouts as you sell. Trust-ladder chip (Bronze→Silver→Gold) with one-line "grow your access as you build trust." CTA: "Start earning" (`role=seller`).
  - **Businesses & Hubs:** your products, a street-level salesforce · real-time view of where inventory moves · become a pickup hub, earn on every checkout. CTA: "Supply the street" (`role=hub`).
- Only the active tab's CTA renders primary-filled (one-primary rule).

## 7. Community & impact (`#impact`)

- **Purpose:** the mission halo — differentiates StreetServe from pure-commerce competitors; critical trust signal for Angela-type visitors and press.
- **Layout:** quieter visual register — deep surface, generous spacing, the tagline's only appearance: H2 **"See good, do good."**
- **Content:** the Shelter Partner Program explained with dignity in ~60 words (verified partners, training, starter inventory, a real path to income — no poverty imagery, no exploitation-adjacent framing); a nonprofit/hub vignette ("Grace Community Church turns donations into local income"); "Partner with us" tertiary CTA.
- **Copy rule:** describe the program as *infrastructure* ("an on-ramp"), never charity theater. No fabricated impact numbers pre-launch — describe the design intent ("built with shelter partners from day one").

## 8. Voices from the street (`#testimonials`)

- **Purpose:** human proof.
- **Pre-launch reality:** there are no real user testimonials yet. **Do not fabricate them.** Pre-launch variant: pull-quotes from real pilot participants/sponsors/partners if available, else replace with "Founding vendor" spotlight cards (real early-registered vendors, with permission) or collapse this section entirely (config flag) until real quotes exist. Post-launch: 3 rotating quote cards (photo, name, role chip, city) — one per persona.
- **Layout:** 3-card row / mobile swipe carousel; quiet motion (slow auto-advance, pauses on hover/focus/interaction).

## 9. Security & trust (`#trust`)

- **Purpose:** clear the money objection; this platform moves real dollars.
- **Layout:** H2 **"Real money moves here. We treat it that way."** 4 trust tiles + a transparent fee-split diagram.
  - **Verified payouts** — "Payments processed by Stripe. Funds split automatically the moment a sale settles." (escrow/Connect model, `docs/01 §7.3`)
  - **Verified people** — "Tiered ID verification — Bronze to Gold. More trust unlocks more access." 
  - **Transparent splits** — interactive receipt: slider or fixed example showing seller share / owner share / platform fee on a $20 sale. "You always see the split before you commit."
  - **Disputes handled** — "A real resolution process with evidence, timelines, and humans — not a black hole."
- Fee transparency here **replaces a pricing table** pre-launch (no public fee schedule is final yet — `docs/11` open question; the diagram uses an "example split" label).

## 10. Partners & sponsors (`#partners`)

- H2 **"Backed by people who believe in the street."** Sponsor logo row (Wonder Ice lead lockup + local sponsors), shelter/nonprofit partner marks, "Become a launch sponsor →" tertiary CTA. Grayscale logos, brand color on hover. Real logos only, with permission.

## 11. FAQ (`#faq`)

- H2 **"Fair questions."** Accordion (one open at a time, deep-linkable `#faq-{slug}`), 8 questions serving all personas:
  1. Is StreetServe free? (customers: yes; vendors/sellers: fee on transactions, shown before you commit)
  2. What cities do you cover? (Modesto first, pre-register to vote your city next)
  3. Do I need money to start selling? (no upfront inventory cost; return unsold items for $0)
  4. What if nothing sells? (return window, $0 owed, honest framing)
  5. Do vendors need a license? (depends on category & city; onboarding walks you through what your category requires — *the compliant answer, per `docs/01 §6`*)
  6. How fast do I get paid? (automatic split on settlement; new accounts may have a short hold while verification completes — honest)
  7. How does the wave-down work? / Is my location shared? (approximate until you engage; vendors control broadcast; link to privacy)
  8. Is the AI actually AI? ("Smart, rules-first recommendations that get sharper as more people sell — we'd rather under-promise." — the FR-9.4-compliant answer, turned into a trust asset)
- FAQPage JSON-LD structured data.

## 12. Final CTA (`#cta`)

- **Purpose:** commitment. The map returns — zoomed toward the visitor's approximate city (IP-level, no permission prompt; fallback Modesto) with soft pin glow.
- **Layout:** full-width band, map as backdrop at 40% dim, centered content: H2 **"Claim your spot on the map."** Sub: "You'll be **#{next}** in line{, in {city}}." Inline 2-step pre-registration (or button opening the wizard on mobile). Under form: "Free to join · No spam · First wave gets founding-member perks" (perks = client confirmation item).
- App-store badges appear here **post-launch only** (PWA install guidance pre-launch: "Works on any phone — no app store needed", which is a genuine PWA advantage worth saying).

## 13. Footer (`#footer`)

- Per IA doc §6: 4 columns + newsletter capture + social; bottom row with wordmark, ©, launch-city line, theme toggle. Newsletter submit reuses the pre-registration email endpoint with `intended_role: null` semantics or a dedicated list (backend decision — flagged in roadmap).

---

## Cross-section rules

1. **One primary-filled CTA per viewport region**, everywhere (`docs/06 §2.6a`).
2. **The map motif appears exactly three times** (hero, showcase, final CTA) — more dilutes it, fewer breaks the narrative spine.
3. Every claim with a number gets a source or an "example" label. Every AI mention says "smart"/"AI-assisted."
4. Every section works with JS disabled: content and CTAs are server-rendered; animation is enhancement.
