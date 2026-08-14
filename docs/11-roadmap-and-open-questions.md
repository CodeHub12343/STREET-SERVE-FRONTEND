# StreetServe — Development Roadmap, Future Enhancements & Open Questions

## 1. Development Roadmap (Milestones)

**Milestone 0 — Foundations (no user-facing features)**
- Repo/infra scaffolding, CI/CD, environments (dev/staging/prod)
- Auth provider integration, base RBAC, category taxonomy + license metadata seed
- Postgres/PostGIS schema migration baseline, Redis + Socket.IO scaffolding
- Dependencies: none. Complexity: Medium (mostly config, but wrong choices here are expensive to unwind later).

**Milestone 1 — Live Map & Vendor Core (MVP layer 1)**
- Vendor live broadcast, customer live map, category filters, proximity alerts
- Wave down (request/accept/decline/expire)
- Line-up discount engine + queue
- Pop-Up Mode
- Basic transaction + payment (Stripe Connect standard checkout, no consignment yet)
- Round-up tips, basic reviews
- Dependencies: Milestone 0. Complexity: High (this is the real-time core the rest of the product depends on).

**Milestone 2 — Scheduling & Vendor Dashboard**
- Booking/calendar flow, reminders
- Vendor dashboard (live toggle, queue view, basic sales log)
- Dependencies: Milestone 1. Complexity: Medium.

**Milestone 3 — Consignment Core (MVP layer 2)**
- Hub registration, product catalog, QR checkout-in/out
- Inventory sales logging, oversell guard, return flow, settlement + payout
- Seller Trust Score v1 (rule-based), manual dispute queue
- Dependencies: Milestone 0 (auth/payments), independent of Milestone 1's queue mechanics but shares the live-map layer for seller pins. Complexity: High (financial correctness + physical inventory chain-of-custody).

**Milestone 4 — Growth Mechanics**
- Ping-to-ping sharing + paid budgets + fraud guards
- Gifting, giveaways, Spot Me
- Block Party detection
- Dependencies: Milestones 1 & 3 (shares transaction and trust infrastructure). Complexity: Medium-High (fraud surface area is the hard part, not the feature itself).

**Milestone 5 — AI Layer v1 (rule-based)**
- Product/location recommendations (category affinity + proximity heuristics)
- Sales coaching content library
- Basic AI business dashboard for hubs
- Dependencies: Milestone 3 (needs real transaction data to be useful at all). Complexity: Medium.

**Milestone 6 — Jobs & Shelter Partner Program**
- Jobs postings/applications/check-in-out
- Shelter partner org onboarding, resident co-sign enrollment, aggregate reporting
- Dependencies: Milestones 0, 3 (verification tiers). Complexity: Medium technically, High on the legal/compliance review needed before launch (flagged as an open question below).

**Milestone 7 — Pilot Launch (Modesto, CA)**
- Load testing on realtime/geospatial paths, staged rollout, sponsor integration (Wonder Ice), monitoring/alerting live
- Dependencies: Milestones 1–4 minimum; 5–6 can follow shortly after launch rather than gating it.

**Post-Launch — V1.x & Future**
- True ML-based demand prediction (Python microservice), AI product-to-seller matching, Smart Event Selling, AI Seller Academy, full three-way reputation system, then the explicitly-future items (smart lockers, NFC, AI vision verification, autonomous inventory, AI income coach) — sequenced by demonstrated pilot demand, not built speculatively.

## 2. Future Enhancements (Recap)

See [04-feature-breakdown.md](04-feature-breakdown.md) §"Future Roadmap" for the full list as named by the client (smart lockers, NFC inventory, AI Vision Verification, autonomous mobile inventory, AI Personal Income Coach, inventory insurance, featured-placement ads product).

## 3. Questions That Require Client Clarification

Each question below carries a **recommended default** — the answer this blueprint now builds toward unless the client or counsel overrides it. Items 2–4 involve real legal exposure; the recommendation is the product/eng position to bring to counsel, not a substitute for their sign-off.

1. **Regulatory posture:** For the pilot city (Modesto, CA / California generally), which vendor categories will actually be onboarded first, and has each been checked against local mobile-vendor and applicable professional-licensing requirements (food, cosmetology, veterinary, etc.)? This determines how much of the `requires_license` gating needs to be live at MVP versus phased in.
   **Recommended default:** Launch with the lowest-friction categories first — food trucks, mobile detailing/car wash, mobile pet grooming, mobile mechanic, mobile DJ/event services, mobile notary, and non-service consignment goods (crafts, retail items). Defer mobile veterinary, cosmetology-licensed beauty, and anything health/medical to a later phase pending legal review. `requires_license` gating is **on at MVP**, not deferred, specifically for food and personal-care categories.
