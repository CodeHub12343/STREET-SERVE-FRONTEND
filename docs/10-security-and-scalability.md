# StreetServe — Security, Risk & Scalability Strategy

## 1. Authentication & Authorization
- Managed auth provider (Auth0/Clerk) handles credential storage, brute-force protection, and session management (see Architecture §5).
- Role-based access control enforced server-side on every endpoint via middleware/guards — never trust a client-declared role.
- Fine-grained authorization beyond role: e.g., a Hub owner can only approve checkouts for their own products (resource-ownership checks, not just role checks).
- Short-lived access tokens (~15 min) + rotated refresh tokens; refresh tokens revocable on logout/suspicious-activity detection.

## 2. Data Protection
- PII (name, phone, email, ID documents, location history) encrypted at rest (database-level encryption) and in transit (TLS everywhere, including internal service-to-service calls).
- ID documents and selfie-liveness data handled entirely by the KYC provider (Persona/Stripe Identity) — StreetServe stores only a provider reference and verification status, never the raw document, minimizing breach blast radius.
- Location precision is user-controlled: exact location used server-side for matching/proximity, but public pin display can be fuzzed to a configurable radius for individual sellers who want reduced precision (vendors with a fixed/known service area may reasonably show exact location).
- Data retention policy (confirmed default, [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q7): precise location history retained **30 days** for dispute/support purposes, then purged or aggregated to city-level/anonymized data; documented and surfaced to users at signup (addresses the gap flagged in Requirement Analysis §4). ID/selfie verification documents are **not independently stored** by StreetServe at all — they remain with the KYC provider (Persona/Stripe Identity) under that provider's own compliance retention policy, minimizing StreetServe's own breach/CCPA exposure.

## 3. Payment & Financial Security
- No raw card or bank data ever touches StreetServe servers — Stripe Elements/Payment Sheet and Stripe Connect onboarding handle that surface entirely (PCI scope stays minimal — SAQ A).
- All settlement/payout math computed server-side, never trusted from client input; idempotency keys on every payment-triggering request (see API doc §16).
- Immutable financial audit log: settlements, disputes, and Trust Score changes are append-only; corrections are new offsetting rows, never destructive updates.
- Honest, accurate business-category declaration to the payment processor, on a **freshly opened Stripe Connect account** (never a renamed/repurposed legacy account) — confirmed default, [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q5. This is called out explicitly because the excluded chat log (Executive Summary §2) described a third party advising the opposite — categorizing a marketplace/crowdfunding-adjacent business as generic "advertising and marketing services" to dodge compliance review. That pattern risks account termination, fund freezes, and potential violation of the processor's terms of service and card-network rules; StreetServe's own Stripe Connect application should accurately reflect that it operates a marketplace with consignment sales and vendor payouts.
- **Stripe Tax** for marketplace-facilitator sales tax collection/remittance on consignment sales, so the obligation sits centrally with StreetServe rather than individual hubs/sellers (Q3's recommended default, pending final counsel confirmation on money-transmission scope).

## 4. Fraud & Abuse Prevention
- **Ping-to-ping economy:** per-account daily paid-share cap, unique-recipient-per-vendor constraint (DB-enforced, see Database doc §6), new/dormant-account qualifying condition, device-fingerprint-based duplicate detection.
- **Consignment oversell:** application-transaction-enforced quantity checks (FR-8.3) prevent a seller from reporting more sold than checked out.
- **Spot Me abuse:** disabled under 30-day account age or below Bronze verification (Business Rule, PRD §3); repeated defaults reduce Trust Score and eventually disable the feature per-user.
- **Fake/duplicate accounts:** phone/OTP verification at minimum for every account; device and behavioral signals feed an internal fraud-flag queue for admin review (API §14) rather than fully automated bans, given the real-world cost of wrongly banning a legitimate low-income seller.
- **Review manipulation:** reviews tied to a completed transaction only (no free-form reviews without a matching transaction record).

## 5. Input Validation & API Hardening
- Schema validation (e.g., Zod on the Node/TypeScript layer) on every request body, rejecting unknown fields.
- Rate limiting per-endpoint and per-account (Redis-backed), tuned tighter on money-movement and sharing endpoints than on read-only map queries.
- Standard OWASP Top 10 posture: parameterized queries only (no raw SQL string interpolation) even though Postgres is the primary store; strict CORS policy scoped to known app origins; CSP headers on any web-served surface; dependency vulnerability scanning in CI.

## 6. OWASP-Specific Callouts for This Product
- **Broken access control:** the 9-role, multi-role-per-account model is the single highest-risk area for this specific product — invest disproportionately in automated authorization tests (e.g., "seller A cannot settle seller B's checkout") given how much money-movement logic depends on getting this right.
- **Injection:** ORM/query-builder usage (e.g., Prisma or Knex) rather than hand-built SQL for anything touching user input.
- **Insecure design:** the tiered-verification model itself is a security control, not just a UX one — treat any proposal to "skip verification to grow faster" as a security regression requiring sign-off, not a routine product decision.
- **Security logging/monitoring:** every dispute, payout, and role-elevation event logged with actor, timestamp, and reason; alerting on anomalous patterns (e.g., a spike in Spot Me requests from new accounts).

## 7. Scalability Strategy
- **Live location is the hot path** — Redis pub/sub plus geohash-bucketed subscriptions (clients subscribe to the map cells in view, not a global firehose) keeps broadcast fan-out bounded regardless of total user count.
- **Horizontal scaling of the API layer** behind a load balancer, with Socket.IO's Redis adapter so realtime works correctly across multiple instances (a single-instance assumption breaks the moment you scale past one Node process — bake this in from the start, not as a later migration).
- **Read replicas for Postgres** once dashboard/analytics read load grows, keeping the primary free for transactional writes (settlement, checkouts).
- **Background job queues (BullMQ)** absorb bursty async work (Trust Score recalculation, notification fan-out for Block Party events) so it never blocks request-path latency.
- **Caching hot reads:** active-vendor-list-per-geohash-cell, category taxonomy, discount schedules — all low-write, high-read, ideal Redis cache candidates with short TTLs.
- **Monitoring:** structured logging + APM (e.g., Datadog, or an open-source stack of Prometheus/Grafana + OpenTelemetry) from day one; the specific metrics to alert on: wave-down SLA breach rate, settlement processing latency, dispute SLA breaches, live-session staleness (pins not updating).
- **Design for one city, architect for many:** the pilot is Modesto-only, but geohash/PostGIS-based querying and city-scoped feature flags mean expansion to new cities is a data/config change (new `cities` row, category/license metadata per jurisdiction), not a re-architecture.

## 8. Risk Register

| Risk | Category | Mitigation |
|---|---|---|
| Mobile-vendor categories operate without required local licenses | Business/Legal | `requires_license` metadata blocks going live without approved documentation (FR, DB validation rules) |
| Ping-economy incentivizes bot/farming abuse | Technical/Fraud | Rate caps, uniqueness constraints, device fingerprinting, manual fraud-flag review queue |
| Spot Me defaults harm vulnerable users on both sides | Business/UX | Age/tier gating, reputation consequence instead of debt collection, no aggressive recovery per platform ethos |
| Shelter Program residents lack standard KYC artifacts | Business/Compliance | Shelter-cosigned capped allocation as an explicit alternate verification path, reviewed with legal counsel before launch |
| Payment processor account review/misrepresentation risk | Business/Compliance | Accurate category declaration, Stripe Connect's built-in marketplace tooling instead of workarounds |
| Real-time location infra fails to scale past pilot | Technical | Redis pub/sub + geohash bucketing designed in from day one, load-tested before multi-city expansion |
| Trust Score formula produces unfair or gameable outcomes | Product/UX | Versioned, explainable formula (FR-10.1); dispute-resolution-gated score changes only |
| Development scope creep from the large future-roadmap list | Delivery | Strict MVP/V1.x/Future tiering (Feature Breakdown doc) enforced in sprint planning |
