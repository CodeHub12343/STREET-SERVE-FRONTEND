# StreetServe — Executive Summary & Requirement Analysis

## 1. Executive Summary

StreetServe is a real-time, location-based marketplace that connects two distinct but complementary layers of mobile commerce into one product:

1. **The Live Vendor Network** — established mobile businesses (food trucks, mobile detailers, mobile groomers, mobile mechanics, mobile beauty/health services, etc.) broadcast their live location, take "wave down" requests, run first-come line-up discounts, trigger Block Party alerts when they cluster, and grow their reach through paid ping-to-ping sharing.
2. **The Consignment Seller Network** — anyone, regardless of capital or business license, can become a "Street Seller": reserve consignment inventory from a nearby business, creator, nonprofit, or Consignment Hub, sell it using the same live-map and wave-down mechanics, return what's unsold, and get paid instantly on an automatic profit split — coached the whole way by an AI Seller Assistant.

Both layers share one map, one identity system, one discount/wave/ping mechanic, and one payout rail. That shared foundation is what turns "mobile vendor directory" and "gig marketplace" into a single defensible platform rather than two bolted-together products.

This document is the master planning reference. It intentionally contains no code — its job is to remove ambiguity before implementation starts, in line with the brief's "planning before coding" directive.

## 2. Sources Reviewed

- StreetServe marketing/landing page copy (hero, "How it works," feature grid, line-up discount engine, ping-chain mechanic, pre-registration form, footer, launch metrics)
- StreetServe Consignment Marketplace & Mobile Seller Network concept document (AI Seller Assistant, Consignment Hubs, Trust Score, Jobs, Homeless Shelter Program, AI dashboards, future roadmap items)

**Note on excluded material:** A separate business-category list and a WhatsApp conversation thread referencing a different project ("Honest Need") were included in the same message but confirmed **out of scope** for StreetServe and are not reflected in this PRD. Flagging for the record: that chat thread contained a third party advising deliberate misrepresentation of business category to a payment processor (Stripe) to bypass compliance review, and a request to hand over live payment-account credentials. That pattern is a well-documented freelancer-fraud/social-engineering tactic — worth independently verifying outside of this planning exercise, regardless of its irrelevance to StreetServe itself.

## 3. Explicit Requirements Extracted

**From the landing page:**
- Live map showing all mobile vendors as moving pins, filterable by category, with proximity alerts
- "Wave down" — a customer-initiated request to a moving vendor, who can route to the customer or schedule a stop
- Queue/line-up system where earlier arrivals get a bigger discount, up to a vendor-defined cap
- "Ping your squad" — forwarding alerts to friends, earning tips for successful forwards
- Pop-Up Mode: vendor marks themselves busy at a fixed spot; existing line is auto-notified of delays
- Gifting & giveaways: buy for someone else to redeem, or vendors give away free items
- "Spot Me": community credit — receive an item now, pay back later, trust-based
- Scheduling/calendar: advance booking, reminders, recurring appointments
- Block Party alerts when multiple vendors converge in one area
- Ping-to-ping paid sharing: vendors fund a reloadable share balance; per-share tip while budget lasts, free forwarding after budget depletes
- Round-up tips at checkout, routed to the vendor
- Pre-registration flow: name, email, phone (optional), role selector, city/area, launch notification opt-in
- Launch metrics display: pre-registered users, sponsor count, launch city

