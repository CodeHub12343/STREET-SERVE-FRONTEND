# StreetServe — Product Requirements Document (Functional & Non-Functional Spec)

## 1. Functional Requirements

### FR-1 Live Map & Location
- FR-1.1 System shall display all active vendors/sellers as map pins within a configurable radius of the user's location.
- FR-1.2 Vendor/seller location shall update server-side at least every 10 seconds while "live," and clients shall reflect updates within 3 seconds of receipt.
- FR-1.3 Users may filter the map by category; filters persist across sessions.
- FR-1.4 System shall send a proximity alert when an opted-in vendor/seller enters a user-defined "home area" radius, throttled to no more than 1 alert per vendor per rolling 2-hour window.

### FR-2 Wave Down
- FR-2.1 A wave-down request shall include requester location, timestamp, and optional note.
- FR-2.2 Vendor must accept, decline, or let the request expire (default SLA: 5 minutes, vendor-configurable between 2–15 minutes).
- FR-2.3 On acceptance, system shall provide an ETA estimate and live tracking to the requester.

### FR-3 Line-Up Discount Engine
- FR-3.1 Vendors define a discount schedule: ordered list of (position, discount %), plus a cap after which no further discount applies.
- FR-3.2 Queue position is assigned by server-received timestamp of join event, not client-reported time.
- FR-3.3 Discount is locked to the customer at time of joining and honored even if queue order changes due to cancellations ahead of them.
- FR-3.4 Vendor may configure whether a customer who leaves the geofence loses their queue spot (default: spot held for 15 minutes).

### FR-4 Pop-Up Mode & Block Party
- FR-4.1 Vendor may toggle Pop-Up Mode; system notifies all customers with an active queue position or accepted wave-down for that vendor within 30 seconds.
- FR-4.2 System shall detect ≥2 vendors within a configurable radius (default 150m) for a configurable minimum overlap window (default 10 minutes) and trigger a Block Party broadcast to opted-in users within a wider radius (default 1 mile).

### FR-5 Ping-to-Ping Sharing
- FR-5.1 Vendors may fund a paid-sharing balance with a configured per-share tip amount.
- FR-5.2 A forwarded share qualifies for a tip only if the recipient is a new or 90-day-dormant account and completes a qualifying action (app open + map view) within 24 hours — see Business Rules.
- FR-5.3 System shall cap paid-tip-eligible shares per sending account per day (default: 10) to reduce farming.
- FR-5.4 When budget is depleted, sharing continues to function but is visually labeled "free share" and accrues no tip.

### FR-6 Gifting, Giveaways, Spot Me, Round-Up
- FR-6.1 Gift purchases require recipient identification (phone/contact) and generate a redemption code with a vendor-configurable expiry (default 14 days); sender is notified 48 hours before expiry.
- FR-6.2 Giveaways are capped by vendor-set daily unit quantity and require no payment method from the requester.
- FR-6.3 Spot Me requests capture amount and repay-by date; acceptance is at vendor/peer discretion informed by requester's Trust Score; default triggers a Trust Score penalty, not debt collection action.
- FR-6.4 Round-up tips are opt-in per transaction and route 100% to the vendor (StreetServe takes no cut of round-up tips, to preserve trust in the mechanic).

### FR-7 Scheduling
- FR-7.1 Vendors expose available time slots per service; customers book, reschedule (up to a vendor-configured cutoff), or cancel.
- FR-7.2 Reminders fire at 24 hours and 1 hour before a booking.

### FR-8 Consignment Lifecycle
- FR-8.1 Hubs list products with quantity, unit value, consignment split %, condition requirements, and return window.
- FR-8.2 Seller checkout requires a hub-side QR scan and photo capture of condition/quantity at pickup.
- FR-8.3 System tracks per-seller, per-product running inventory in real time; oversell (seller reporting more sold than checked out) is blocked at the transaction layer.
- FR-8.4 Settlement (return + reconcile) automatically computes: gross sales − platform fee − hub share = seller net, and disburses per the seller's payout tier timing.
- FR-8.5 Missed return deadlines trigger a grace-period reminder (default 24 hours) before a Trust Score penalty and reservation-limit reduction apply.
- FR-8.6 Checkout requires acceptance of a **Seller Agreement** (clickwrap, presented at Tier 1 verification) establishing a bailment liability model: the seller bears responsibility for checked-out goods — loss, theft, or damage — from checkout until return/settlement, valued at the hub's declared value, absent hub negligence. Confirmed default per [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q2, pending final counsel review.

