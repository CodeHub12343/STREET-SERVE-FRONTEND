# Final Implementation Checklist

> **Status 2026-08-09.** Phases 1–8 are built; the engineering items below are done and verified. What remains is **six items that need a person, not a commit** — and they are the ones that gate a real launch:
>
> 1. 🔴 **Rotate the leaked production API key** (Phase 0.1b)
> 2. 🔴 **Merchant of record + tax treatment** — ADR-007 §5; tax is wired but flag-off until an accountant answers
> 3. 🔴 **Legal review of the acceptable-use agreement** — text is a placeholder, `reviewed: false`, and the flow checks that flag
> 4. 🔴 **Real address-side artwork** for `POSTCARD_BACK_TEMPLATE_URL` — currently a deliberately obvious placeholder
> 5. 🔴 **Vendor payment method on file** — an empty retainer stalls every order at `payment_hold`
> 6. 🔴 **Run the pilot** — `PILOT_PLAYBOOK.md`. Nobody can write a test proving a card looked right in someone's hand
>
> Access is default-denied to an ops allowlist (`POSTCARD_ACCESS_MODE = 'pilot'`), so none of the above can be reached by accident.

The gate between "built" and "a real business's money buys real paper in real mailboxes." Nothing here is a nice-to-have; items marked 🔴 block launch outright.

---

## Phase 0 — Business (blocks all engineering)

- [ ] 🔴 PCM API key rotated; old key confirmed dead
- [ ] 🔴 New key in the platform secret store; separate sandbox and production keys
- [ ] 🔴 Written answer: will PCM onboard as a Stripe Connect connected account? (determines the whole payment architecture)
- [ ] 🔴 Merchant of record decided and recorded
- [ ] 🔴 Sales tax treatment scoped with an accountant
- [ ] 🔴 Partnership agreement signed
- [ ] 🔴 Real per-piece cost, SKU list, and minimum order quantity documented
- [ ] Revenue share (10%) confirmed in the agreement, with the mechanism for changing it
- [ ] Vendor-credential handling practice written down (portal → secret store, never chat)

## Discovery

- [ ] 🔴 PC-17-A spike complete and written up
- [ ] 🔴 Artwork spec confirmed: trim, bleed, DPI, colour profile, formats
- [ ] 🔴 Targeting taxonomy confirmed; PC-6 (neighborhood) feasibility answered yes or no
- [ ] 🔴 Vendor idempotency support confirmed — or local dedupe designed
- [ ] Webhook events and signature scheme documented
- [ ] Vendor rate limits documented
- [ ] **Feature matrix re-estimated against real facts**

## Decisions recorded

- [ ] 🔴 ADR-007 written: topology, merchant of record, sibling-not-variant, saturation-only, point of no return, margin-vs-fee
- [ ] Reasoning recorded, not just outcomes — match the comment standard in `boost.model.ts`

---

## Backend

### Adapter
- [ ] 🔴 `integrations/print` with a domain-shaped interface (no PCM field names above the boundary)
- [ ] 🔴 Credential read from secret store, never from code or committed env
- [ ] Contract tests against sandbox
- [ ] Quote sanity bounds — an absurd vendor price fails loudly instead of charging a card

### Domain
- [ ] 🔴 `postcard_products` registry; one-sided is config, not a literal
- [ ] 🔴 `postcard_audiences`; counts and prices resolved **by PCM**, never computed in-house
- [ ] 🔴 Quote endpoint: quantity → price, line-itemised, **with expiry**
- [ ] 🔴 `postcard_orders` state machine; `submitted` is the point of no return, enforced in the **service**
- [ ] Vendor min/max quantity enforced
- [ ] Boost's money→quantity estimate left untouched (correct for its caller)

### Artwork
- [ ] 🔴 Pre-press validation runs **before** checkout
- [ ] 🔴 Moderation gate; no submission without approval
- [ ] Upload hardening: type/size limits, malware scan, no user-controlled paths
- [ ] Preview render with trim and safe-area overlays
- [ ] Errors in plain language, not print jargon

### Money
- [ ] 🔴 Split implemented per the chosen topology
- [ ] 🔴 `Idempotency-Key` on the charge path
- [ ] 🔴 `rateLimit('money')` applied
- [ ] 🔴 Order advances **only** on the Stripe webhook — never on the client's word
- [ ] 🔴 Double-entry ledger for both legs
- [ ] 🔴 Postcard orders included in nightly Stripe reconciliation
- [ ] 🔴 Refund rule in `refundPolicy.ts`: full before `submitted`, refused after
- [ ] Transfer reversal handled on refund
- [ ] `payouts_frozen` respected
- [ ] Stripe Tax wired per merchant-of-record decision