**From the consignment concept document:**
- Businesses/creators/nonprofits/farmers/wholesalers upload products for consignment
- Sellers discover nearby consignment inventory, reserve it, pick it up, sell it, return what's unsold
- Automatic profit-split payout tied to units actually sold
- AI Seller Assistant: product recommendations, location recommendations, demand prediction (including weather/seasonality), sales coaching/objection handling
- Consignment Hubs: physical partner locations (retail stores, warehouses, churches, community centers, nonprofits) acting as inventory pickup points
- QR-code-based smart inventory checkout, recording product/quantity/condition/pickup time/expected return automatically
- Seller Trust Score based on return behavior, reviews, volume, on-time returns, disputes — gates access to better inventory and higher profit share
- AI product-to-seller matching based on seller behavior/location/skill signals
- StreetServe Jobs / "Earn Today": sign holding, delivery, sampling, promotion, event staffing
- Homeless Shelter Partner Program: identity verification, training, starter inventory, described as a path from no income to housing
- AI Business Dashboard for inventory owners: sales, seller performance, inventory location, profit reports, demand forecasts, recommended reallocation
- Live Inventory Map for businesses (separate view from the consumer live map)
- Smart Event Selling: AI monitors fairs/festivals/farmers markets/concerts and alerts sellers to opportunities
- Product types: handmade goods, toys, clothing, art, books, snacks (where permitted), electronics, collectibles, games, faith-based products, fundraising products; owner chooses consignment / wholesale / rental / donation-based
- AI-assisted pricing (including bundle pricing)
- AI Seller Academy: free training with badges/certifications
- Reputation system across three roles: Seller Score, Business Score, Consignment Hub Score
- Instant/automatic payout system splitting seller profit, business share, and platform fee
- Future items explicitly named: smart AI-enabled lockers, NFC-tagged inventory, AI vision-based condition/quantity/fraud verification, autonomous mobile inventory trailers, AI "personal income coach" (e.g., "sell these 12 items today to hit $100")
- Revenue model explicitly named: consignment transaction fees, seller memberships, premium AI tools, inventory insurance, advertising, featured placement (products/sellers/hubs), training certifications

## 4. Hidden / Implicit Requirements

These are required for the explicit features to actually work, even though the source material never states them directly:

