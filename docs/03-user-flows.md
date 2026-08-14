# StreetServe — Complete User Flows

Notation: each flow lists the happy path, then Alternative / Empty / Error / Success states inline.

## 1. Onboarding & Authentication

**Happy path:**
1. Landing page → "Pre-register" or "Get early access" → role selector (Customer / Vendor / Seller / Hub / Sponsor) → name, email, phone (optional), city/area → confirmation screen ("You're #48 in line").
2. Post-launch: app open → phone number or email entry → OTP verification → basic profile (name, photo optional, city) → role selection → role-specific verification (see 1a–1c) → live map (Customer default) or role dashboard.

**1a. Customer verification:** email/phone only. No further gate — can browse and wave down immediately (payment method required only at first transaction).

**1b. Street Seller verification (tiered):**
- Tier 0 (Browse): account created, can view inventory, cannot check out inventory.
- Tier 1 (Bronze): government ID upload + selfie liveness check → can check out low-value inventory, payouts held 3 days.
- Tier 2 (Silver): bank account linked (Stripe Connect) → standard inventory limits, payouts next-day.
- Tier 3 (Gold): sustained trust score threshold → premium inventory access, instant payouts, higher profit share.
- **Shelter Partner path:** Shelter Admin co-verifies resident in-person → resident enters at Tier 1 equivalent without needing prior bank/ID history, with the shelter as guarantor of a capped starter allocation.

**1c. Mobile Vendor / Hub verification:** business name, category selection (triggers license-proof requirement if category is flagged `requires_license: true`), business bank account (Stripe Connect), physical service-area definition.

**Empty state:** no cities live yet → "Coming soon in your area" + pre-register CTA (this is the current landing-page state).
**Error state:** OTP fails 3x → temporary lockout + support link. ID verification rejected → clear reason + re-submit flow, account remains at Tier 0 in the interim.
**Success state:** confirmation + first-run tutorial contextual to selected role.

## 2. Customer Core Flow — Discover & Wave Down

*Updated against client-supplied UI reference (mobile map + business-profile mockup, "Street Serves — Live Map for Mobile Businesses").*