### Fulfilment
- [ ] 🔴 Submission is a BullMQ job, never inline in the webhook handler
- [ ] 🔴 Deterministic idempotency key on submission — **a retry must not print twice**
- [ ] 🔴 Dead-letter path that pages ops; a paid, unsubmitted order never sits silently
- [ ] 🔴 Vendor webhook signature-verified and deduped by event id
- [ ] Shared fulfilment module **extracted** from Boost, not copied — both features consume one
- [ ] Pipeline still stops at `mailed`; `delivered` added only if the spike proved PCM reports it
- [ ] Notifications on each transition

### Access control
- [ ] 🔴 `postcard:order` permission distinct from `boost:manage`
- [ ] Business ownership enforced on every order route
- [ ] Spend threshold requiring owner approval considered

---

## Frontend

- [ ] 🔴 Order wizard: product → area → quantity → artwork → review → pay
- [ ] 🔴 Point of no return stated unambiguously before payment
- [ ] 🔴 Live cost and deliverable count during area selection
- [ ] Saved drafts
- [ ] Order history and status timeline
- [ ] Downloadable template pack at PCM's exact spec
- [ ] Responsive across breakpoints
- [ ] Accessibility to the platform's existing AA standard; `vitest-axe` clean
- [ ] Map area selection performs acceptably at high polygon counts
- [ ] Quote requests debounced

---

## Boost revival (independent, do early)

- [ ] `BOOST_POSTCARD_UNIT_COST_CENTS` set to the contracted rate
- [ ] `campaign_service.rate_bps` set per ADR-007
- [ ] `GET /boost/estimate` returns real numbers; UI renders them correctly for the first time
- [ ] `BOOST_MIN_GOAL_CENTS` still sensible at the real rate
- [ ] Tests updated

---

## Compliance

- [ ] 🔴 Acceptable-use policy in the order agreement (`modules/agreements`)
- [ ] 🔴 Content categories defined and enforced: adult, hate speech, harassment, fraud, infringing marks, non-mailable content
- [ ] 🔴 USPS mailability rules reviewed
- [ ] 🔴 Refund policy published and shown at checkout
- [ ] Saturation-only confirmed — no consumer PII enters StreetServe systems
- [ ] Election-material disclosure requirements considered

---

## Testing

- [ ] 🔴 End-to-end against PCM sandbox: quote → pay → submit → status
- [ ] 🔴 Idempotency: replayed submission does **not** double-print
- [ ] 🔴 Refund before and after point of no return behaves per policy
- [ ] 🔴 Vendor outage: order queues and retries, does not lose money
- [ ] 🔴 Webhook replay is deduped
- [ ] Expired quote is re-quoted, with the change shown to the buyer
- [ ] Artwork rejection refunds cleanly
- [ ] Ledger balances after each money path
- [ ] Existing CI gates green: reachability, route coverage, enum writers, CVE

---

## Operations

- [ ] 🔴 Runbooks: stuck order, vendor outage, artwork rejection, refund dispute, moderation backlog
- [ ] 🔴 Alerting: submission failures, dead-letter depth, quote failures, reconciliation drift
- [ ] Moderation queue depth and latency instrumented (the real scaling bottleneck)
- [ ] Support briefed on the point of no return
- [ ] On-call knows who to contact at PCM

---

## Pilot gate

- [ ] 🔴 5–10 real orders with known businesses, ops watching each end to end
- [ ] 🔴 **At least one physical postcard received and inspected before the next batch**
- [ ] Actual vendor cost matches quoted cost
- [ ] Margin realised matches the configured rate
- [ ] Moderation time per order measured
- [ ] Failure modes hit during pilot documented and fixed

---

## Before saying "done"

Three questions, answered honestly:

1. **If PCM's API returns an error mid-submission, does anyone find out before the buyer does?** If the answer depends on someone checking a dashboard, the answer is no.
2. **Can a buyer be charged for something that never prints, or printed something they cannot be refunded for without a policy covering it?** Both must be no.
3. **Is every number shown to a buyer either real or absent?** The existing code sets this standard — `postcards: null` rather than a fabricated estimate, no `delivered` status the platform cannot observe. Do not lower it.