2. **Consignment legal structure:** Who bears liability for goods lost, stolen, or damaged while checked out to a seller — the platform, the hub/business, or the seller — and is this documented in a seller-facing agreement? This is a legal drafting question, not just a product one.
   **Recommended default (pending counsel confirmation):** Standard bailment model — the seller bears responsibility for checked-out goods (loss/theft/damage) from checkout until return/settlement, at the hub-declared value, absent hub negligence. Codified in a clickwrap Seller Agreement presented at Tier 1 verification. Platform enforces via Trust Score and settlement holdback, not insurance — inventory insurance stays a future paid product, not a day-one guarantee.
3. **Money transmission / marketplace facilitator status:** Has counsel confirmed that Stripe Connect's model (rather than a custom ledger) is sufficient for StreetServe to avoid money-transmitter licensing in the states it plans to operate in, and who is responsible for marketplace-facilitator sales tax remittance on consignment sales?
   **Recommended default (pending counsel confirmation):** Stripe Connect as the payout rail, with **Stripe Tax** layered in so StreetServe (as the marketplace facilitator) collects/remits sales tax automatically rather than pushing that obligation onto individual hubs or sellers.
4. **Shelter Program legal relationship:** Is StreetServe prepared to formalize a partner agreement with shelters that defines their role as a co-signing/guaranteeing entity, including what happens if a co-signed resident defaults or is banned?
   **Recommended default (pending counsel confirmation):** A signed partner agreement is required before this feature ships, scoping the shelter's liability strictly to the declared value of the specific starter allocation they cosigned — nothing broader. On resident default/ban: standard Trust Score consequence to the resident only (allocation written off or recovered from future earnings); no consequence flows back to the shelter and no debt-collection action is taken against the resident, consistent with the platform's stated ethos.
5. **Payout provider confirmation:** Is Stripe Connect an acceptable default, or is there an existing payments relationship (positive or negative) that should inform this choice? (Flagging again, per the Executive Summary: any prior account history under a different business name/category should be resolved with accurate, current information rather than carried forward via a workaround.)
   **Recommended default:** Stripe Connect, on a **freshly opened account with an accurate marketplace/platform business category** — never a renamed or repurposed legacy account. This directly avoids the workaround pattern flagged from the excluded Honest Need chat log.
6. **Launch scope for the AI layer:** Is a rule-based v1 (no real ML) acceptable messaging to early sellers/hubs, or does the launch marketing promise (as currently written on the landing page and concept doc) commit to full predictive AI from day one? This affects both engineering scope and marketing copy alignment.
   **Recommended default:** Ship the rule-based v1 and market it as "smart" or "AI-assisted" recommendations rather than implying fully trained predictive AI on day one. Soften landing-page/concept-doc language toward "gets smarter as more sellers use it" — protects both engineering scope and truth-in-advertising exposure.
7. **Data retention specifics:** What retention window for precise location history and verification documents is acceptable, balancing dispute-resolution needs against user privacy expectations and any applicable state privacy law (e.g., CCPA, given the California pilot)?
   **Recommended default:** 30-day retention on precise location history, then purge or aggregate to city-level/anonymized data. Do not independently store ID/selfie verification documents at all — leave those with the KYC provider (Persona/Stripe Identity) under their own compliance retention policy, minimizing StreetServe's own CCPA exposure.
8. **Category taxonomy ownership:** Should the ~100-category mobile-business taxonomy be finalized now (as a fixed launch list) or should the platform support hub/vendor-submitted new categories with an admin-approval step from day one?
   **Recommended default:** Launch with a small curated list (roughly 15–25 categories actually vetted for the pilot city), with a vendor "suggest a category" submission that requires admin approval — not open self-service category creation. Expand the taxonomy market by market as licensing is checked.
9. **Sponsor program scope:** What exactly does a "launch sponsor" (e.g., Wonder Ice) receive — logo placement only, in-app feature placement, or a data/reporting relationship — and does that need its own lightweight sponsor-facing dashboard at MVP or can it be handled manually for the pilot?
   **Recommended default:** MVP is logo placement plus manual reporting (UTM-tagged landing links, a shared report) — no dedicated sponsor dashboard until sponsor volume actually justifies building one (moved to V1.x, consistent with the "don't build ahead of demonstrated need" principle applied to the AI layer).
10. **Multi-role trust portability:** If a single user is both a Street Seller and, later, registers a Mobile Vendor business, should Trust Score be shared/portable across those roles, or tracked entirely separately? The current recommendation (separate scores per role, one identity) should be confirmed against the client's intent.
    **Recommended default:** Keep Trust/Seller/Business scores separate per role (the behaviors measured are genuinely different), but make **identity verification** (KYC tier) portable across roles — no reason to redo ID/liveness checks when a Seller later registers as a Vendor.