1. Open app → live map centered on user location, with a persistent search bar ("Search businesses or services") and a row of category tabs: **All / Food / Coffee / Services / Shopping / More** (an overflow tab, not the full ~100-category taxonomy — most categories live one level deeper under "More" or under a category's own sub-filter).
2. Map pins render each business's **own custom logo/icon** (not a generic category glyph) inside a colored status ring (see Business Status Model, 2a) with a live "X min away" (travel-time, not straight-line) label beneath the pin.
3. A floating **"Serve Near Me"** button recenters the map on the user's current location and refreshes nearby results — the fast path back to "what's around me right now" after panning the map. *(Interpreted from the mockup; confirm with client whether this should instead broadcast a general service request to all nearby vendors rather than just recentering — flagged in Open Questions.)*
4. Tap a pin → business profile sheet opens (bottom sheet on mobile): cover photo, logo, name, category, star rating + review count, "Open Now" (or Driving/Parked/Away-Closed, per 2a) badge, distance/ETA.
5. Profile sheet action row: **Directions** (deep-links to the user's native maps app for the business's current location), **Follow**, **Notify Me**, **Message** (see 2b/2c for the latter two).
6. Profile sheet detail body: About/description, hours, a combined status+location line (e.g., "Parked • Main St & 5th Ave"), **Today's Special** (a single highlighted deal, vendor-editable), **Menu** (link into the full item list — see 2d for ordering from it), photo gallery, and a reviews section (aggregate rating + list).
7. From the profile sheet, the customer either taps **"Wave down"** (this flow, continues below) or uses **Order/Book** (2d) to transact without waving down.
8. Wave down → request sent with user location → vendor accepts (routes toward user) or offers a scheduled stop time.
9. User joins line-up automatically on wave-down acceptance → sees live position and current discount tier.
10. Vendor arrives / opens for service → user is notified → transaction (see Flow 5) → optional round-up tip → optional review.

**Alternative flow — Pop-Up Mode:** a vendor currently in **Driving** status stops and switches to **Parked** while it still has an active queue expecting continued movement → affected customers get an automatic delay notification with a new ETA; new customers can still wave down and join the queue but see a "Pop-Up — expect a wait" badge. (Pop-Up Mode is this specific Driving→Parked transition-with-active-queue case, not a fourth status — see 2a.)

**Alternative flow — Block Party:** system detects ≥2 vendors converging within a defined radius/time window → broadcasts a Block Party push notification to nearby opted-in users → tapping it opens a multi-vendor cluster view.

**Empty state:** no vendors within radius → "Nothing moving near you yet" + suggestion to widen radius or view scheduled vendors.
**Error state:** wave-down sent but vendor doesn't respond within SLA (e.g., 5 min) → auto-expire with apology + suggest next-closest vendor.
**Failure state:** vendor cancels after accepting → user notified immediately with reason (if provided) + queue position preserved if reroute is possible.

### 2a. Business Status Model (cross-cutting — drives pin color/icon ring and profile badge)

| Status | Meaning | Customer-facing behavior |
|---|---|---|
| **Driving** (green) | Business is actively moving on a route | Pin shows live movement + ETA; "Follow" surfaces real-time tracking |
| **Parked** (blue) | Business is stationary and open for service | Wave-down, Order, and Book all available; location line shows cross-streets |
| **Away / Closed** (purple) | Business is not currently serving | Pin greyed/hidden per user's map preference; wave-down and ordering disabled, "Notify Me" remains available so the user is alerted when status changes |

`live_sessions.status` (Database doc) should use this three-value enum (`driving` / `parked` / `away_closed`) rather than the previously drafted `live`/`pop_up`/`offline` — **Pop-Up Mode becomes a transient flag/event on top of a Driving→Parked transition**, not a fourth stored status, so it can trigger the delay-notification side effect described above without adding a state the rest of the system has to reason about.

### 2b. Follow & Favorites Flow

1. Customer taps **Follow** on a business profile → business is added to the **Favorites** tab (bottom nav) → customer receives proximity alerts and status-change notifications (e.g., "Taco Loco just went Driving near you") for that business going forward, on an ongoing basis.
2. Favorites tab lists followed businesses with an at-a-glance current status chip (Driving/Parked/Away-Closed) so the customer can scan for who's active without opening the map.
3. Unfollow at any time from the profile sheet or the Favorites list.

**Distinction from Notify Me:** **Notify Me** is a lighter-weight, one-off alert ("tell me the next time this business is near me") that does *not* add the business to Favorites or imply an ongoing relationship — a customer can use Notify Me without ever following, and can follow without leaving a standing Notify Me alert active. Both are configurable independently in the notification settings referenced in Flow 12.

### 2c. Direct Messaging Flow

1. Customer taps **Message** on a business profile → opens a scoped chat thread with that business (pre-filled with context such as "Asking about: Taco Loco").
2. Thread appears in the **Messages** tab (bottom nav) going forward; business owners see incoming threads in their vendor dashboard.
3. Scope is intentionally narrow (menu questions, current-location confirmation, order/booking clarification) — not a general social DM system. Rate-limited and moderated the same as reviews to prevent spam/harassment (see Security doc).

**Empty state:** no active threads → "Message a business from their profile to ask a question."

### 2d. Direct Order Flow (order without waving down)

1. From a business's profile sheet → **Menu** → select item(s) and quantity → **Order** (for pickup at the business's current Parked location) or **Book** (scheduled service — see Flow 6, unchanged).
2. Order is confirmed, queued to the business's dashboard, and tracked in the customer's **Orders** tab (bottom nav) alongside wave-down transaction history and bookings.
3. Business accepts/prepares → customer notified when ready for pickup at the business's current parked location.

**Edge case:** business goes **Away/Closed** or starts **Driving** away after an order is placed but before pickup → customer notified immediately with the option to cancel (refund) or receive an updated pickup ETA if the business is en route to complete the order elsewhere.
**Error state:** ordered item goes out of stock after ordering → business can partially fulfill (with adjusted refund) or cancel the line item, customer notified either way — never silently substituted.

### 2e. Bottom Navigation (Customer mode, per client mockup)

**Map · Favorites · Orders · Messages · Profile** — this is the confirmed customer-facing tab bar. It differs from the tab bar previously drafted in [06-ux-and-design-system.md](06-ux-and-design-system.md) §3 (which had "Activity / Jobs-Sell / Wallet" in place of "Favorites / Orders / Messages"). **Open item:** reconcile the two — likely resolution is that Jobs/Sell and Wallet become entry points reachable from Profile rather than their own top-level tabs, keeping the customer tab bar exactly as the client specified, but this should be confirmed rather than assumed (see Open Questions).

