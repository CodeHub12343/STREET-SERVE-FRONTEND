# StreetServe — Database Design

Primary store: PostgreSQL + PostGIS (see [07-technical-architecture-and-stack.md](07-technical-architecture-and-stack.md) for rationale). Secondary store: MongoDB for high-volume event/log data (raw location pings, chat, AI recommendation logs) — referenced but not schema'd in detail here since it's append-only/document-shaped by design.

## 1. Core Entities

- **users** — id, email, phone, password_hash (if not fully delegated to managed auth), display_name, photo_url, home_location (geography point), created_at, status (active/suspended).
- **user_roles** — user_id, role (customer | seller | vendor | hub | shelter_admin | sponsor | admin), granted_at, revoked_at (nullable) — supports the additive multi-role model.
- **verification_records** — user_id, tier (bronze/silver/gold), verification_type (id_document, selfie_liveness, bank_account, shelter_cosign), status, provider_reference (KYC provider's own ID), verified_at. Keyed to `user_id`, not to a specific role — **verification is intentionally portable across roles** (a Seller who later registers as a Vendor does not redo ID/liveness checks), per the recommended default in [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q10.
- **businesses** — id, owner_user_id, name, category_id (FK), description, logo_url (customer-facing map pin icon, per client UI reference), cover_photo_url, hours_json, today_special_menu_item_id (nullable FK → menu_items), service_area (geography polygon or radius), payout_account_ref (Stripe Connect account id), is_hub (bool), created_at.
- **categories** — id, name, parent_category_id (nullable, for grouping e.g. "Mobile Auto Services" > "Mobile Detailing"), top_level_tab (enum: food | coffee | services | shopping | more — drives the client-specified map filter tabs), requires_license (bool), regulated_by (text/nullable). Launch data is a **curated ~15–25 rows**, not the full ~100-category universe from the source material — see [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q8.
- **category_suggestions** — id, submitted_by_business_id, proposed_name, proposed_parent_category_id (nullable), justification (text), status (pending/approved/rejected), reviewed_by, reviewed_at. Backs the "suggest a category" flow (Q8's recommended default) — new categories are never self-service; approval creates the corresponding `categories` row (with `requires_license`/`regulated_by` set by the reviewing admin, not the submitter).
- **license_documents** — business_id, category_id, document_url, status (pending/approved/rejected), reviewed_by, reviewed_at.
- **live_sessions** — id, actor_type (business | seller), actor_id, current_location (geography point), status (**driving | parked | away_closed** — revised per client UI reference from an earlier live/pop_up/offline draft), started_at, last_ping_at. Pop-Up Mode is **not** a status value here — it's an event recorded in `pop_up_events` (below) triggered when a session transitions driving→parked while it has an active queue. *(Recommended: back this table with a Redis mirror for the hot read path; Postgres row is the durable/auditable record, Redis is the low-latency broadcast source — see Architecture doc §4/§9.)*
- **follows** — id, follower_user_id, business_id, created_at. Unique on (follower_user_id, business_id). Powers the customer's Favorites tab and ongoing status/proximity alerts (distinct from `notify_me_requests` below).
- **notify_me_requests** — id, user_id, business_id, status (pending/fulfilled/expired), created_at, fulfilled_at. One-off "alert me next time this business is nearby" — does not imply a Follow relationship and is cleared once fulfilled.
- **message_threads** — id, customer_id, business_id, created_at, last_message_at.
- **messages** — id, thread_id (FK), sender_user_id, body, created_at, read_at (nullable).
- **menu_items** — id, business_id, name, description, photo_url, price_cents, is_available (bool), created_at. Distinct from consignment `products` (below) — menu items are the direct-order/wave-down catalog for an established business, not consignment inventory.
- **orders** — id, customer_id, business_id, status (pending/accepted/ready/completed/cancelled), fulfillment_type (pickup_now | scheduled — links to `bookings` when scheduled), total_cents, discount_applied_cents, created_at, ready_at, cancelled_reason (nullable).
- **order_items** — id, order_id (FK), menu_item_id (FK), quantity, unit_price_cents.

## 2. Vendor / Live-Map Domain

- **wave_downs** — id, customer_id, business_id (or seller_id), requested_at (server timestamp, authoritative), status (pending/accepted/declined/expired), eta_seconds, accepted_at.
- **queues** — id, business_id (or seller_id), status (open/closed).
- **queue_entries** — id, queue_id, customer_id, joined_at (server timestamp), position (computed, not stored redundantly — derive from joined_at ordering), discount_tier_applied, left_at (nullable), hold_expires_at.
- **discount_schedules** — business_id, position, discount_percent, is_cap (bool).
- **pop_up_events** — id, business_id, started_at, ended_at, notified_count.
- **block_party_events** — id, centroid_location (geography point), radius_m, business_ids (array or join table `block_party_participants`), detected_at, broadcast_at, notified_user_count.
- **pings** — id, sender_user_id, recipient_contact_hash, business_id, is_paid, tip_amount (nullable), qualifying_action_completed_at (nullable), tip_paid_at (nullable), created_at.
- **ping_budgets** — business_id, balance_cents, per_share_tip_cents, status (active/paused).
- **transactions** — id, customer_id, business_id (or seller_id), amount_cents, discount_applied_cents, tip_cents, round_up_cents, platform_fee_cents, status (pending/completed/refunded/disputed), payment_intent_ref (Stripe), created_at.
- **gifts** — id, sender_id, recipient_contact, transaction_id, redemption_code, status (pending/redeemed/expired), expires_at.
- **giveaways** — id, business_id, product_name, daily_quantity_cap, quantity_claimed_today, reset_at.
- **spot_me_requests** — id, requester_id, counterparty_id (vendor or peer), amount_cents, repay_by, status (pending/accepted/declined/repaid/defaulted), decided_at.
- **bookings** — id, customer_id, business_id, service_id, scheduled_at, status (booked/completed/cancelled/no_show), recurrence_rule (nullable), reminder_sent_24h, reminder_sent_1h.

## 3. Consignment / Seller Domain

- **hubs** — business_id (FK, 1:1 with businesses where is_hub=true), checkout_qr_secret, address, hours_json.
- **products** — id, hub_id (owner), name, category_id, photos (array of URLs), unit_value_cents, consignment_split_percent, return_window_hours, condition_requirements (text), listing_type (consignment/wholesale/rental/donation), quantity_available.
- **inventory_checkouts** — id, seller_id, product_id, hub_id, quantity, condition_photo_url, checked_out_at, expected_return_at, status (active/settled/overdue/disputed).
- **inventory_sales** — id, checkout_id, quantity_sold, sale_amount_cents, sold_at, proof_photo_url (nullable), logged_via (qr_scan/manual).
- **inventory_returns** — id, checkout_id, quantity_returned, condition_photo_url, returned_at, condition_assessment (good/damaged/lost).
- **settlements** — id, checkout_id, gross_sales_cents, platform_fee_cents, hub_share_cents, seller_net_cents, payout_ref (Stripe transfer id), settled_at.
- **trust_scores** — subject_type (seller/business/hub), subject_id, score (0–100), formula_version, computed_at. Deliberately scoped **per role** (not per user) — a Seller Score and a Business Score for the same person are tracked independently, since the underlying behaviors differ; only `verification_records` (above) is shared across roles. Confirmed default per Q10.
- **disputes** — id, subject_type, subject_id (seller/business/hub), related_entity_type (checkout/transaction/spot_me), related_entity_id, opened_by, status (open/evidence_requested/resolved), resolution, resolved_at, sla_due_at.
- **jobs_postings** — id, poster_business_id (nullable, could be platform-posted), title, description, location (geography point), pay_cents, pay_unit (flat/hourly), status (open/filled/cancelled).
- **job_applications** — id, job_id, applicant_id, status (applied/accepted/checked_in/completed/no_show), checked_in_at, checked_out_at, payout_ref.
- **shelter_partners** — id, organization_name, verified_by_admin_id, verified_at, status.
- **shelter_enrollments** — id, shelter_partner_id, resident_user_id, cosigned_allocation_cents, enrolled_at, staff_verifier_name. `cosigned_allocation_cents` is the **hard cap on the shelter partner's liability** — per the recommended default in [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q4, a resident default/ban only ever writes off or recovers against this specific allocation and never creates broader exposure for the shelter or debt-collection action against the resident.
- **ai_recommendations** — id, seller_id, recommendation_type (product/location/pricing), payload_json, reason_summary (text, satisfies FR-9.1's "explainable" requirement), shown_at, accepted (bool nullable).

## 4. Reputation, Reviews & Sponsors

- **reviews** — id, author_id, subject_type (business/seller), subject_id, rating (1–5), comment, transaction_id (nullable), created_at.
- **sponsors** — id, name, logo_url, tier, launch_city_id, impressions_count, attributed_signups_count.
- **cities** — id, name, state, status (pre_launch/live), launch_date.
- **preregistrations** — id, full_name, email, phone (nullable), intended_role, city_id, created_at — direct carry-over of the existing marketing-site waitlist capture.

## 5. Relationships (Summary)

- `users` 1—N `user_roles`, 1—N `verification_records`, 1—N `businesses` (as owner), 1—N `transactions` (as customer).
- `businesses` 1—1 `hubs` (optional), 1—N `products`, 1—N `queues`, 1—N `live_sessions`.
- `products` 1—N `inventory_checkouts` 1—N `inventory_sales`, 1—1 `inventory_returns`, 1—1 `settlements`.
- `queues` 1—N `queue_entries`; `business` 1—N `discount_schedules`.
- `disputes` polymorphically references `inventory_checkouts`, `transactions`, or `spot_me_requests` via `related_entity_type` + `related_entity_id`.
- `shelter_partners` 1—N `shelter_enrollments` 1—1 `users` (resident).

## 6. Indexes (Key Ones, Beyond Primary Keys)

- `live_sessions (current_location)` — GiST index (PostGIS) for radius/proximity queries; this is the single most latency-sensitive query in the system.
- `live_sessions (status, last_ping_at)` — to quickly purge/flag stale sessions.
- `queue_entries (queue_id, joined_at)` — composite, for authoritative position ordering (FR-3.2).
- `wave_downs (business_id, status, requested_at)` — SLA expiry sweeps.
- `inventory_checkouts (seller_id, status)` and `(hub_id, status)` — dashboards on both sides.
- `transactions (business_id, created_at)` and `(customer_id, created_at)` — history/reporting.
- `pings (business_id, recipient_contact_hash)` — unique constraint enforcing "one tip per unique recipient per vendor, ever" business rule.
- `disputes (status, sla_due_at)` — for SLA-breach alerting.
- `trust_scores (subject_type, subject_id, computed_at desc)` — latest-score lookups.
- `follows (business_id)` and unique `(follower_user_id, business_id)` — Favorites lookups and duplicate-follow prevention.
- `notify_me_requests (business_id, status)` — sweep job matching pending requests against status changes (away_closed → driving/parked).
- `messages (thread_id, created_at)` — thread pagination; `message_threads (business_id, last_message_at desc)` — vendor inbox sort.
- `orders (business_id, status)` and `(customer_id, created_at)` — vendor order queue and customer order history.
- `menu_items (business_id, is_available)` — active menu rendering.

## 7. Validation Rules (Representative)

- `discount_schedules`: `discount_percent` strictly increasing by `position`; exactly one row per business marked `is_cap`.
- `inventory_sales` sum(`quantity_sold`) for a checkout must never exceed `inventory_checkouts.quantity` (enforced at the application transaction layer, not just a check constraint, since it involves aggregation).
- `spot_me_requests`: blocked at creation time if requester `account_age_days < 30` or verification tier `< bronze` (Business Rule from PRD §3).
- `pings`: unique `(business_id, recipient_contact_hash)` where `is_paid = true`, enforced via a partial unique index.
- `categories.requires_license = true` blocks a `businesses` row's `live_sessions` insert (going live) unless a `license_documents` row with `status = approved` exists for that category.
- `orders`: `order_items` sum must equal `orders.total_cents` minus `discount_applied_cents` (enforced at the application transaction layer, same pattern as `inventory_sales`); an order cannot transition to `ready` while the business's current `live_sessions.status = away_closed`.
- `businesses.today_special_menu_item_id`, if set, must reference a `menu_items` row belonging to the same `business_id` (enforced via a composite FK or application check).
- `settlements`: `seller_net_cents = gross_sales_cents - platform_fee_cents - hub_share_cents` enforced at computation time (application layer), row is immutable once written (corrections happen via a new offsetting row, never an update — audit requirement).
