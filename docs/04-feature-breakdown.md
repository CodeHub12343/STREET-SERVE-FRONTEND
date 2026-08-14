# StreetServe — Feature Breakdown

Legend: **MVP** = required for pilot launch (Modesto, CA). **V1.x** = advanced, post-pilot. **Future** = roadmap, not scoped for initial build.

## MVP — Vendor / Live Map Layer
*Updated per client UI reference, see [03-user-flows.md](03-user-flows.md) §2–2e.*
- Account creation + role selection (Customer, Vendor)
- Live map with real-time vendor pins (**each business's own uploaded logo/icon**, not a generic category glyph), search bar ("Search businesses or services"), top category tabs (All/Food/Coffee/Services/Shopping/More), proximity alerts
- **Launch category taxonomy: a curated ~15–25 categories** vetted for the pilot city's licensing requirements (not the full ~100-category universe from the source material) — see [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q8. Vendors can submit a "suggest a category" request, routed to admin approval, rather than self-service category creation at MVP.
- **Three-state business status model** — Driving / Parked / Away-Closed — driving the pin's status ring color, the profile badge, and wave-down/order availability
- Vendor live-location broadcast (mobile app, background-safe)
- Wave down (request + accept/decline + route-or-schedule response)
- Queue/line-up with configurable discount tiers + cap
- Pop-Up Mode as a Driving→Parked transition event with an active queue, triggering automatic delay notification (not a separate status — see Database doc)
- **Follow** (persistent, added to Favorites, ongoing status/proximity alerts) and **Notify Me** (one-off "next time nearby" alert) as two distinct mechanics
- **In-app Messaging**: scoped chat thread per customer↔business, reachable from the profile sheet and a dedicated Messages tab — promoted here from "Recommended Additions" now that the client's own mockup shows it as a core action button, not an optional add-on
- **Direct Order flow**: order from a business's menu for pickup at its current Parked location, tracked in an Orders tab — distinct from wave-down (spontaneous) and from Booking (scheduled, Flow 6)
- Business profile sheet: rating/review count, Open Now/status badge, About, hours, combined status+location line, Today's Special, Menu, photo gallery, reviews list, and the Directions/Follow/Notify Me/Message action row
- Standard transaction flow: payment, discount application, receipt
- Round-up tips
- Basic scheduling (single bookings, reminders)
- Reviews & ratings (customer → vendor)
- Vendor dashboard: live status toggle (Driving/Parked/Away-Closed), queue view, menu/Today's Special management, incoming message threads, order queue, basic sales log
- Pre-registration / launch waitlist (already live on the marketing site — carry the captured list into the real account system at launch)

## MVP — Consignment / Seller Layer
- Street Seller role + tiered verification (Bronze/Silver/Gold)
- Consignment Hub registration + product catalog upload
- Inventory browse + reservation
- QR-based checkout-in / checkout-out with condition photo capture
- Manual/simple AI-lite recommendations (rule-based: category affinity + proximity — full ML demand prediction is V1.x, see below). **Marketed as "smart"/"AI-assisted" recommendations, not full predictive AI** — per the recommended default in [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q6, launch copy should read "gets smarter as more sellers use it" rather than implying a trained model from day one.
- Automatic profit-split payout on settlement
- Seller Trust Score v1 (rule-based: on-time return rate, dispute count, review average)
- Dispute flow (manual review queue, not automated)
- **Seller Agreement (clickwrap at Tier 1 verification)** codifying the bailment liability model: seller bears responsibility for checked-out goods until return/settlement, at hub-declared value — see [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q2 and [05-prd-functional-spec.md](05-prd-functional-spec.md) FR-8

## V1.x — Vendor / Live Map Layer
- Ping-to-ping sharing with paid-tip budgets + fraud scoring
- Block Party detection & broadcast
- Gifting (send-to-recipient redemption flow)
- Vendor giveaways
- Spot Me (community credit) with repayment tracking
- Recurring bookings/calendar sync
- Sponsor dashboard (impressions, attributed signups) — MVP handles sponsor reporting manually (UTM-tagged links, shared report); this dashboard is deferred to V1.x until sponsor volume justifies it, per [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q9

## V1.x — Consignment / Seller Layer
- AI Seller Assistant v2: true demand prediction using accumulated first-party sales data, weather, and event calendar feeds
- AI Sales Coaching content library + contextual objection-handling suggestions
- AI Business Dashboard: forecasts, "move inventory here" recommendations
- AI product-to-seller matching (skills/behavior-based)
- Smart Event Selling (event calendar ingestion + targeted alerts)
- AI-assisted pricing/bundle suggestions
- AI Seller Academy (structured training + badges/certifications)
- StreetServe Jobs marketplace (gig postings beyond product selling)
- Homeless Shelter Partner Program (org onboarding, co-signed allocations, aggregate outcome reporting)
- Full three-way reputation system (Seller / Business / Hub scores) with tier-gated inventory access

## Future Roadmap (explicitly named by client, not scoped yet)
- Smart AI-enabled lockers for unattended inventory pickup
- NFC-tagged inventory (in addition to QR)
- AI Vision Verification for condition/quantity/fraud checks at checkout/return
- Autonomous mobile inventory trailers
- AI "Personal Income Coach" (goal-based daily/monthly earning plans)
- Inventory insurance product
- Featured placement marketplace (sellers, hubs, products) as an ads product

## Recommended Additions (not requested, worth considering)
- **Extend in-app Messaging's moderation/rate-limiting to seller↔customer and Spot Me negotiation contexts**, not just customer↔vendor — the client mockup confirms scoped business messaging as MVP (see above), so the remaining recommendation is to reuse that same scoped/moderated thread model for Street Seller and Spot Me interactions rather than exposing personal phone numbers there too.
- **Accessibility mode for the map** (list view alternative to pins, for screen-reader users and low-vision customers).
- **Vendor analytics benchmarking** ("your queue conversion is above average for your category") — increases dashboard stickiness without new data collection.
- **Multi-language support** given the gig/shelter-program audience skews toward populations where English may not be a first language.
- **Offline-tolerant seller checkout** (queue QR scans locally, syncs when connectivity returns) — mobile sellers and shelter residents are disproportionately likely to have inconsistent data access.

## Premium / Monetization Features (client-named revenue model, organized)
- Consignment transaction fee (platform cut per settled sale)
- Seller/Vendor premium membership tiers (lower fees, priority inventory, advanced analytics)
- Premium AI tools (advanced coaching, pricing optimization) as an add-on
- Inventory insurance (future)
- Advertising / featured placement (products, sellers, hubs)
- Training certification fees (optional paid certification tracks within AI Seller Academy)
- Sponsor packages (pre-launch and ongoing, per the "1+ launch sponsors" model already validated by Wonder Ice)