### FR-9 AI Assistant Features
- FR-9.1 Product/location recommendations shall be explainable at a basic level to the user (e.g., "recommended because: high sell-through in your area this week") — not an opaque black box, to build seller trust.
- FR-9.2 Demand predictions and pricing suggestions are advisory only; the seller/hub retains final control over actions taken.
- FR-9.4 All customer/seller-facing copy describes recommendations as "smart" or "AI-assisted," never as fully predictive AI, until the rule-based v1 (FR-9.1–9.2) is actually replaced by a trained model — confirmed default per [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q6, applies to marketing copy as well as in-app microcopy.
- FR-9.3 Sales coaching responses are drawn from a maintained content library keyed to logged objection categories (no live audio/transcription requirement for v1).

### FR-10 Trust, Reputation & Disputes
- FR-10.1 Every Seller, Business, and Hub has a visible score computed from a documented, versioned formula (not a hidden black-box number) — see Business Rules for initial formula.
- FR-10.2 Disputes create a formal case object with status (open, evidence-requested, resolved) and SLA-tracked resolution time (default target: 5 business days).
- FR-10.3 Score changes resulting from disputes are only applied after resolution, never pre-emptively.

### FR-11 Payments & Payouts
- FR-11.1 All marketplace money movement (consignment settlement, Spot Me, tips) flows through an escrow/connected-account model; StreetServe never co-mingles user funds with operating funds.
- FR-11.2 Payout timing is tiered: Bronze = held 3 days, Silver = next business day, Gold = instant, consistent with the verification model in Flow 1b.
- FR-11.3 All fee splits (platform, hub, seller/vendor) are itemized and visible to all parties on every transaction receipt.

### FR-12 Homeless Shelter Partner Program
- FR-12.1 Shelter organizations must be verified and approved by StreetServe admin before they can co-sign resident allocations.
- FR-12.2 Resident enrollment requires in-person shelter-staff verification; StreetServe does not independently verify residents who lack standard ID at this tier.
- FR-12.3 Shelter partner reporting is aggregate-only (counts, totals) — no raw per-resident transaction detail is exposed to the shelter without the resident's explicit consent.
- FR-12.4 A shelter partner's liability is capped at the declared value of the specific `cosigned_allocation_cents` for each enrollment (Database doc §3) — a resident default or ban never creates broader financial exposure for the shelter and never triggers debt-collection action against the resident. Confirmed default per [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q4, pending final counsel review of the partner agreement.

## 2. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Map pin updates rendered client-side within 3s of server broadcast; P95 API response time < 300ms for read endpoints, < 800ms for transactional writes |
| Availability | 99.5% uptime target for pilot phase; graceful degradation (cached last-known pins) if live location service is briefly unavailable |
| Scalability | Location/pub-sub layer must handle city-wide concurrent vendor broadcasts (design for 10k concurrent live sessions per metro without architecture change) |
| Security | All PII encrypted at rest and in transit; role-based access control on every endpoint; see [08-security-and-scalability.md](08-security-and-scalability.md) |
| Privacy | Users control location precision/visibility; data retention policy documented and surfaced at signup |
| Compliance | PCI compliance delegated to payment processor (no raw card data touches StreetServe servers); marketplace facilitator sales-tax handling; KYC/AML per payout tier |
| Accessibility | WCAG 2.1 AA target for all core flows, including a non-map list view of nearby vendors/sellers |
| Localization | Architecture supports multi-language content from v1.x, even if only English ships at MVP |
| Auditability | All Trust Score changes, disputes, and payouts are immutably logged for audit and regulatory response |

## 3. Business Rules (Initial, Versioned)

- **Trust Score v1 formula (illustrative starting point, to be tuned with real data):**
  `score = 100 − (25 × unresolved_dispute_rate) − (15 × late_return_rate) + (10 × on_time_rate_bonus) + (avg_review_score − 3) × 5`, clamped to 0–100, recalculated nightly plus on every settlement/dispute resolution.
- Tier thresholds (Bronze/Silver/Gold) are score- **and** verification-gated: verification unlocks the *ceiling*, score determines standing *within* that ceiling.
- A ping-forward earns a tip only once per unique recipient per vendor, ever (prevents repeat-forward farming to the same contact).
- Spot Me is disabled by default for any account under 30 days old or below Bronze verification.
- Category taxonomy carries `requires_license` and `regulated_by` metadata; onboarding blocks broadcast-as-live for a flagged category until a license/permit document is uploaded and reviewed.
- Launch category taxonomy is a curated list (~15–25 categories vetted for the pilot city), not the full ~100-category universe; new categories enter only via admin-reviewed `category_suggestions`, never self-service (Q8).
- Identity verification tier (`verification_records`) is shared across all roles on one account; Trust/Seller/Business scores are tracked separately per role (Q10).
- Marketplace-facilitator sales tax on consignment sales is collected/remitted centrally via Stripe Tax, not delegated to individual hubs or sellers (Q3, pending counsel confirmation).

## 4. Edge Cases (Consolidated Reference)

- Simultaneous queue joins → resolved by server receipt timestamp (FR-3.2).
- Vendor goes offline mid-transaction → transaction held, not silently cancelled; customer notified with resolution options.
- Seller inventory reported sold exceeds checked-out quantity → blocked, flagged for review (FR-8.3).
- Dispute opened after payout already issued → payout can be clawed back only via documented reversal process with both parties notified (never silent debit).
- Shelter resident's shelter partnership ends (resident leaves shelter) → resident's account persists under standard tier rules; shelter co-sign guarantee no longer applies to new allocations.

## 5. Acceptance Criteria (Sample — MVP scope)

- **Given** a vendor is broadcasting live, **when** a customer within radius opens the map, **then** the vendor's pin appears within 3 seconds and reflects a location no more than 10 seconds stale.
- **Given** a customer waves down a vendor, **when** the vendor accepts, **then** the customer is added to the queue at the correct server-timestamped position and sees the correct discount tier.
- **Given** a seller checks out 10 units of a product, **when** they report 11 sold, **then** the system rejects the 11th sale and surfaces an inventory-mismatch error.
- **Given** a seller returns inventory and settles on time, **when** settlement completes, **then** payout is disbursed per their tier timing and the receipt itemizes gross/fee/net.
- **Given** a dispute is opened, **when** it is resolved, **then** Trust Score updates only after resolution, and the change is visible with a reason code.