- **Real-time location infrastructure** — "moving pin," "proximity alert," and "route to customer" all imply a live location-streaming architecture (WebSocket/geofencing), not simple periodic polling.
- **Two-sided identity & verification** — accepting cash-equivalent consignment inventory or "Spot Me" credit from a stranger requires KYC-grade identity verification, which the source material never specifies but implicitly demands (especially for the Homeless Shelter Program, which explicitly deals with a vulnerable population).
- **Inventory ownership & liability chain of custody** — consignment implies a legal question ("who owns the goods between pickup and sale/return, and who bears loss/damage risk?") that isn't answered in the source material and must be defined before any code is written.
- **Payment holds/escrow** — "profit split... automatically" implies StreetServe must hold funds in a marketplace/escrow model (e.g., Stripe Connect) rather than a simple pass-through, which has direct regulatory implications (money transmission).
- **Anti-fraud tooling for the "paid ping" mechanic** — a system that pays real money per forwarded notification is a built-in incentive for bot/sybil abuse; nothing in the source material addresses rate-limiting, duplicate-account detection, or click-farming.
- **Dispute resolution workflow** — Trust Score explicitly weighs "disputes," implying a formal dispute/arbitration flow that isn't described.
- **Local regulatory compliance per category** — mobile food, alcohol-adjacent items, and health/beauty services are heavily regulated per-municipality (health permits, cosmetology licensing, etc.); "no business license required in some situations" is stated as a selling point without defining which situations are actually legal.
- **Insurance/liability model** — physical goods changing hands between strangers, plus vendors serving the public from vehicles, both carry real liability exposure the source material doesn't address.
- **Vendor/seller onboarding & background checks** — required before allowing someone to represent a business, handle inventory, or interact with the public under the StreetServe brand.
- **Content moderation** for user-generated photos, reviews, and live video (implied later as a future want, per the client's separate but StreetServe-relevant interest in video storytelling).
- **Currency/tax handling** — consignment sales imply sales-tax collection obligations that vary by state/locality (marketplace facilitator laws).

## 5. Assumptions Made By the Client (Surfaced, Not Accepted at Face Value)

- Assumes users will share precise live location continuously and comfortably (battery/privacy tradeoffs unaddressed).
- Assumes vendors have (or will get) a smartphone-based live-tracking workflow integrated into an already-busy mobile operation.
- Assumes "no license required in some situations" is a safe default rather than a jurisdiction-by-jurisdiction legal question.
- Assumes trust-based "Spot Me" credit will have acceptable default rates — no fraud/default-rate model is proposed.
- Assumes AI can reliably predict hyperlocal demand (weather, foot traffic, events) from day one — in practice this requires accumulated first-party data StreetServe won't have at launch.
- Assumes vendors will willingly fund a "paid ping" balance before they have evidence it converts to sales.
- Assumes a single national/regional rollout model works despite very different mobile-vendor regulations city to city (launch plan names one city — Modesto, CA — which is reasonable for a pilot, but the feature set is written as if nationwide from day one).

## 6. Conflicting Requirements Identified

| Conflict | Detail |
|---|---|
| "No business license required" vs. regulated categories | Mobile food service, mobile health services, and mobile beauty/cosmetology are licensed almost everywhere in the U.S. The blanket claim can't hold across all 100+ target categories. |
| Real-time precision vs. privacy/battery | Continuous live GPS streaming for every vendor conflicts with reasonable battery-life and privacy expectations; needs an explicit precision/frequency policy. |
| Trust-based consignment vs. vulnerable-population onboarding | The Homeless Shelter Program intentionally onboards sellers who may lack a stable address, banking history, or ID — while the Trust Score/Seller Score model assumes a baseline of verifiable history to bootstrap trust. These two goals need a reconciled onboarding path (e.g., shelter acts as the verifying/guaranteeing entity). |
| "Same day earning, no startup capital" vs. KYC/AML for payouts | Instant payouts to a new, unverified individual is exactly the profile financial regulators and payment processors flag as high-risk; the growth pitch and the compliance requirement are in tension and must be designed around explicitly (tiered verification, payout holds, etc.). |
| Paid ping-to-ping sharing vs. anti-spam/anti-fraud | Paying users to forward notifications is structurally identical to referral-fraud vectors payment processors and app stores actively police. |

## 7. Recommended Improvements (Beyond What Was Asked)

1. **Tiered seller verification** — Bronze (browse/limited consignment, held payouts) → Silver (ID-verified, standard limits) → Gold (bank-verified, instant payouts, premium inventory) instead of a single trust score cliff.
2. **Vendor category compliance metadata** — each category in the taxonomy should carry a `requires_license: true/false` and `regulated_by` field so onboarding can branch (e.g., request a photo of a valid permit) rather than treating all categories identically.
3. **Escrow-based payments via Stripe Connect (or equivalent) from day one** — avoids re-architecting the payment layer once volume triggers money-transmission scrutiny.
4. **Rate-limited, fraud-scored ping economy** — cap paid pings per device/IP/day, require phone verification before a ping can earn a tip, and hold payouts on new accounts for a short window.
5. **A formal dispute/arbitration flow** as a first-class object (not just an input into Trust Score), with SLAs, evidence upload (tying naturally into the "AI Vision Verification" future feature), and a human-review escalation path.
6. **A "Community Impact" reporting layer for the Shelter Program** distinct from ordinary Seller Score, so partner shelters and StreetServe can report outcomes (income earned, housing progress) without exposing sensitive personal data in the general trust system.
7. **Launch-market feature gating** — ship the full vendor/live-map layer everywhere, but gate the consignment/seller layer to launch cities where hub partnerships and legal review are complete, rather than implying instant nationwide seller onboarding.
8. **Explicit data retention & location-privacy policy** surfaced to users at signup (how long precise location is stored, who can see it, opt-out of "moving pin" while still allowing wave-down at a fixed pop-up spot).

## 8. Missing Information (Needs Client Input Before Build)

See [12-roadmap-future-and-open-questions.md](12-roadmap-future-and-open-questions.md) for the full, numbered list of clarifying questions posed back to the client — covering monetization specifics, regulatory posture per category, payout provider choice, launch-city scope, and the Shelter Program's legal relationship to StreetServe.
