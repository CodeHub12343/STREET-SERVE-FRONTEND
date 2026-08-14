# StreetServe — Screen Design Specifications

Per-screen interaction specs accompanying the high-fidelity mockups in [design/](design/). One section per approved screen, in the order designed. Source of truth for tokens/components: [06-ux-and-design-system.md](06-ux-and-design-system.md); behavior: [03-user-flows.md](03-user-flows.md).

---

## C-10 — Map Home

**Template:** MapShell · **Mockup:** [design/c-10-map-home.html](design/c-10-map-home.html) (artifact) · **Status:** awaiting approval

### Layout regions (top → bottom)
1. **Status bar** — system.
2. **Map header** — search field (44px, pill, `--surface-raised`) + category tab row (All / Food / Coffee / Services / Shopping / More). Header sits over the map with a `--surface-base` fade so pins scrolling beneath never collide with text. Tabs scroll horizontally; active tab inverts (text-primary fill).
3. **Map canvas** — themed basemap (§2.6h), user location dot (accent-secondary, 8px halo), business pins, Serve Near Me FAB, recenter button.
4. **Bottom tab bar** — Map · Favorites · Orders · Messages · Profile; active item in `--accent-secondary`; 78px incl. home-indicator padding.

### Pin spec
- 48px circle, business logo (moderated upload, §2.5), 3px status ring: Driving `--status-driving` (+2.4s pulse), Parked `--status-parked`, Away/Closed `--status-away` (+50% desaturation, 75% opacity).
- ETA chip below pin: travel-time ("2 min"), tabular numerals; Away pins show "Closed" instead.
- Driving pins animate position from live socket updates (≤3s latency per FR-1.2); interpolate between ticks, snap under `prefers-reduced-motion`.
- Density rule: pins within ~40px screen distance collapse into a cluster pin (count badge); cluster variant designed with C-17 Block Party.

### Interactions
| Trigger | Behavior |
|---|---|
| Tap pin | C-14 sheet opens at **peek** snap (§2.6f): logo, name, status chip, rating + count, ETA, primary CTA + Directions. Pull up → half/full profile. |
| Primary CTA in peek | **Wave Down** (accent-primary) when Driving/Parked → C-18. When Away/Closed → **Notify Me** (one-off alert, Flow 2b). |
| Tap category tab | Filters pins with 200ms fade; selection persists across sessions (FR-1.3). "More" pushes C-13 category browser. |
| Tap search | Pushes C-11 search results overlay. |
| Serve Near Me FAB | Recenters on user + refreshes results; confirmation toast. *(Pending client confirmation on broader "broadcast request" meaning — flagged in user-flows §2.)* |
| Recenter button | Same recenter, no refresh. |
| Long-press map | No action at MVP (reserved). |

### States
- **Loading:** skeleton circles at expected pin geometry (§2.6e), header interactive immediately. No spinner.
- **Empty:** actionable card — "Nothing moving near you yet" + Widen radius / See scheduled (per the empty-state-as-sales-tool UX rule).
- **Error (location denied):** banner (§2.6d) pinned under header: "Turn on location to see who's near you" + Settings deep-link; map falls back to city-level view of the user's declared home area.
- **Offline:** cached last-known pins rendered at 60% opacity with "as of X min ago" banner (NFR graceful degradation).

### Accessibility
- Every pin is a button: `aria-label` = "{name}, {category}, {status}, {eta}". List view (C-12) reachable from a header affordance — full functional parity.
- Status never color-only: ring color + chip text + desaturation for Away.
- Focus order: search → tabs → pins (nearest first) → FAB → tab bar. Focus ring per §2.6j.

### RN implementation notes
- Map: Mapbox GL RN (or MapLibre) with custom dark/light styles; pins as custom annotation views, not map symbols, so status rings/pulse stay in the RN styling system.
- Pin positions from the `/live` socket namespace subscription scoped to the visible bounding box (Architecture §9 geohash bucketing).
- Category tabs read from `categories.top_level_tab`; persist selection in local storage.

---

## C-14 — Business Profile Sheet

**Template:** SheetStack · **Mockup:** [design/c-14-business-profile.html](design/c-14-business-profile.html) (artifact) · **Status:** awaiting approval

### Snap points (§2.6f)
| Snap | Height | Content | Chrome |
|---|---|---|---|
| **Peek** | ~150px | Logo, name, status chip, rating, ETA + Wave Down/Directions — identical to what C-10 established | Drag handle |
| **Half** | ~56% | Adds 16:9 cover (status badge overlaid), overlapping 72px logo, action row, queue/discount card, Today's Special. Clipped, not scrollable | Drag handle |
| **Full** | Edge-to-edge | Everything: About/hours/location rows, menu preview (3 items + View full → C-15), photo gallery, reviews (aggregate + cards) | Handle hidden; compact header (close chevron + name + status dot); body scrolls |

Sticky CTA bar (Wave Down primary + Order secondary) persists at every snap, floating over content with a surface-gradient fade. Dismiss: scrim tap or drag-down from half; full requires the header close.