## 3. Line-Up Discount Flow

1. Customer joins a vendor's queue (via wave-down or by checking in on arrival at a known stop).
2. System timestamps join order → assigns discount tier per vendor-configured schedule (e.g., 1st = 5%, 2nd = 10%, 3rd = 15%, cap thereafter).
3. Queue position and current discount shown live; updates as others join/leave.
4. At redemption, discount auto-applies to the transaction total.

**Edge case:** two customers join at effectively the same timestamp → resolved by server-authoritative request receipt order (not client clock), with a visible "tie-break: first request received" rule in ToS.
**Edge case:** customer joins queue then leaves radius / cancels → tier reflows for remaining queue (configurable per vendor: "hold my spot" vs. "release on cancel").
**Success state:** discount applied + receipt shows "You saved $X by being customer #2."

## 4. Ping-to-Ping Sharing Flow

1. Customer receives a vendor alert (proximity, Block Party, or wave-down confirmation) → taps "Forward" → selects contacts / share link.
2. If the vendor has an active paid-sharing budget: forwarding is logged, and a tip is queued to the *forwarder* once the recipient takes a qualifying action (defined in Business Rules — e.g., opens app within X hours and is a new or reactivated user).
3. If vendor budget is depleted or forwarder has hit a rate limit: forward still works (free/organic), but no tip accrues — UI clearly labels "Free share" vs. "Paid share."
4. Vendor can reload the paid-sharing balance any time from their dashboard, or pause it.

**Fraud guard (recommended, addressed in Security doc):** tip payout requires the referred user to be a new device/account passing basic fraud checks — self-referral and repeat-device abuse do not earn tips.
**Empty state:** vendor has never funded paid sharing → all shares are organic/free by default; UI never implies a tip that isn't guaranteed.
**Error state:** share attempted but recipient already exists as an active user → tip conditions not met → forwarder sees "No tip earned — user already active" (transparent, not silent).

## 5. Transaction, Gifting, Spot Me & Round-Up Flow

**Standard purchase:** queue reached / product selected → payment method charged (card on file, wallet balance, or Stripe payment sheet) → line-up discount applied → optional round-up prompt → receipt.

**Gifting:** sender selects a product/item → chooses "send as gift" → enters recipient (contact/phone) → pays → recipient gets a redemption code/notification → recipient redeems at the vendor or arranges pickup. Unredeemed gifts expire per vendor policy with sender notified before expiry.

**Vendor giveaway:** vendor marks item(s) as free/community giveaway → visible on map with a "Free" badge → customers can request without payment flow, capped by vendor-set daily quantity.

**Spot Me:** customer requests an item on credit → vendor (or a peer, if peer-to-peer is enabled) reviews requester's Trust/Seller Score and accepts or declines terms (amount, repay-by date) → item transferred → repayment reminder sent to customer as due date approaches → on-time repayment improves Trust Score; default is recorded and affects future Spot Me eligibility.

**Round-up tip:** at any checkout, customer is offered "round up to $X, tip goes to vendor" → opt-in, one tap, no separate payment flow.

