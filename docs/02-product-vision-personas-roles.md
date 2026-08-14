# StreetServe — Product Vision, Personas & User Roles

## 1. Product Vision

**Purpose:** Turn any city into a live, navigable marketplace — where mobile businesses are visible and reachable in real time, and where anyone can start earning the same day by selling inventory they don't have to own.

**Tagline (from source material):** *"See good, do good."*

**Business goals:**
- Become the default discovery layer for mobile commerce in a city — the map people check before a food truck, mobile detailer, or mobile groomer is "found" any other way.
- Build a second revenue-generating side (consignment/gig selling) that turns StreetServe from a directory into an economic on-ramp, increasing both engagement frequency and defensibility (network effects on both supply and demand sides).
- Prove the model in a single pilot city (Modesto, CA) with a named sponsor before regional/national expansion.

**Target users:** three sides of one marketplace —
1. **Customers** who want to find and interact with mobile businesses nearby.
2. **Mobile Vendors** who run an established mobile business and want more visibility, better queue management, and viral reach.
3. **Street Sellers** who want to earn income immediately, without capital, inventory, or a storefront, by moving consigned product.

A fourth, adjacent group — **Consignment Hubs / Inventory Owners** (businesses, creators, nonprofits, retailers) — supplies the goods sellers move, and a fifth — **Shelter/Community Partners** — provides a structured on-ramp for the most vulnerable sellers.

**Pain points addressed:**
- Customers can't tell where a mobile vendor is *right now*, or whether it's worth the trip (StreetServe: live pins, proximity alerts, wave-down).
- Mobile vendors have no built-in way to reward loyal early customers or convert foot traffic into shareable buzz (StreetServe: line-up discounts, ping-to-ping, Block Party).
- People who want to earn money quickly have no legal, low-friction path to sell physical product without inventory capital, a business license, or storefront overhead (StreetServe: consignment + AI Seller Assistant).
- Small makers, nonprofits, and inventors have inventory but no distribution muscle (StreetServe: Consignment Hubs + AI matching to available sellers).
- People in economically vulnerable situations (homeless individuals, those between jobs) lack a same-day, dignity-preserving path to income (StreetServe: Shelter Partner Program).

**Success metrics (recommended, not stated by client — flagged as such):**
- Activation: % of pre-registered users who complete their first wave-down or first consignment sale within 14 days of launch.
- Vendor liquidity: median time from "vendor goes live" to "first wave-down received."
- Seller velocity: median time from "seller reserves inventory" to "first item sold."
- Ping economy health: ratio of paid pings that convert to a sale/wave-down vs. flagged as fraudulent.
- Trust-score integrity: dispute rate per 1,000 consignment transactions.
- Shelter Program outcome: % of enrolled sellers with 30-day active earning streaks (a proxy for the stated "income → housing" goal).

## 2. User Personas

### Persona 1 — "Maria," the Convenience Customer
- 34, works two jobs, discovers via a friend's ping share.
- Wants: know if the taco truck is close *right now*, get a discount for showing up early, tip easily.
- Frustration: has driven to a food truck's "usual spot" before and found it gone.
- Primary flows: live map, wave down, line-up, round-up tip.

### Persona 2 — "Deshawn," the Mobile Vendor Owner
- Runs a two-truck ice cream/shaved-ice operation, tech-comfortable but time-poor.
- Wants: fewer wasted stops, a way to reward the customers who show up first, viral reach without ad spend.
- Frustration: social media posts about location get buried; no visibility into where demand actually is.
- Primary flows: vendor dashboard, live broadcast, queue management, Pop-Up mode, paid ping budget, Block Party trigger.

### Persona 3 — "Angela," the Street Seller (gig side)
- Between jobs, no capital, has a car and free afternoons.
- Wants: a legitimate way to earn today without buying inventory upfront, clear guidance on what/where to sell.
- Frustration: doesn't know what sells, doesn't know where to go, afraid of losing money on unsold stock.
- Primary flows: browse nearby consignment inventory, AI recommendations, QR checkout, AI sales coaching, return/settle, instant payout.

### Persona 4 — "Grace Community Church" / Nonprofit Inventory Owner
- Has donated goods and handmade crafts, wants distribution without operating a storefront or logistics team.
- Wants: visibility into where inventory is moving, trust that sellers will return or pay for what they take.
- Frustration: no channel to reach willing sellers or measure where demand actually is.
- Primary flows: business dashboard, consignment hub registration, inventory upload, seller performance/trust visibility, demand forecasts.

### Persona 5 — "Marcus," Homeless Shelter Resident
- No income, no bank history, motivated but lacks a traditional on-ramp.
- Wants: same-day earning without needing to already have money, ID, or a business.
- Frustration: most gig platforms assume a car title, a smartphone data plan, or a credit history he doesn't have.
- Primary flows: shelter-mediated verification, guided starter inventory, heavily AI-coached first sale, path toward standard Seller tier over time.

### Persona 6 — "Priya," Consignment Hub Operator
- Runs a gift shop wanting foot traffic and small commission revenue from being a pickup point.
- Wants: minimal operational overhead, clear liability boundaries, simple check-in/check-out.
- Primary flows: hub registration, QR-based checkout station, hub score, payout reconciliation.

## 3. User Roles, Permissions & Access Levels

| Role | Core Capability | Key Permissions | Notes |
|---|---|---|---|
| **Guest** | Browse public live map | View public vendor pins (approximate location only), view public product listings | No wave-down, no messaging, no payments until account created |
| **Customer** | Discover, transact, share | Wave down, join queue, gift, Spot Me request, schedule bookings, round-up tip, forward pings, leave reviews | Default role on signup |
| **Street Seller** | Move consignment inventory | Reserve/check out inventory, use AI assistant, list current inventory on live map, receive payouts, request Jobs gigs | Requires identity verification tier before payout eligibility scales up |
| **Mobile Vendor (Business)** | Operate a live business presence | Broadcast live location, manage queue/discount tiers, trigger Pop-Up mode, fund/manage paid ping balance, view vendor dashboard, accept Spot Me terms | Requires business verification (and category-specific license proof where applicable) |
| **Consignment Hub / Inventory Owner** | Supply inventory to sellers | Upload products, set consignment/wholesale/rental/donation terms, manage hub location(s), view AI business dashboard, approve seller checkouts | Can overlap with Mobile Vendor role (a vendor can also be a hub) |
| **Shelter/Community Partner Admin** | Sponsor vulnerable sellers | Verify resident identity, co-sign starter inventory allocation, view aggregate (non-sensitive) outcome reporting | Acts as guarantor in the trust model; distinct from a normal Hub |
| **Sponsor** | Brand visibility during pre-launch/launch | Logo placement, sponsor dashboard (impressions/signups attributed), no transactional access | E.g., "Wonder Ice — national partner" |
| **Platform Admin / Trust & Safety** | Operate the platform | Full read access, dispute arbitration, account suspension, fraud-flag review, category/compliance metadata management, payout holds | Internal role, tiered (support agent vs. full admin) |
| **Platform Ops / Finance** | Manage money movement | Payout configuration, fee schedule, sponsor billing, reconciliation reports | Internal role, least-privilege by default |

**Design rule:** a single account can hold multiple roles concurrently (e.g., a customer who is also a Street Seller and later becomes a Mobile Vendor) — roles are additive capabilities on one identity, not separate account types, so trust/history carries forward.