### Status-adaptive rules (single source of truth)
One status value drives five surfaces simultaneously — this is the screen's core design rule:
| Surface | Driving | Parked | Away/Closed |
|---|---|---|---|
| Cover | full color | full color | 55% desaturated |
| Chip | green "Driving" | blue "Parked" | violet "Closed" |
| Location line | "Heading your way — near Main St & 5th Ave" | "Parked — Main St & 5th Ave" | "Closed — opens tomorrow 10 AM" |
| Queue card | visible | visible | **hidden** (never show a queue that can't be joined) |
| Primary CTA / Order | Wave Down / enabled | Wave Down / enabled | **Notify Me** / disabled |

Today's Special dims but stays visible when Closed — it's tomorrow's reason to return.

### Queue & discount card
- Shows live queue count + tier ladder: consumed tiers struck through at 45% opacity, the customer's would-be tier highlighted in `--status-discount` violet, vendor cap as final rung.
- Copy is possessive and time-bound ("you'd be 4th", "locks in 15% off") — surfaces the line-up engine (FR-3) *before* commitment, which is the FOMO mechanic doing its job.
- Data: `GET /queues/:businessId` (queue state + discount schedule).

### Action row
- Four equal buttons: **Directions** (deep-link to native maps at live location) · **Follow** (toggles in place, filled state = following, feeds Favorites — Flow 2b) · **Notify Me** (one-shot, confirmation toast, no persistent button state — deliberately a different interaction shape than Follow so users learn the distinction) · **Message** (opens scoped thread, C-33).
- 44px icon circles, `--accent-secondary`; pressed/active state fills the circle.

### States
- **Loading:** skeleton at half snap — cover block, identity row, three text rows (§2.6e).
- **Error (business went offline mid-view):** banner "Taco Loco just went offline" + sheet degrades to Away treatment; CTA swaps to Notify Me.
- **Empty menu:** menu section collapses to "Menu coming soon"; Order hidden (wave-down remains).
- **Empty reviews:** "No reviews yet — be the first" with transaction-gated composer note.

### Accessibility
- Sheet is `role="dialog"`; focus moves into the sheet on open, returns to the source pin on dismiss.
- Snap changes announced via `aria-live` ("Profile expanded").
- Ladder rungs carry full text labels ("First customer discount, 5%, already taken").
- All rows ≥44px touch targets; compact header close is 36px visual in a 44px hit area.

### RN implementation notes
- Use a gesture-driven sheet library (e.g., `@gorhom/bottom-sheet`) with the three snap indices; the mockup's segmented control simulates gestures.
- Status changes arrive on the `/live` socket — the five status-driven surfaces should derive from one store selector, never be set independently.
- Reviews list virtualizes beyond the two preview cards; "See all" pushes C-16.

---

## C-18 / C-19 / C-20 — Wave Down & Queue Journey

**Templates:** SheetStack (C-18) → full-screen states (C-19) → TabPage-style detail (C-20) · **Mockup:** [design/c-18-20-wave-queue.html](design/c-18-20-wave-queue.html) (artifact, walkable end-to-end with simulation controls for every branch) · **Status:** awaiting approval

Designed as one package because they form a single commitment escalator (Flow 2, steps 8–10; FR-2, FR-3): confirming costs nothing, waiting is cancellable, and only the queue has something to lose (a locked discount tier) — so the "leave" action gets progressively quieter across the three screens (never a red button, always ghost/text styled) rather than visually escalating, which would wrongly suggest leaving is dangerous.

### C-18 — Wave-Down Request Confirm
- SheetStack over a map preview showing the vendor pin and the user's location pin, so the spatial context that justifies the request is visible while confirming it.
- Fields: location confirm (editable via "Adjust"), optional note (freeform, low-emphasis field).
- **Promise block** — states both guarantees *before* the user commits: the 5-minute SLA (FR-2.2) and the discount tier they'd lock in (FR-3.3) if accepted. This is deliberate: the two things a customer needs to know to decide are shown, not buried in copy after the fact.
- Primary CTA: **Send Wave** → C-19 Waiting.

### C-19 — Wave Active (three sub-states)
| Sub-state | Trigger | Content | Exit |
|---|---|---|---|
| **Waiting** | Wave sent | Pulsing vendor glyph (concentric ring animation, collapses under reduced motion), live countdown from 5:00 in tabular numerals, single ghost "Cancel wave" action | Vendor responds → Accepted / Declined / Expired |
| **Accepted** | Vendor accepts | Map with a dashed route line (decorative, not real routing), sticky card: vendor identity, locked discount chip, live ETA, Message + View Line actions | Vendor arrives → joins C-20 queue automatically |
| **Declined / Expired** | Vendor declines, or countdown hits 0 | Empathetic empty-state card (reason shown if vendor provided one) + explicit "nothing was charged" reassurance + one-tap alternate-vendor suggestion (nearest Driving/Parked pin) | Re-wave the alternate → back to Waiting, or Back to map |

Countdown never turns alarming (no red) until the exact expiry moment — anxiety-inducing color creep on a 5-minute wait would make customers abandon waves early, working against the wave-down mechanic's whole purpose.

### C-20 — Queue Status (two sub-states)
- **In Line:** giant tabular-numeral position + ordinal ("4th"), a dot rail (served dots faded, the user's dot rendered larger in `--status-discount` violet — legible at a glance, outdoors, one-handed), locked-discount restated ("locked at join" — reassures against any doubt introduced by people leaving ahead), vendor ETA, "now serving #" ticket counter, and the passive 15-minute geofence hold notice (FR-3.4) stated as ambient information, not an action the user must take.
- **Pop-Up delay banner** (§2.6d style): appears in place when the vendor transitions Driving→Parked with this queue active (FR-4.1) — always pairs the delay explanation with the reassurance that spot and discount are unaffected, in the same sentence, never split across two messages a user could read only the first half of.
- **Your Turn:** full-bleed confirmation (checkmark, "You're up!", restated savings) — this is a terminal state for the flow, single "Got it" action returns to the map. Discount applies automatically at the transaction (C-22); this screen never shows a redemption code, since FR-3.4/FR-11 make the discount a server-side ledger fact, not something the user has to prove.

### Cross-screen states
- **Empty/error at C-18:** location permission denied → same banner pattern as C-10, blocks Send Wave until resolved.
- **Network drop during Waiting:** banner "Reconnecting…" with the countdown paused (not silently continuing against a stale local timer) — resumes from server truth once reconnected.
- **Leaving the queue:** confirmation-free (single tap + toast, not a modal) — per the graduated-quietness rule above; the toast explicitly states the tier was released, so there's no ambiguity about what leaving costs.

### Accessibility
- Countdown and position announce via `aria-live="polite"` on change, not every tick.
- Pop-Up banner and terminal "Your Turn" state both fire a push notification + haptic in addition to the in-app UI, since a customer may not have the app foregrounded during a multi-minute wait.
- Alternate-vendor suggestion card meets the same 44px target and full-label accessibility as map pins (C-10).

### RN implementation notes
- All timers (SLA countdown, ETA, queue position) are **server-authoritative** (FR-2.2, FR-3.2) — the client renders a countdown derived from a server-supplied deadline timestamp, never a client-started `setInterval` as source of truth (the mockup's local timer is a simulation stand-in only).
- Queue state, Pop-Up events, and acceptance all arrive on the `/queue/:queueId` and `/notifications/:userId` socket namespaces (API doc §3); no polling.
- Push notification payloads for "vendor accepted," "Pop-Up delay," and "you're up" should be able to deep-link directly into C-19/C-20 from a backgrounded app.

---

## C-21 / C-22 / C-23 / C-24 — Order, Payment & Receipt

**Templates:** TabPage (cart), SheetStack-style payment sheet, TabPage (tracking), TabPage (receipt) · **Mockup:** [design/c-21-24-order-payment-receipt.html](design/c-21-24-order-payment-receipt.html) (artifact, context toggle + error simulation) · **Status:** awaiting approval

### Two entry contexts, shared screens
These four screens serve **two different journeys** that converge here:
| Context | Entry point | Cart discount | Post-payment |
|---|---|---|---|
| **At the Window** | C-20's queue resolution ("Your Turn") | Line-up discount applied, framed as the payoff for having waited | Straight to **C-24 Receipt** — no tracker, since the line already was the wait |
| **Order Ahead** | Direct Order from a menu (Flow 2d), no prior queue | No discount by default | Full **C-23 pipeline** (pending → accepted → ready), since the vendor hasn't seen or acted on this order yet |

This is a deliberate simplification: rather than one generic order screen with every possible field always visible, the screen set reads the entry context and shows/hides the discount row and the tracker accordingly — a customer arriving from the window is never shown a meaningless "waiting for vendor to accept" step for an order the vendor already knows about.

### C-21 — Order Review (Cart)
- Item list with quantity steppers (from C-15 menu selections), "+ Add more items" returns to menu.
- **Queue-context card**: restates *why* a discount is present ("You joined as 4th in line") immediately above the line-item breakdown — prevents the discount from reading as an unexplained coupon.
- Tip row: No tip / Round-up (pre-selected default, matching FR-6.4's opt-in-by-default framing from the source material) / Custom.
- Itemized rows: subtotal → discount (violet, only in queue context) → tip → **Total**, all in tabular numerals so the arithmetic is visually checkable.
- Primary CTA states the total on the button itself ("Continue to payment · $18.00") — no surprise amount at the next step.

### C-22 — Payment Sheet
- Saved payment methods as a radio list (card, StreetServe Wallet balance, add new); Stripe Payment Sheet in production replaces the "Add payment method" row.
- Total restated at the top of the sheet and on the Pay button — the amount appears three times total across C-21/C-22 (cart total, sheet total, button) by design, since this is the one place in the app where a mismatch would break trust instantly.
- **Processing:** a genuine spinner (not a skeleton) — per §2.6e this is the sanctioned exception, since it's a blocking financial submission where a skeleton would misrepresent "there is no result yet" as "content is loading."
- **Decline:** explicit "nothing was taken — your order is held, not lost," retry-with-different-method or cancel; never silently retried (mirrors the reassurance pattern from C-19's decline/expiry states).

### C-23 — Order Tracking (Order Ahead context only)
- Vertical stepper: Order placed (done) → vendor acceptance (active, glowing) → Preparing → Ready for pickup, mapped directly to `orders.status`.
- Large ETA readout up top restates plain-language state ("Sit tight" / "7 min" / "Ready") rather than making the user parse the stepper to know what to do next.
- **Cancellation mid-flow** (business goes Away/Closed, item unavailable, or vendor declines): stepper is replaced by a cancellation card with a specific reason and an explicit no-charge statement — never leaves the stepper frozen with no explanation.
- Cancel-order action available throughout, styled secondary (not danger) since cancelling a not-yet-accepted order is a normal, low-stakes action.

### C-24 — Receipt Detail
- **Saved-amount banner** ("You saved $3.15 by being customer #4") appears only in queue context, using the exact figure carried through from C-20/C-21 — never recalculated or re-worded at this final step.
- Itemized breakdown mirrors the cart exactly; a **collapsed "Where this goes" disclosure** satisfies FR-11.3's fee-split transparency requirement (vendor payout / platform fee / tip) without putting a bare "platform fee" line in the customer's primary total, which would read as a surprise charge. This is a deliberate reading of FR-11.3: full transparency, one tap away, not front-loaded onto the headline number.
- Star-rating entry point at the bottom, gated to this post-transaction moment only (review-manipulation rule, Security §4) — pushes into C-16's full composer on selection.

### States (all four screens)
- **Loading:** skeleton rows for cart/tracking/receipt content (§2.6e); payment processing is the sole spinner exception (above).
- **Empty cart:** shouldn't be reachable (C-21 is only entered with ≥1 item), but if reached via back-navigation edge case, redirects to the menu rather than showing a blank total.
- **Network drop during payment:** payment sheet shows a retry banner rather than silently re-submitting — pairs with the idempotency-key requirement below.

### Accessibility
- Tabular numerals throughout so screen-reader and low-vision users get consistent digit alignment across cart/payment/receipt.
- Stepper announces the active step via `aria-live` on state change only, not on every render.
- Disclosure element uses native `<details>/<summary>` for built-in keyboard and screen-reader support rather than a custom expand/collapse.

### RN / backend implementation notes
- **Idempotency key required on the Pay action** (API §16) — a retried tap after a network blip must never double-charge; this is invisible in the UI by design and must be enforced server-side regardless of client behavior.
- Tracking steps subscribe to order-status push/socket events, not polling; cancellation reason text comes from the same `cancelled_reason` field used in the vendor dashboard (Database §3) so customer and vendor never see contradictory explanations.
- The three-times-repeated total (cart/sheet/button) should be computed once server-side per FR and passed through, not independently recalculated at each screen client-side, to eliminate any chance of the numbers drifting.

---

## S-01 / S-02 / S-03 / S-04 / S-05 / S-06 — Seller Onboarding & First Checkout

**Templates:** WizardFlow (S-01, S-02, S-05, S-06) · MapShell variant (S-03) · SheetStack-style detail (S-04) · **Mockup:** [design/s-01-06-seller-onboarding-checkout.html](design/s-01-06-seller-onboarding-checkout.html) (artifact, walkable end-to-end with a Standard/Shelter-Cosigned path toggle) · **Status:** awaiting approval

This package opens the seller-mode design track — the first screens with no shared DNA with the customer app's map/queue/order patterns, since the underlying job (reserve someone else's inventory, sell it, return what's left) is structurally different from anything in C-10–C-24.

### S-01 — Seller Intro ("Earn Today")
- Hero pitch + three concrete capability statements (reserve without buying, AI guidance, automatic payout) — no jargon ("consignment," "trust score") in the pitch itself, since this screen's job is conversion, not education.
- **Standalone highlighted "$0 cost if unsold" block**, not folded into body copy — direct implementation of the UX doc's "reduce first-sale anxiety" rule (§1): this is the single sentence most likely to overcome a first-time seller's hesitation, so it gets its own visual weight.
- Secondary entry point ("I'm coming from a shelter partner") sits below the primary CTA at equal visual prominence to the pitch, not buried in a menu — treats the Shelter Program as a first-class front door per FR-12, not an edge case bolted onto standard onboarding.

### S-02 — Verification Wizard (two paths, one destination)
- Persistent tier strip (Bronze/Silver/Gold) stays visible through every step so a seller always sees what unlocks next, addressing FR "explainable" framing applied to verification, not just AI (trust should never feel opaque anywhere in this product).
- **Standard path:** ID upload → selfie liveness → bank link, gated to at least Bronze before checkout is possible (Flow 1b).
- **Shelter-Cosigned path** (toggle above the phone in the mockup): replaces the ID/bank steps entirely with an in-person staff-verifier step — no KYC documents requested from the resident at all. Same 3-step wizard shape, different step content, same destination (a working seller account). This directly implements the Q4 recommended default: shelter liability capped to the specific cosigned allocation, verification burden shifted to the shelter's in-person process rather than demanded of someone who may lack a stable address or ID.
- Both paths write into the same `verification_records` table (Database §3) — the wizard's job is to route to the right verification_type, not to create a parallel account system.

### S-03 — Discover Inventory
- MapShell variant with **rounded-square "hub" pins** — deliberately distinct from C-10's circular business pins, so a seller never mistakes a consignment hub (a place to pick up inventory) for a live customer-facing vendor (a place customers wave down). This distinction matters because a seller is frequently both a customer and a seller in the same session.
- Bottom sheet lists nearby hubs with category, item count, and distance — category tabs here are product-type based (Crafts/Clothing/Toys/Books), a different taxonomy than C-10's business-category tabs, since sellers browse products, not businesses.

### S-04 — Product / Consignment Detail
- Leads with the seller's own economics — split %, return window, declared value, quantity available — ahead of any marketing description, because this is a work decision a seller is making, not a purchase decision a customer is making. Order of information deliberately inverted from C-14's business profile.
- **Seller Agreement checkbox gates the Reserve button** (disabled until checked) — this is where the bailment liability model (Q2 recommended default, FR-8.6) surfaces concretely: "I'm responsible for this inventory's declared value until it's sold or returned," presented exactly at the moment it becomes operative, not as boilerplate signed days earlier during account creation.

### S-05 — Reservation Confirm
- Quantity stepper displays a **live "potential earnings" figure** recalculated on every tap (qty × declared value × split %) — ties physical effort directly to payoff, reinforcing the S-01 pitch at the exact moment commitment is being decided.
- Pickup-window slot picker (today/tomorrow options) + hub address, mirroring the WizardFlow single-focus-per-step pattern from onboarding.

### S-06 — QR Checkout (pickup) + Success
- Camera-viewfinder metaphor with a scanning animation (collapses to a static frame under reduced motion) rather than a generic "upload" flow — checkout happens standing at a physical counter, so the screen should read as "point your phone at this," not "attach a file."
- **Three-item checklist** (hub code scanned → condition photo captured → quantity confirmed) builds visible confidence that all three FR-8.2 capture requirements actually happened, rather than a single opaque "processing" spinner that leaves the seller unsure what was recorded.
- **Success screen restates the return deadline and zero-cost framing one more time** — the S-01 promise needs to still be visibly true at the moment it starts to actually matter (a live return-by date, not an abstract policy).

### States (package-wide)
- **Empty S-03:** no hubs within radius → suggests widening radius or checking Jobs instead (per Flow 7's empty state), consistent with the "empty state as sales tool" rule.
- **Verification rejected (S-02):** clear reason + re-submit, account stays at the prior tier in the interim (Flow 1's error state) — never silently stuck.
- **Reservation conflict (S-05):** if quantity becomes unavailable between browsing and confirming (another seller reserved it first), shows a specific "only 3 left" correction rather than a generic error, and offers to adjust quantity in place.
- **QR scan failure (S-06):** manual hub-code entry fallback after 2 failed scan attempts — camera/lighting conditions at a physical counter are not fully controllable.

### Accessibility
- Tier strip and checklist both carry full text labels, not just icon/color state (colorblind-safe, consistent with the platform-wide status rule).
- Camera viewfinder screen provides a manual entry fallback as a first-class control, not a hidden option, since a scanning-only flow would be inaccessible to a seller who cannot reliably aim a camera.

### RN implementation notes
- ID/selfie steps proxy directly to the KYC provider SDK (Persona/Stripe Identity per Architecture §5) — the app never stores or transmits the raw document itself, only initiates the provider flow and polls/receives a webhook-driven status.
- QR scan writes an `inventory_checkouts` row (product_id, seller_id, hub_id, quantity, condition_photo_url, checked_out_at, expected_return_at) per Database §3 — the checklist states in the mockup map directly to which of those fields have been captured.
- Shelter-Cosigned path's staff-verifier step should support an offline-capable code/PIN entry, since shelter facilities may have inconsistent connectivity (per the offline-tolerant seller checkout recommendation in Feature Breakdown's Recommended Additions).

---

## S-07 / S-08 / S-09 / S-10 — My Inventory, Log a Sale, Return & Settlement

**Templates:** TabPage (S-07), WizardFlow-style single-focus forms (S-08, S-09), TabPage detail (S-10) · **Mockup:** [design/s-07-10-inventory-sale-return-settlement.html](design/s-07-10-inventory-sale-return-settlement.html) (artifact, oversell guard + return reconciliation both simulatable) · **Status:** awaiting approval

Completes the loop opened by S-01–S-06: this package covers everything that happens between walking out of a hub with inventory and getting paid for what sold.

### S-07 — My Inventory
- Each active checkout is a card: thumbnail, remaining-quantity fraction, a progress bar, and a **traffic-light deadline chip** (green "3 days" → amber "6h" → red overdue) — reuses the same three-tier urgency color language the rest of the system applies to business status (driving/parked/away), now applied to time pressure instead of location state, so the visual grammar stays consistent even though the meaning shifts.
- "Browse nearby inventory" stays visible even with active checkouts — a seller isn't gated from picking up a second product line while the first is still out, matching the real economics of street selling (diversify what you're carrying).
- Two direct actions per active item (Log a sale / Return unsold) rather than requiring a drill-in to a detail screen first — these are the two things a seller does dozens of times per checkout, so they're one tap from the list.

### S-08 — Log a Sale (FR-8.3)
- Quantity stepper with a live gross-total readout, the same "concrete number, not abstract" pattern as S-05's potential-earnings calculator.
- Sale method: in-app checkout or manual entry + photo (for cash/off-app sales) — both still require proof, since FR-8's chain-of-custody requirement doesn't relax just because a sale happened outside the app's own checkout flow.
- **Oversell guard**: a plain-language banner naming the exact held quantity ("Only 4 totes are checked out to you") rather than a generic validation error — the goal is instant comprehension of *why* the block exists, not an accusatory tone. The Confirm button disables client-side as a UX courtesy; **the actual enforcement boundary is server-side** (see implementation notes).

### S-09 — Return Flow
- The reconciliation card **computes the returning count for the seller** (checked out − sold = returning) instead of asking them to self-report a number — this removes an entire class of honest arithmetic mistakes rather than trusting a seller to subtract correctly under time pressure at a counter.
- "✓ Accounts for all 6" is the reassurance state once scan + reconciliation agree; a mismatch (e.g., a seller scans in fewer units than the math implies) surfaces a specific correction prompt, not a dead-end block — since a real mismatch could mean a lost/damaged item, which is a dispute-flow entry point (Flow 7 failure state), not necessarily fraud.
- Same camera-viewfinder scan metaphor as S-06's pickup checkout — one learned interaction pattern covers both check-out and check-in, reducing what a seller has to learn twice.

### S-10 — Settlement Breakdown
- Net payout leads in the same large-green-number treatment used for customer savings elsewhere in the app (C-20/C-24) — framed as an earning moment, not an accounting statement, even though the content is a financial ledger entry.
- **Full fee split is itemized directly and unhidden** — gross → platform fee → hub share → net — a deliberate contrast with C-24's collapsed "Where this goes" disclosure for customers. The asymmetry is intentional: this settlement *is* the seller's own business record (their income, their consignment terms), not incidental trivia the way a fee breakdown is for a customer buying tacos, so it doesn't need to be tucked behind a disclosure.
- Trust Score renders as a ring **plus an explicit delta reason** ("+3 · on-time return"), never a bare number — direct implementation of FR-10.1's explainability requirement, consistent with how AI recommendations also always carry a "why" (FR-9.1).
- Payout timing restates the seller's verification tier (Bronze/Silver/Gold) and an actual arrival date, not just a policy statement — ties back to the tier system introduced in S-02.

### States
- **Empty S-07:** no active checkouts → "Nothing checked out right now" + direct link to Discover Inventory (S-03), consistent with the empty-state-as-sales-tool rule applied throughout.
- **S-08 zero remaining:** if a seller has already sold everything, Log a Sale is unreachable from S-07 (button hidden, only Return/View remains) rather than reachable-then-blocked.
- **S-09 damaged/lost items:** condition photo capture flags visible damage → routes to the dispute flow (Flow 7 failure state, Database `disputes` table) rather than silently accepting a full-value return.
- **S-10 dispute-pending settlement:** if a dispute is open against this checkout, settlement shows a "Pending dispute resolution" state instead of a final number — FR-10.3 requires Trust Score and payout finality to wait for resolution, never pre-empt it.

### Accessibility
- Deadline urgency chips carry full text ("Due in 6h"), never color-only.
- Reconciliation arithmetic is presented as labeled rows with a screen-reader-friendly summary sentence ("Accounts for all 6"), not just implied by three numbers stacked visually.

### RN / backend implementation notes
- S-08's confirm action calls `POST /checkouts/:id/sales`; the server rejects any quantity exceeding the checkout's remaining balance regardless of what the client already blocked (API §9, DB validation rules) — client-side guards are a courtesy, never the actual boundary.
- S-09's return writes `inventory_returns` and triggers `settlements` computation (Database §3) — the reconcile numbers shown in the UI are read from the same source the server bills from, so they cannot drift from the actual charge.
- Settlement rows are immutable once written (Database §7) — any correction after the fact appears as a new offsetting entry, never an edit to S-10's displayed numbers, which is why the design never offers an "edit settlement" action anywhere in this package.

---

## S-11 / S-12 / S-13 / S-14 — AI Assistant, Sales Coaching, Earnings & Jobs

**Templates:** custom stacked-card deck (S-11), ConversationView (S-12), TabPage (S-13), TabPage + terminal check-in state (S-14) · **Mockup:** [design/s-11-14-ai-coaching-earnings-jobs.html](design/s-11-14-ai-coaching-earnings-jobs.html) (artifact) · **Status:** awaiting approval

Closes out the seller-mode design track opened by S-01. These four screens are where the "AI Seller Assistant" pitched in S-01 actually shows up, plus the two places a seller checks in on how they're doing (Earnings) and what to do when there's nothing to sell nearby (Jobs).

### S-11 — AI Assistant Feed
- **Stacked-card deck showing exactly one recommendation at a time**, next card peeking behind — direct implementation of the UX doc's progressive-disclosure principle (§1: "don't front-load sellers with dashboards full of predictive numbers on day one"). "See all recommendations" is available but never the default view.
- Every card carries a **concrete, falsifiable "Recommended because" line** ("3 sellers averaged $40+ there last month, and it's 0.6 mi from your usual spot") — satisfies FR-9.1's explainability requirement with specifics, not a vague "AI thinks you'd like this."
- Header badge reads **"Smart · gets better with data"** — the Q6-mandated copy convention carried from the roadmap doc's recommended default, applied here at the literal point where a seller could otherwise be misled into expecting a fully trained model on day one.
- Dismiss/Accept both advance the deck; a dismissed recommendation is stated to not resurface ("you won't see this one again") rather than silently reappearing, which would erode trust in the assistant faster than an occasional bad suggestion would.

### S-12 — Sales Coaching
- **Objection picker, not a free-text or voice input** — FR-9.3 specifies scripted responses keyed to logged objection categories, explicitly not live conversation transcription. The screen must never look like it's listening to the actual customer interaction, both for privacy and because that capability doesn't exist.
- AI suggestion bubble is visually distinct (accent-tinted, badged "AI suggestion") from the customer's quoted objection — this is coaching content pulled from a maintained library, not a chat transcript, and the two must never be visually confusable.
- Content ties the coaching back to the specific product/hub context (mentions the totes' maker story) — generic sales tips would be worse than no coaching at all for a first-time seller trying to build genuine rapport.

### S-13 — Earnings Dashboard
- Weekly total leads in the same large-number treatment used for settlement (S-10) and customer savings (C-24/C-20) — one consistent "the number that matters comes first" pattern across the entire product, regardless of which side of the marketplace is looking at it.
- **Payout history mixes consignment settlements and Jobs gigs in a single feed** — a seller's income doesn't conceptually split by product line, so the ledger doesn't force an artificial separation the seller would have to mentally reconcile themselves.
- The weekly sparkline is a real filled-bar chart with the peak day emphasized, not a decorative flourish — it's the one data-visualization moment in seller mode and gets the same design attention as any other chart the product ships (per the dataviz principle of giving charts real care, not treating them as afterthoughts).

### S-14 — Jobs (list, detail, check-in/out)
- Positioned explicitly as **the AI assistant's fallback answer** when S-03's inventory discovery comes up empty ("nothing to sell nearby? try a gig instead," per Flow 9's empty state) — Jobs isn't a separate product, it's the seller's other way to earn today.
- Flat-fee framing (a plain dollar amount per card) is a deliberately different mental model from consignment's per-unit math — a seller comparing "$45 flat" against "70% of $14 units" shouldn't have to do algebra to compare opportunities.
- **Check-in is geofence-confirmed**, not a manual "I'm here" toggle a worker could trigger from anywhere — matches the Jobs check-in/check-out requirement and protects the integrity of same-day gig payouts.

### States
- **S-11 empty:** no recommendations available (e.g., brand-new seller with no data yet) → falls back to a generic "getting started" tip card rather than an empty deck, since a seller's very first session is exactly when a blank AI feed would undercut the S-01 pitch most.
- **S-12 no matching objection:** "See more objections" expands the picker rather than dead-ending on the four most common categories shown by default.
- **S-13 empty history:** first-week sellers see a "Your first payout will appear here" state rather than a blank chart, consistent with the empty-state-as-sales-tool rule.
- **S-14 gig cancelled after acceptance:** worker notified immediately with compensation-per-policy messaging (Flow 9's failure state) rather than the check-in screen silently going stale.

### Accessibility
- Deck cards are keyboard-navigable (Dismiss/Accept reachable via tab, not swipe-only) — a swipe-gesture-only interaction would exclude users who can't perform that gesture.
- Objection picker buttons carry full text labels (not icon-only), and the AI bubble is announced distinctly from the quoted customer line via `aria-label` prefixes ("AI suggestion:" vs. "Customer said:").
- Sparkline bars include an accessible data table equivalent (not shown in the mockup, required at implementation) per the general chart-accessibility principle.

### RN / backend implementation notes
- S-11 recommendations come from `GET /ai/recommendations/products` and `/locations` (API §13); `reason_summary` is a **required, non-nullable field** on every `ai_recommendations` row (Database §3) — the UI has no fallback copy path for a recommendation without one, which is intentional: it should be impossible to ship an unexplained recommendation.
- S-12 posts the objection category to `POST /ai/sales-coaching` and renders the returned scripted response verbatim — no on-device generation or paraphrasing, so the content stays centrally maintainable and auditable.
- S-14 check-in/out calls `POST /jobs/:id/check-in` and `/check-out` (API §11), gated on device geofence; check-out is what triggers payout processing into the S-13 earnings feed.

---

## C-26 / C-27 — Booking Flow & Detail

**Templates:** WizardFlow (C-26, three steps) · TabPage-style detail with branching state cards (C-27) · **Mockup:** [design/c-26-27-scheduling.html](design/c-26-27-scheduling.html) (artifact, vendor propose/cancel simulation) · **Status:** awaiting approval

Completes the third core customer transaction type alongside Wave Down (spontaneous, C-18–20) and Direct Order (pickup now, C-21–24). Booked against a mobile service business (Detail Boss, mobile detailing) rather than a food truck, since scheduling matters most for services people plan around in advance, not impulse stops.

### C-26 — Booking Flow (three single-focus steps)
1. **Service select** — business mini-header + service list (name, duration, price), single selection. Same step-dot header pattern as S-02's verification wizard — one shared multi-step convention across the entire design system, customer and seller side alike.
2. **Slot picker** — horizontal day strip + time grid. **Unavailable times render struck-through rather than being hidden** — a customer should see the shape of the vendor's full schedule (what's busy vs. open), not wonder why 1 PM simply isn't listed.
3. **Review & confirm** — summary rows (service/when/where/price), a recurring-booking toggle **off by default**, and an explicit reminder-policy line before the final confirm tap. The toggle being off-by-default matters: a one-time booking must never silently become a recurring commitment.

**"Where: We'll come to you"** is stated plainly in the review step — the single biggest structural difference between booking a mobile service and a normal storefront appointment, so it's surfaced explicitly rather than left implicit.

**Confirmation screen** states two distinct completed actions — "Added to calendar" and "Reminders set" — as separate chips, not one vague "you're all set," directly reflecting FR-7.2's two specific reminder commitments (24h and 1h).

### C-27 — Booking Detail
Models all three vendor responses named in FR-7.1 as distinct card states, not a binary confirmed/cancelled:
| State | Trigger | Content |
|---|---|---|
| **Confirmed** | Default | Service, time, business mini-card, green status chip |
| **Vendor proposed alternate time** | Vendor can't make the slot | Amber card stating the new proposed time, with **Accept** or **Pick another time** — the decision returns to the customer, never auto-accepted on their behalf |
| **Cancelled by vendor** | Vendor cancels | Red card pairing the cancellation with a concrete compensation offer (e.g., 15% off rebooking) in the same card — directly implements Flow 6's edge-case requirement that vendor cancellation come with "potential compensation... discount on rebook," never a bare apology with no next step |

- **Reminder list shows sent vs. pending explicitly with real timestamps** ("Sent yesterday" / "Sends at 10:30 AM") — makes the confirmation screen's reminder promise independently verifiable after the fact rather than a claim the customer has to take on faith.
- Reschedule routes back into C-26's slot-picker step (pre-filled), not a separate flow — reduces the system's total surface area by reusing the exact same time-selection UI already established.
- Cancel is ghost-danger styled (text, not a filled button) consistent with the "leave actions get quieter as commitment increases" rule established in the wave-down journey — cancelling a booking ahead of time is a normal, low-stakes action, not one requiring a scary confirmation.

### States
- **No availability:** slot picker shows all times struck-through for the visible date range with a "Try another day" prompt rather than an empty grid.
- **No-show (from vendor's side):** referenced here for completeness — vendor marks no-show from their dashboard (V-07), which becomes a Trust Score input on the customer per Flow 6's edge case; not a customer-facing screen state in this package.
- **Booking day arrives:** per Flow 6, day-of pre-authenticates the customer and skips the general queue by default (vendor-configurable) — this connects to the standard wave-down/arrival pattern from C-18–20 rather than introducing a fourth parallel flow.

### Accessibility
- Step dots carry an `aria-current` equivalent state, and step transitions announce via `aria-live` ("Step 2 of 3: pick a time").
- Struck-through/disabled time slots retain full-text labels and `aria-disabled`, never relying on strikethrough styling alone to convey unavailability.
- The recurring toggle is a native-pattern switch (role="switch", keyboard-operable via Space/Enter) rather than a custom checkbox reskinned to look like a toggle.

### RN / backend implementation notes
- Booking writes to `bookings` (Database §2): `scheduled_at`, `status`, `recurrence_rule`, `reminder_sent_24h`/`reminder_sent_1h` — the detail screen's reminder list is a direct read of those two boolean fields, not independently tracked client-side state.
- Vendor propose-alternate and cancellation are status transitions initiated from the vendor's Bookings Calendar (V-07); this screen is the customer-facing mirror of whichever transition the vendor triggers, not an independent state machine.
- Recurring bookings (`recurrence_rule` populated) generate future `bookings` rows via a scheduled job, each independently reschedulable/cancellable — a customer cancelling one occurrence must never silently cancel the whole series.

---

## C-31 / C-32 / C-33 — Favorites & Messages

**Templates:** TabPage (C-31, C-32) · ConversationView (C-33) · **Mockup:** [design/c-31-33-favorites-messages.html](design/c-31-33-favorites-messages.html) (artifact, empty states and live-status simulation) · **Status:** awaiting approval

Completes the Follow / Notify Me / Message mechanics first introduced on C-14's action row (Flow 2b/2c).

### C-31 — Favorites
- Each row reuses the **exact status ring + chip vocabulary from C-10/C-14** (driving/parked/away-closed) — a customer scanning Favorites should recognize the same visual language as the map, not learn a second status system for what is functionally a filtered view of the same live world.
- A business transitioning to Driving gets a **subtle ping animation** on its avatar (simulate via "Taco Loco goes Driving" in the mockup) — a quieter echo of the map pin's pulse (C-10), reinforcing that Favorites is live, not a static saved-list.
- **Genuine empty state**, not a placeholder — most customers will see this screen before they've followed anything, so it needs to sell the Follow action ("Follow a business from their profile to see live status updates here") rather than just saying "nothing here."

### C-32 — Messages
- Unread threads **bold the preview text and show a solid accent dot**, more assertive than a typical muted "new message" badge — a business reply is often time-sensitive ("yes, we have that in stock today"), so the visual weight should reflect that urgency.
- **"You: " prefix** on the preview line when the customer sent the last message — lets someone tell "I'm waiting on them" from "they're waiting on me" without opening the thread, which matters because these are quick transactional exchanges, not ongoing conversations someone re-reads for pleasure.
- Empty state mirrors C-31's pattern: sells the Message action rather than describing its absence.

### C-33 — Message Thread
- **Persistent context banner** ("Asking about: Taco Loco — Main St & 5th Ave") pinned above the conversation — constantly reinforces that this is a scoped business-inquiry thread, not an open-ended chat, directly implementing the narrow-scope rule from Flow 2c (menu/hours/location questions, not a general social DM feature).
- **Quick-reply chips** (What time until? / Take card? / Specials today?) front-load the most common question categories — most of these exchanges are a single question and answer, so the composer shouldn't force everyone to type from scratch every time.
- "Usually replies in minutes" is an expectation-setting statement, **not a hard SLA** — deliberately distinct from the wave-down journey's literal 5-minute countdown (C-19), since messaging isn't time-boxed the way a live wave-down request is, and the two shouldn't be confused.

### States
- **C-31/C-32 empty:** both are first-class sell states (button back to the map), not dead ends — consistent with the empty-state-as-sales-tool rule applied throughout the product.
- **Thread with a closed/away business:** composer stays enabled (a customer can still ask "what time do you open Monday?"), but the context banner reflects current status so the customer isn't confused about response timing.
- **Blocked/reported thread** (moderation): not modeled in this mockup, but the spec requires a report/block entry point in the thread's header overflow menu, consistent with the rate-limiting/moderation requirement in Security §4.

### Accessibility
- Status chips retain full text labels ("Driving," "Parked," "Closed") alongside color/ring, consistent with the platform-wide never-color-only rule.
- Unread state is conveyed by both the bold weight and the dot, not the dot alone, for compatibility with high-contrast/no-color modes.
- Quick-reply chips are fully keyboard-navigable and appended to the composer as regular sent messages — no hidden behavior different from typing the same text manually.

### RN / backend implementation notes
- C-31 reads `GET /users/me/favorites` (API §4a); status updates arrive via the same `/live` socket subscription C-10 uses, scoped to just the followed business IDs rather than a full bounding box — a lighter-weight subscription than the map screen's.
- C-32/C-33 back onto `message_threads` / `messages` (Database §1) and the `/messages/:threadId` socket namespace (API §3) for live delivery — no polling for new messages.
- Quick-reply chips are static, client-defined suggestions, not AI-generated — a deliberately simpler mechanism than S-12's AI coaching library, since this is a lightweight FAQ shortcut, not a coaching feature.

---

## V-01 / V-02 / V-04 / V-05 / V-06 — Vendor Dashboard, Part 1: Core Operating Loop

**Template:** DashboardShell (first web-first package — sidebar + topbar + content area) · **Mockup:** [design/v-01-06-vendor-dashboard-part1.html](design/v-01-06-vendor-dashboard-part1.html) (artifact, responsive sidebar demo + live kanban/queue interactions) · **Status:** awaiting approval

Vendor dashboard is split into two packages (12 screens total) the same way the seller track was split into three. Part 1 covers registration and the four screens a vendor touches constantly while operating; Part 2 (not yet designed) will cover Bookings, Messages, Ping Sharing, Giveaways, Analytics, and Payouts.

### Responsive behavior (§2.6i, demonstrated live)
Sidebar: full width with labels (≥1280px) → icon-only rail (1024–1279px) → fully hidden behind a hamburger drawer (<1024px). KPI grids and the order kanban both reflow from 3 columns to 1 at the same breakpoints, so content never feels cramped purely because the sidebar collapsed. This is the first screen package to exercise the dashboard grid spec at all — it should be the reference implementation for every other web dashboard screen (V-part-2, Hub, Admin).

### V-01 — Vendor Registration Wizard
- **The license/compliance gate is surfaced inline the moment a regulated category is selected**, not discovered later when the vendor tries to go live — direct implementation of the `requires_license`/`regulated_by` category metadata (Database §1) and the Roadmap Q1 recommended default (regulated categories gated at MVP). Selecting "Food Truck" immediately shows the permit-upload requirement in context.
- Three-step wizard (business info → category & compliance → Stripe Connect onboarding), same step-indicator convention used everywhere else multi-step flows appear (S-02, C-26).

### V-02 — Live Status Control (the vendor's home screen)
- **Three KPI cards lead** (current queue, pending wave-downs, orders in progress) — answers "what needs me right now" before anything else, since this is the screen a vendor checks dozens of times per shift, not a general summary dashboard.
- Status toggle uses the **identical three-state model** (Driving/Parked/Away-Closed) as the customer-facing map (C-10) — one shared vocabulary on both sides of the same feature, never a vendor-specific status language that could drift out of sync with what customers see.
- **Pop-Up Mode is a single explained switch, not a fourth status option** — matches the Database doc's decision to model Pop-Up as a transition event/flag rather than a stored status value; the copy explains the customer-facing consequence directly ("notifies your active queue you're staying put longer than expected") rather than using internal terminology.

### V-04 — Queue Management
- **Position and discount columns are never editable** — they render server-authoritative queue state (FR-3.2) as read-only; a vendor can serve customers out of strict order operationally (real life isn't always orderly), but can never alter whose discount tier applies by clicking anything in this table.
- "Serve" is deliberately the only per-row action — the design keeps the vendor's queue interface narrow on purpose, since the actual discount/position enforcement is a server guarantee this screen only visualizes, never controls.

### V-05 — Order Queue (Kanban)
- **Three columns map directly to `orders.status`** (pending → accepted → ready, plus a completed/cancelled exit not shown as a column) — no vendor-invented intermediate states that could ever drift from what the customer sees on their own C-23 tracker.
- Accept/Mark Ready actions in the mockup move cards and update counts live, mirroring exactly the real-time update a customer would see simultaneously on their tracking screen — this dual-visibility is the actual point of the shared status enum.

### V-06 — Menu Manager
- **Today's Special is exclusive** — setting a new item as the Special visually replaces the prior one rather than allowing multiple simultaneous selections, matching `businesses.today_special_menu_item_id` being a single nullable foreign key (Database §1), not a list.
- Availability toggle is independent from the Special flag — an item can be available-but-not-featured, or (edge case) featured-but-marked-unavailable if it's about to sell out and the vendor wants to keep the listing visible without accepting new orders for it.

### States
- **V-01 permit rejected:** clear reason + re-upload, vendor blocked from Driving/Parked (stuck at Away/Closed equivalent) until approved — mirrors the seller verification rejection pattern (S-02).
- **V-04 empty queue:** "No one in line right now" with the discount schedule still visible for reference, not hidden.
- **V-05 empty columns:** each kanban column shows its own light empty state ("Nothing new" / "Nothing preparing") rather than the whole board looking broken when one column is empty.
- **V-06 zero menu items:** blocks Direct Order entirely for that business (a business must have ≥1 menu item before Order becomes available to customers) with a clear prompt to add the first item.

### Accessibility
- Sidebar icon-rail state (tablet width) retains `aria-label`s equivalent to the hidden text labels — icon-only must not mean unlabeled.
- Kanban cards are keyboard-operable via their action buttons (Accept/Decline/Mark Ready), not drag-and-drop-only, since drag interactions are frequently inaccessible without a keyboard/switch-device equivalent.
- Queue table rows carry full text for discount and position, consistent with the platform-wide never-color-only rule.

### RN / web implementation notes
- V-01's permit upload posts to `license_documents`; the server — not this UI — blocks a `live_sessions` status change to Driving/Parked until that row's `status = approved` (Database §7 validation rules), consistent with the client-vs-server enforcement pattern established across the seller screens (S-08's oversell guard, S-09's reconciliation).
- V-02, V-04, and V-05 all subscribe to the same socket namespaces the customer app uses (`/live`, `/queue/:queueId`, order-status channel) rather than polling — vendor and customer views of the same event stream, not two independently-built systems that could disagree.
- This is a React (Vite) + TypeScript web dashboard per Architecture §2, not React Native — the DashboardShell template is desktop/tablet-first with the documented breakpoint behavior, distinct from the mobile-first templates used everywhere else in this spec.

---

## V-03 / V-07 / V-08 / V-09 / V-10 / V-11 / V-12 — Vendor Dashboard, Part 2: Growth, Communication & Money

**Template:** DashboardShell (continues Part 1's sidebar/topbar shell) · **Mockup:** [design/v-07-12-vendor-dashboard-part2.html](design/v-07-12-vendor-dashboard-part2.html) (artifact) · **Status:** awaiting approval

Completes all 12 vendor screens. Covers the remaining sidebar groups from Part 1's nav: Operate (Wave-Downs), Manage (Bookings, Messages), and Grow (Ping Sharing, Giveaways, Analytics, Payouts).

### V-03 — Wave-Down Inbox
- Each request shows the **identical 5-minute countdown the customer sees on C-19's Waiting screen** — sorted soonest-to-expire first, so the most time-critical request is never visually buried under newer, less urgent ones.
- A request that expires unanswered auto-removes from the inbox exactly as it does for the customer — one server-authoritative timer, two mirrored UIs, never two independently-tracked clocks that could disagree.
- Only Accept/Decline are modeled as direct actions; the third FR-2 vendor response ("propose a scheduled stop instead") deliberately reuses V-07's slot-picking UI rather than inventing a fourth interaction pattern for what is conceptually the same action as booking a time.

### V-07 — Bookings Calendar
- **Pending customer-requested bookings render in amber, vendor-confirmed bookings in blue** — the two never share a color, so a vendor scanning a full week can instantly separate "needs my response" from "already settled" without reading each chip.
- "Propose new time" opens the **same slot-picker component the customer uses in C-26** — reused, not rebuilt, guaranteeing both sides of a scheduling negotiation always see identical available/unavailable times rather than two independently-implemented calendars that could drift.

### V-08 — Messages Inbox
- **Two-pane layout** (thread list + active conversation), unlike the customer's single-thread-at-a-time C-33 — a vendor is realistically triaging several simultaneous customer questions mid-shift, so this is the one messaging surface in the product that needs genuine multi-conversation visibility at once.

### V-09 / V-10 — Ping Sharing & Giveaways (both V1.x)
- **A visible "V1.x — post-pilot" chip appears directly on both screens in the mockup itself** — these are designed now so the visual language exists and is consistent with the rest of the system, but the screens themselves are honest that they are not part of the MVP launch, matching the Feature Breakdown doc's explicit phasing.
- V-09 surfaces the paid-ping fraud-guard reality directly to the vendor funding it ("14 qualifying shares this week · 3 converted to a sale") rather than leaving the anti-farming rate caps and unique-recipient constraint (Security §4) as an invisible backend rule the vendor can't see the effect of.

### V-11 — Analytics
- **Category-benchmark comparison bar sits directly beneath the vendor's own number, same scale, muted color** — informative context, not a ranked leaderboard, since a punitive-feeling comparison could discourage a new vendor still building volume rather than help them. This is the "vendor analytics benchmarking" item promoted from the Feature Breakdown doc's Recommended Additions section into a real, designed part of V-11.
- Weekly sales sparkline gets the same real-chart treatment (filled bars, peak-day emphasis) as the customer-facing dataviz moments elsewhere (S-13's earnings sparkline) — one consistent quality bar for every chart in the product, not just the customer-facing ones.

### V-12 — Payouts
- **"Manage on Stripe" deep-links out to Stripe's own hosted dashboard** rather than StreetServe rebuilding bank-account/tax-detail management natively — directly consistent with the Architecture doc's decision not to build a custom ledger/escrow system; this screen's job is to visualize balance and history, not to re-implement compliance surface Stripe already owns.

### States
- **V-03 empty:** "No pending wave-downs — you're all caught up," a calm confirmation rather than a blank inbox that could read as broken.
- **V-07 no bookings this week:** calendar grid still renders with all cells empty (shows the shape of an open week) rather than collapsing to a message, since the grid itself communicates availability.
- **V-08 empty inbox:** genuine first-run state for a brand-new vendor, mirroring the tone of C-32's empty state on the customer side.
- **V-09 budget fully depleted:** balance bar empties to 0, reload CTA becomes the primary visual focus — sharing continues organically per FR-5.4, this screen just stops showing paid-tip activity until reloaded.
- **V-12 Stripe account action required** (e.g., additional verification requested): balance card shows a warning chip and blocks new payouts until resolved, mirroring Stripe Connect's own account-restriction states rather than hiding them.

### Accessibility
- Amber/blue booking-status distinction in V-07 is paired with text ("Pending" / "Confirmed" implied by chip label), not color alone.
- V-08's unread dot indicator is supplemented by bold thread text, consistent with the same rule applied to C-32.
- Slider control in V-09 (per-share tip amount) is keyboard-operable (arrow keys) and announces the current value on change via `aria-valuenow`.

### RN / web implementation notes
- V-03's countdown timers render from a server-supplied expiry timestamp per wave-down request, matching the server-authoritative timer rule established for C-19 — the mockup's local JS countdown is a simulation stand-in only, not the intended production mechanism.
- V-07's propose/accept/decline actions write to `bookings.status`; this is the exact same event the customer's C-27 detail screen subscribes to and mirrors — one state transition, two synchronized views, never independently maintained.
- V-09's controls call `PATCH /ping-budgets/:businessId` (adjust tip/pause) and `POST /ping-budgets/:businessId` (reload) per API §7.
- V-12 reads balance/history from Stripe Connect's API via the backend, never re-implements payout calculation independently — StreetServe's `settlements`/`transactions` tables (Database §2–3) are the source of truth for what's owed, but the actual money movement and compliance status come from Stripe.

---

## H-01 / H-02 / H-03 / H-04 / H-05 / H-06 — Consignment Hub Dashboard

**Template:** DashboardShell (shares the vendor shell skeleton, distinct accent) · **Mockup:** [design/h-01-06-hub-dashboard.html](design/h-01-06-hub-dashboard.html) (artifact) · **Status:** awaiting approval

All six hub screens in one package. The Hub console is the supply side of the seller marketplace — where inventory owners (businesses, churches, nonprofits, makers) list goods, approve who takes them, watch them move, and get paid.

### Distinct console identity
- **Green brand ring/logo** distinguishes the Hub console from the Vendor console's orange — a business holding both roles (additive roles, one account) switches between two visually distinct consoles via the topbar switcher, never confused about which role's data they're looking at.
- Hub nav groups around the hub's actual jobs (**Inventory / Money / Insights**), not copied from the vendor's Operate/Manage/Grow — the two roles do genuinely different daily work, so their navigation reflects different mental models rather than a forced shared structure.

### H-01 — Hub Registration
- Three-step wizard ending in **generation of the printable pickup/return QR code** — the physical object that bridges the digital `inventory_checkouts` record to a real-world counter (the same code sellers scan in S-06 pickup and S-09 return). Setup is deliberately not "complete" until that bridge exists, since without it the whole checkout chain-of-custody has no anchor.

### H-02 — Product Catalog
- Per-product terms (**split %, return window, listing type**: consignment / donation-based / wholesale / rental) render as **scannable chips** — a hub managing dozens of SKUs compares terms at a glance, and these are the exact fields the seller sees on S-04, kept visually consistent across both sides of the same listing.

### H-03 — Checkout Approvals (the trust model made operational)
- Every pending checkout surfaces the seller's **Trust Score, tier, and declared value** — the hub is accepting real liability risk (goods physically leaving the building on someone else's word), so the precise signals informing that decision are front and center per FR-8's approval flow, not buried.
- **Shelter-cosigned sellers are visibly flagged** with a distinct gold chip — a hub needs to read a thin Trust Score correctly: when the shelter partner is the guarantor (Q4 model), a low history count is expected and backed, not a red flag. Without this flag, the Shelter Program's most vulnerable sellers would look like the riskiest applicants.
- Auto-approve rule (Gold-tier under a value threshold) stated at the top — the manual queue holds only what genuinely needs a human decision (FR-8.4 configurable approval), so a hub isn't rubber-stamping trusted repeat sellers all day.

### H-04 — Live Inventory Map
- **The hub's inverted version of the customer live map (C-10)** — the hub sits at the center marker and watches its own inventory move outward on active sellers, answering "where are my goods right now" (the Live Inventory Map named in the concept doc).
- The **overdue seller pin turns amber** — the single pin needing the hub's attention is the one that changes color, reusing the traffic-light urgency language from the seller's own deadline chips (S-07), so urgency reads identically whichever side of the transaction you're on.

### H-05 — Settlements
- Per-checkout table shows the **hub's share** and surfaces **dispute holds explicitly** — a "Dispute hold" row cannot be settled until resolved (FR-10.3), never silently paid out or hidden from the hub's reconciliation view.

### H-06 — AI Business Dashboard (V1.x)
- Carries **both** the "Smart · gets better with data" copy convention AND a visible V1.x chip — the AI business dashboard is genuinely post-pilot (Feature Breakdown), and honesty about that ships in the UI itself.
- Every recommendation carries its mandatory **"Recommended because" reason** — same non-negotiable explainability rule as the seller's S-11 (FR-9.1), applied to the inventory-owner context ("move candles toward Saturday's market because...").
- **Forecast chart is dashed** to signal prediction, visually distinct from the solid historical bars — the chart's own visual grammar separates "what happened" from "what the model guesses," so a hub never mistakes a forecast for a settled fact.

### States
- **H-02 empty catalog:** prompts the first product listing (a hub can't supply sellers with nothing), mirroring the empty-state-as-sales-tool pattern.
- **H-03 empty queue:** "No pending approvals" calm state, especially expected once auto-approve is handling most trusted-seller traffic.
- **H-04 no inventory out:** map shows only the hub marker with a "nothing checked out yet" note, rather than an empty map reading as broken.
- **H-05 dispute-held row:** cannot transition to Settled from this screen; resolution happens in the Admin dispute queue (A-02), and this row reflects that state read-only.
- **H-06 insufficient data:** brand-new hub with no sales history sees a "forecasts appear once you have sales data" state rather than a fabricated confident prediction — reinforces the honest-AI-copy principle.

### Accessibility
- Term chips (H-02) and status chips (H-05) carry full text, never color-only, consistent with the platform rule.
- The live inventory map (H-04) has a required list-view equivalent (sellers + quantities + status as a table) for screen-reader parity, mirroring C-10's list-view requirement — a map must never be the only way to access its data.
- Forecast vs. historical distinction (H-06) is conveyed by the dashed/solid line style AND an explicit label, not line style alone.

### RN / web implementation notes
- H-02 writes `products` rows; H-03 approvals gate `inventory_checkouts` creation (a seller's S-05 reservation becomes a real checkout only after hub approval or auto-approve); H-05 reads `settlements` (Database §3) — the hub side of the exact same records the seller creates in S-04–S-10, one shared data model viewed from the supply side.
- H-06 recommendations come from the same `/ai/recommendations` service (API §13) as the seller's S-11, scoped to inventory-owner context; `reason_summary` remains a required non-nullable field on every recommendation regardless of which role requests it.
- A single account can hold both Vendor and Hub roles (additive roles, per the Product Vision doc) — the topbar console switcher moves between the orange Vendor and green Hub consoles without re-login, and Trust/Business/Hub scores remain tracked separately per role (Q10).

---

## A-01 / A-02 / A-03 / A-04 / A-05 / A-06 / A-07 — Admin & Trust & Safety Console

**Template:** DashboardShell (internal, distinct violet accent) · **Mockup:** [design/a-01-07-admin-dashboard.html](design/a-01-07-admin-dashboard.html) (artifact) · **Status:** awaiting approval · **Final design package — completes all 77 screens.**

The internal console that keeps the marketplace honest. Never a surface any customer, vendor, seller, or hub sees.

### Internal identity
- **Violet accent + shield mark** — visually unmistakable from every external-facing console (customer none, vendor orange, hub green), so an internal screen is instantly recognizable as internal and never mistaken for a user-facing surface in a screenshot or demo.
- Nav groups by **admin intent** (Monitor / Resolve / Programs) rather than by data model — organized around what a Trust & Safety operator is trying to accomplish.

### A-01 — Ops Overview
- KPI vitals (active users, wave-down accept rate, GMV, **dispute rate per 1k txns** — the success metric named in the Product Vision doc) lead, but the **"Needs attention now" card is the operational heart** — it deep-links an operator straight into the single most urgent dispute/fraud/license item rather than making them hunt across tabs.

### A-02 — Dispute Queue + Case Detail
- **SLA bars turn red as the 5-business-day resolution target approaches** (FR-10.2) — the resolution clock is a first-class visual because slow dispute resolution is the one failure mode that erodes trust on both sides of a transaction simultaneously.
- Case detail pairs **evidence with a full chain-of-custody timeline** — checkout-time condition photos (S-06) vs. return-time photos (S-09) are precisely the artifacts that fairly resolve a consignment dispute; this is also exactly where the future AI Vision Verification feature would slot in.
- Four resolution paths (rule for either party / split liability / request more evidence), and the timeline **explicitly states "Trust Score change held until resolved"** — making FR-10.3 (never pre-empt a score/payout change before resolution) a visible property of the UI, not just a backend rule.

### A-03 — Category & License Review
- The license-review queue is **where V-01's `requires_license` gate gets its human decision** — approving here is the action that actually unblocks a regulated-category vendor from going live.
- Category suggestions are **admin-approved, never self-service** (Roadmap Q8); the taxonomy table is the single place `requires_license` / `regulated_by` metadata is set — the source of truth that drives compliance gating everywhere else in the product.

### A-04 — Fraud Flags
- **Explicit human-in-the-loop design**: the console surfaces fraud signals but **never auto-bans** — the privacy note names the real stake (a wrongly-banned low-income seller is a genuine harm), so every suspension is an explicit admin decision (Security §4). This is a deliberate design statement embedded in the screen, not just a policy documented elsewhere.
- Severity-ranked so high-signal items (device-fingerprint ping-farming, repeated oversell attempts) rise above low-signal noise like rapid follow/unfollow.

### A-05 — User Management
- Shows roles, verification tier, and **per-role Trust Scores** on one identity (Q10: verification portable across roles, scores separate per role); flags KYC documents as provider-held, never stored by StreetServe (Security §2).
- Suspension requires confirmation + reason and writes to the audit trail — never a silent one-click ban.

### A-06 — Shelter Partner Program
- **Aggregate-only reporting by design** (FR-12.3) — counts and totals, never an individual resident's transaction detail. The privacy note states this guarantee at the top because the entire program's dignity depends on not surveilling the people it exists to help.
- "Cosigned exposure" column shows each partner's **capped liability** (Q4) — the shelter's risk is bounded and visible, never open-ended.

### A-07 — Sponsors
- **Explicitly labeled manual/record-keeping for the pilot** (Roadmap Q9) — the self-serve sponsor dashboard is deferred to V1.x, and the screen says so plainly rather than implying a richer product than exists at launch.

### States
- **A-02 no open disputes:** "All caught up" state; the dispute-rate KPI on A-01 remains the ambient health signal even when the queue is empty.
- **A-04 no active flags:** calm confirmation, not an empty table reading as broken.
- **A-06 partner pending review:** shows the org in a pending state (as "New Beginnings House" in the mockup) with no resident data until the org itself is verified (FR-12.1).
- **A-05 no search results:** clear "no user found" with search-refinement hint rather than a blank table.

### Accessibility
- SLA urgency (A-02) conveyed by bar fill + explicit time-remaining text, never color alone.
- Severity chips (A-04) and status chips throughout carry full text labels.
- All destructive actions (suspend, reject license, rule-for-party) require a confirmation step with a reason field — protects against accidental irreversible action, and the reason feeds the audit trail.

### Security / implementation notes
- **Least-privilege role tiers** (support-agent vs. full-admin, per Product Vision doc) — not every operator sees every action; payout holds and user suspension in particular may be gated to senior Trust & Safety roles. The single violet console renders different capabilities per operator role.
- A-02 resolution writes to `disputes` (status, resolution, resolved_at) and only *then* releases held Trust Score / payout changes (FR-10.2/10.3); A-03 approvals flip `license_documents.status` and `category_suggestions.status`; A-05 suspend sets `users.status` — every one of these is an immutably-logged, auditable action (NFR Auditability).
- This console is the human backstop for the fraud-prevention, dispute, and compliance requirements that the rest of the system enforces automatically — automated guards (oversell blocks, rate limits, license gates) handle volume; this console handles the judgment calls those guards escalate.

---

## C-01 / C-02 / C-03 / C-04 / C-05 / C-06 / C-07 / C-08 / C-09 — Onboarding & Authentication

**Templates:** WizardFlow (the auth sequence) + full-bleed brand/primer screens · **Mockup:** [design/c-01-09-onboarding-auth.html](design/c-01-09-onboarding-auth.html) (artifact, walkable end-to-end with a working OTP keypad and the failure case) · **Status:** awaiting approval

The first thing every real user sees — designed after the core app because onboarding's job is to funnel efficiently into C-10, and it needed the destination designed first.

### C-01 Splash / C-02 Welcome Carousel
- Splash is a genuine brand moment (logo lockup + "See good, do good" + warm gradient), auto-advancing — not a wall to click through.
- The 3-slide carousel maps **exactly to the three user surfaces** (find / earn / run), reusing the landing-site's value props; "I already have an account" is always one tap away so returning users skip the pitch entirely.

### C-03 Entry / C-04 OTP
- **Passwordless, phone-first** (email as an equal toggle) — nothing to create or forget, and phone verification doubles as the baseline anti-fraud signal every account needs (Security §4).
- OTP failure is the one error state the flows doc specifies: boxes shake red, "2 tries left" counts toward the 3-failure lockout (Flow 1 error state) — never silent/vague. (Mockup: enter `000000` to trigger it.) Resend is time-gated with a visible countdown.

### C-05 Profile Basics / C-06 Role Intent
- Profile asks **only name + city, photo explicitly optional** — friction scales with money movement, not browsing (the core onboarding principle), so nothing here blocks a user who just wants to see the map.
- Role intent sets a *starting* mode; copy states plainly that **all roles live on one account and are addable later**, reflecting the additive-roles identity model — no one is locked into their first pick.

### C-07 Location Primer / C-08 Notification Primer
- **Pre-permission primers shown before the OS dialog** — they explain the value and the privacy guarantee ("precise location never shown to others," surfacing the fuzzing/precision policy from the requirements) so the real OS prompt has context and a higher accept rate.
- Each has a genuine "Not now" path — declining location falls back to the city-level map (C-10's error state), never a dead end. The notification primer previews an actual notification so the user sees exactly what they're opting into.

### C-09 Tutorial
- **Coach-mark overlay on the live C-10 map** (spotlight + card), not a separate fake screen — the user learns by looking at their real map, fully skippable at every step. Three beats only (tap a pin → wave down → discount), then out of the way.

### States & accessibility
- OTP lockout after 3 failures → temporary cooldown + support link (Flow 1).
- Every step is keyboard-navigable; OTP boxes announce via `aria-live` on fill/error; permission primers are reachable and dismissible without the OS dialog.
- All copy is active-voice and specific ("Send code," then "Verified"); errors say what to do next.

### Implementation notes
- `POST /auth/register` → `POST /auth/verify-otp` (API §1); tokens issued only on OTP success; managed auth provider (Auth0/Clerk) owns credential/session handling (Architecture §5).
- C-06 selection writes a `user_roles` row; verification tiers are requested later, only when a role first touches money (Flow 1b).
- C-07's precision choice writes to privacy settings, honored by the map's pin-fuzzing logic (Security §2).

---

## C-34 / C-35 / C-36 / C-37 / C-38 — Profile & Account

**Templates:** TabPage (C-34) · SettingsList (C-37) · TabPage detail (C-35, C-36, C-38) · **Mockup:** [design/c-34-38-profile-account.html](design/c-34-38-profile-account.html) (artifact) · **Status:** awaiting approval

The account hub and everything reachable from it. Per the client's 5-tab nav, **Jobs/Sell and Wallet live here** rather than as top-level tabs — so the profile's design job is to keep those paths prominent despite being one level down.

### C-34 — Profile
- Leads with a **"Do more on StreetServe"** section (open seller mode / set up a business) so the consignment/gig paths stay front-and-center even though the client's tab bar has no dedicated Jobs/Sell tab — this directly addresses the open reconciliation item flagged back in the UX doc.
- **Role chips** (Customer + Seller) make the additive-roles model visible; the boxed stat strip (waves / Trust / earned) reuses the same pattern as the fixed AI card, showing cross-role numbers at a glance.

### C-35 — Wallet
- **One wallet, three money relationships:** balance (ping tips + round-up change), payment methods, **Spot Me obligations you owe**, and ping earnings. The wallet honestly shows money flowing in *and* out including debts — it never hides what you owe.
- Spot Me shows the agreed repay-by date in amber — a reputation nudge, never a debt-collection tone, consistent with the platform ethos (FR-6.3).

### C-36 — Verification Center
- Bronze/Silver/Gold as a **vertical ladder with done/current/locked states** — a user always sees where they are and what unlocks next, the same explainability principle applied to Trust Score (FR-10.1) and AI (FR-9.1).
- Models the **rejected-document error state** from Flow 1 (blurry ID): specific reason + re-upload, status preserved in the interim rather than dropped. Restates that ID docs are provider-held, never stored by StreetServe (Security §2), exactly where a user is about to hand one over.

### C-37 — Settings
- Per-category notification toggles, but **payout/dispute alerts show an "Email" chip instead of a switch** — redirectable but never fully mutable (Flow 12), so a user can't accidentally miss money or a dispute.
- Location precision and "show me as a live seller" are first-class privacy controls; "Download my data" / "Delete account" satisfy CCPA-style rights (California pilot, Roadmap Q7). Theme control mirrors the design system's light/dark/system support.

### C-38 — Help & Support
- FAQs answer **this product's specific questions** (line-up discount, consignment liability, location privacy, payout timing), not generic boilerplate.
- "Open a dispute" is a real entry point into the dispute case object — the customer side of the Admin A-02 queue — not a dead-end contact form.

### Accessibility & implementation
- All toggles are native `role="switch"`, keyboard-operable; destructive actions (log out, delete account) isolated in a final group per the SettingsList template.
- C-34 role actions → `POST /auth/roles`; C-35 payment methods proxy to Stripe (never raw card data, Security §3); C-36 re-upload re-initiates the KYC provider flow, updating `verification_records` via webhook; C-38 dispute creation writes a `disputes` row.

---

## C-11 / C-12 / C-13 / C-15 / C-16 / C-17 / C-25 / C-28 / C-29 / C-30 — Discovery, Content & Gifting

**Templates:** MapShell overlay (C-11, C-17) · TabPage (C-12, C-13, C-16, C-25) · SheetStack/detail (C-15) · WizardFlow (C-28, C-30) · **Mockup:** [design/c-11-30-discovery-gifting.html](design/c-11-30-discovery-gifting.html) (artifact) · **Status:** awaiting approval · **Completes 100% customer coverage and all 77 screens.**

The final ten customer screens — the secondary discovery surfaces, content screens, and the gifting/credit flows that hang off the core loop.

### C-11 Search / C-12 List View / C-13 Category Browser
- **Search** surfaces live results with status + ETA inline, plus recent-search chips — most searches are a name or a category, so both are one tap.
- **C-12 List View is the accessibility-mandated map parity surface** (UX §1, §2.8): everything the map shows as a sortable, screen-reader-friendly list with a map/list toggle — a genuine equal, never a lesser fallback. This is the single most important accessibility deliverable in the customer app.
- **Category browser** shows the curated ~18 launch categories grouped by top-level tab with live "N nearby" counts — honest about the pilot's real taxonomy size (Q8), not a fabricated 100-category grid.

### C-15 Menu / C-16 Reviews
- Full menu is the expanded C-14 preview (Today's Special pinned, add-to-order building toward C-21) — one menu component, two contexts.
- Reviews lead with a rating distribution; the composer is **gated to verified purchasers** with a "Verified" badge on every review — the anti-manipulation rule (Security §4) made visible.

### C-17 Block Party
- A pulsing halo marks the convergence zone; the sheet frames it as an event ("3 vendors just converged") with each vendor's hook and first-in-line discount — turning FR-4.2 detection into something a customer runs toward. Reuses the exact status rings and discount chips — no new vocabulary for a special moment.

### C-25 Orders History
- Orders, wave-downs, bookings, and gifts in **one unified feed with filter chips** — matching the Database decision that history isn't split by transaction type. Active items float above past; past rows restate savings so the discount payoff stays visible even in history.

### C-28 Gift / C-29 Redemption / C-30 Spot Me
- Gift sender flow ends in payment; refund-after-14-days stated up front (FR-6.1). Recipient redemption offers **both a code and a QR** — a vendor on the move may lack a scanner, so the code is the reliable fallback; expiry always visible.
- **Spot Me leads with the requester's own Trust Score and acceptance likelihood** before asking (FR-6.3) — honest expectations, and the copy is explicit that late repayment is a reputation consequence, **never collections**. Gated by the 30-day/Bronze rule at the system level (PRD §3), so it only appears for eligible accounts.

### Implementation notes
- C-11/12 → `/map/nearby` search; C-16 → `POST /reviews` (transaction-gated); C-17 → `block_party_events`; C-25 → unified read across `orders`/`wave_downs`/`bookings`/`gifts`; C-28 → `gifts` + Stripe; C-29 → `POST /gifts/:code/redeem`; C-30 → `spot_me_requests`.

---

## Design phase — completion note

With this package, **all 77 catalogued screens** ([12-screen-inventory-and-sitemap.md](12-screen-inventory-and-sitemap.md)) are **individually prototyped** — every one has its own dedicated high-fidelity mockup, not merely a template assignment: 38 customer (C), 14 seller (S), 12 vendor (V), 6 hub (H), 7 admin (A), across 15 interactive prototype packages. Every package shipped as a theme-aware interactive HTML mockup in [design/](design/) plus a spec section here. Cross-cutting design decisions (three-state status model, Follow vs. Notify Me interaction shapes, discount-tier language continuity, graduated quietness of destructive actions, server-authoritative timers/totals, explainable-AI "why" lines, honest V1.x labeling, human-in-the-loop moderation, per-console accent identity) hold consistently across all five role surfaces. MVP-scoped screens are build-ready against this spec; V1.x screens were designed alongside for visual-language continuity but remain gated per the Feature Breakdown phasing.