**Error/failure states:** card decline → retry / alternate method, transaction held, item not released. Spot Me default → dispute/collections flow per Business Rules (no aggressive collection — reputation-based consequence, not debt collection, per the platform's stated ethos).

## 6. Scheduling Flow

1. Customer opens a vendor's profile → "Book" → selects service, available time slot, recurring option if offered.
2. Confirmation + calendar entry + reminder notifications (24h, 1h before).
3. Vendor sees booking on their schedule dashboard; can accept, propose alternate time, or decline (with reason).
4. Day-of: standard wave-down/arrival flow, but pre-authenticated as a scheduled booking (skips general queue by default, configurable per vendor).

**Edge case:** customer no-shows → vendor can mark no-show, which is a Trust Score input for repeat customers.
**Edge case:** vendor cancels a booked slot → customer notified immediately with rebook options, and — for services — potential compensation per vendor policy (e.g., discount on rebook).

## 7. Street Seller Flow — Consignment Lifecycle

1. Seller opens "Sell" tab → AI Seller Assistant surfaces recommended products + nearby high-demand locations (based on category, event calendar, weather, historical performance).
2. Seller selects a Consignment Hub or product listing → reserves quantity → travels to hub.
3. At hub: QR-code checkout — scans hub code and/or product tags → system records product, quantity, condition (photo capture, tying to future AI Vision Verification), pickup timestamp, expected return-by time.
4. Seller goes live on the map as an active seller with their current inventory visible to nearby customers → customers can wave down a seller exactly like a vendor.
5. Seller sells items → each sale logged (via in-app checkout, QR scan-out, or manual entry with photo proof) → real-time inventory count decrements.
6. At/before the return deadline: seller returns unsold inventory to hub (QR scan-in, condition photo) or extends the window if the hub allows.
7. System reconciles: units sold × price − platform fee − hub cut = seller payout; automatically split and disbursed per seller's payout tier.
8. Trust Score updates based on: on-time return, condition of returned goods, dispute-free settlement, sales performance.

**AI Sales Coaching (in-flow):** during selling, seller can tap "Help me sell this" → AI offers a scripted response to a logged objection type (e.g., price pushback) drawing from a library of coaching content, not live customer conversation transcription.

**Empty state:** no consignment inventory available near seller → AI suggests widening radius, waiting for restock, or picking up a Jobs gig instead.
**Error state:** seller fails to return or settle inventory by deadline → account flagged, future reservation limits reduced, hub notified, grace-period reminder sent before penalty applies.
**Failure state:** items reported lost/stolen/damaged beyond normal wear → dispute flow opens, evidence (photos, timestamps) reviewed, resolution affects Trust Score and may create a payable balance owed by the seller.
**Success state:** payout confirmation screen with breakdown (units sold, gross, fee, net) + Trust Score delta shown transparently.

## 8. Consignment Hub / Business Owner Flow

1. Business completes Hub registration (location, hours, contact, payout account).
2. Uploads product catalog: name, photos, category, unit cost/value, consignment terms (split %, return window, condition requirements), quantity available.
3. Views AI Business Dashboard: live inventory location (which sellers have what, where), sales performance, demand forecast, "move inventory to X this weekend" recommendations.
4. Approves/monitors seller checkouts (can require manual approval above a configured value, or allow auto-approval for trusted-tier sellers).
5. Receives payout automatically on each settlement; can adjust terms per product going forward.

**Edge case:** hub wants to recall inventory early (e.g., item recalled, price error) → recall request pushed to any seller currently holding it, with a defined grace period to return.

## 9. Jobs / "Earn Today" Flow

1. Seller (or any verified user) opens Jobs tab → sees nearby gig postings (sign holding, delivery, sampling, event staffing) ranked by AI on pay-per-time and proximity.
2. Accepts a gig → check-in (QR/geofence) → performs task → check-out → payout processed same-day per gig terms.

**Empty/error states:** no gigs nearby → suggests consignment selling instead; gig poster cancels after acceptance → worker notified + compensated per no-show policy if applicable.

## 10. Homeless Shelter Partner Flow

1. Shelter becomes a verified Community Partner (StreetServe admin review of the organization itself).
2. Shelter staff verify a resident in person, co-sign a capped starter consignment allocation, and enroll the resident in AI Seller Academy basics.
3. Resident sells under the standard Street Seller flow (Flow 7) with allocation limits initially set by the shelter/platform rather than a cold-start trust score.
4. Shelter (not StreetServe generally) can view aggregate, privacy-preserving outcome data for their own residents (e.g., "3 residents earned a combined $420 this week") to report to their own funders — not raw transaction detail.

## 11. Vendor Growth Flow — Paid Ping Budget

1. Vendor dashboard → "Ping Sharing" → sets per-share tip amount and total reload budget.
2. Budget depletes as qualifying shares occur (Flow 4) → dashboard shows real-time remaining balance and attribution (signups/sales traced to shared pings).
3. Vendor reloads or pauses at any time.

## 12. Notification & Alert Model (cross-cutting)

- Proximity alert (vendor entering user's area), **Follow status-change alert** (a followed business goes Driving/Parked near the user — 2b), **Notify Me one-off alert** (2b), Wave-down accepted/declined, Queue position change, Pop-Up delay notice, Block Party alert, Booking reminder, **Order status update** (accepted/ready/cancelled — 2d), **New message** (2c), Gift received, Spot Me due-date reminder, Consignment return-deadline reminder, Payout confirmation, Trust Score change, Dispute status update, Jobs gig match.
- All notifications configurable per category in settings; safety-critical ones (payout, dispute, verification) cannot be fully muted, only redirected to email.
