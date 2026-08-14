# Partially Implemented Features

Four requirements have real substrate in place. This document says exactly what exists, what is missing, and what completes each.

A fifth item — **Boost My Marketing** — is not a postcard requirement but is the most consequential partial in this audit, and is covered in §5.

---

## 1. PC-9 — Price quote · 15%

**Exists:** `boostService.postcardEstimate(amountCents)`, surfaced at `GET /boost/estimate` ([`boost.controller.ts:82-90`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.controller.ts)), returning `{ postcards, amountCents, isEstimate: true }`.

**Two problems:**

1. **It computes the inverse.** It answers *"how many postcards does $X buy?"* — correct for crowdfunding, where the raised sum is the variable. Direct ordering needs *"what does N postcards to area A cost?"* Different input, different output, different caller.
2. **It always returns `null`.** `BOOST_POSTCARD_UNIT_COST_CENTS = 0` ([`constants.ts:175`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts)), and zero means "no rate configured."

The second is not a bug. The constant's comment is worth preserving as a standard:

> *"It cannot be set honestly until a print/mail vendor is contracted (MB-8), and a plausible-looking figure here would be read as a quote somebody had obtained."*

The controller returns `postcards: null` and the client renders nothing rather than a fabricated number. That is the right call and should survive the rewrite.

**To complete:** a separate quote path for direct orders that calls PCM for a **binding** price on (SKU, audience, quantity), applies the margin, returns line-itemised costs, and **carries an expiry**. Postage rates and vendor pricing move; honouring an expired quote at checkout books a loss nobody sees until reconciliation.

**Do not merge the two.** Crowdfunding genuinely needs money→quantity; direct ordering genuinely needs quantity→money. Both are correct for their caller.

**Complexity:** M · **Priority:** P0 · **Blocked on:** PC-17-A

---

## 2. PC-18 — Fulfilment status · 25%

**Exists:** Boost's `mailing_status` enum (`preparing → printing → mailed`) with timestamp ([`boost.model.ts:58-70`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.model.ts)) and an admin transition endpoint ([`boost.routes.ts:107-118`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.routes.ts)).

**Keep this design decision verbatim.** From the model:

> *"`delivered` is deliberately absent. Most saturation-mail vendors confirm handover to the postal service and nothing after it. A status the platform cannot observe is a promise it cannot keep, so the pipeline stops at `mailed`."*

That reasoning applies identically to direct orders. If PC-17-A reveals PCM *does* report delivery, adding `delivered` is a deliberate, evidence-backed change. Absent that evidence, do not add it.

**Missing:** no vendor webhook (transitions are hand-driven by an admin, which does not scale and is not real-time); nothing covers direct orders; no buyer-facing timeline; no notifications on transition.

**To complete:** extract the status logic into a **shared fulfilment module** consumed by both Boost and postcard orders — this is the single largest reuse opportunity between the two features, and copying it instead would guarantee they drift. Add the webhook receiver, buyer timeline, and `modules/notifications` hooks.

**Complexity:** M · **Priority:** P1 · **Blocked on:** PC-17

---

## 3. PC-19 — Available to mobile and local businesses · 35%

**Exists:** the business model already supports both archetypes — `BUSINESS_MODULE_SYSTEM.md`, `BUSINESS_CATEGORY_MATRIX.md`, and the archetype/module design recorded in the business-platform work. The *audience* for this feature is already modelled; nothing about postcards needs a new business type.

**Missing:** the "complete marketing hub" framing the transcript describes. Today `boost`, `ads`, and `promotions` are three unconnected surfaces. A business has no single place answering "how do I get more customers, and what am I spending?"

**To complete:** a vendor marketing hub aggregating Boost campaigns, ad placements, promotions, and postcard orders, with unified spend reporting and cross-links.

**Recommendation: defer.** Ship postcard ordering as its own surface first. Unifying three surfaces is worth doing when there is a fourth to unify and real usage data on how vendors move between them. Building the hub first is speculative information architecture.

**Complexity:** M · **Priority:** P2 · **Blocked on:** PC-10

---

## 4. PC-20 — Configurable revenue share · 30%

**Exists:** a mature fee registry ([`constants.ts:372-429`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts)) supporting `rate_bps`, `flat_cents`, `min_cents`, `max_cents`; a Redis-backed fee cache with pub/sub invalidation so two pods cannot price the same transaction differently; and a reserved placeholder:

```ts
campaign_service: { rate_bps: 0 },
```

unpriced because *"it covers the print vendor's handling, and no vendor is contracted yet (MB-8)."*

**Missing, and it is a category error rather than a gap:** the 10% is a **resale margin**, not a platform fee.

Everything in that registry is a fee — deducted from a counterparty's proceeds, disclosed to them, governed by the platform's fee-taxonomy and disclosure conventions. A margin is embedded in a retail price and is not normally itemised to the buyer. Registering the margin as a fee without deciding which it is produces either a disclosure that is wrong or a disclosure that is missing.

**To complete:** make the merchant-of-record decision (`ARCHITECTURAL_IMPROVEMENTS.md` §2), then register `postcard_margin: { rate_bps: 1000 }` with a comment stating explicitly which it is and why. Add admin adjustability — the transcript anticipates the rate moving with volume (*"you may be able to negotiate a higher percentage"*).

**Complexity:** XS once decided · **Priority:** P0 · **Blocked on:** merchant-of-record decision

---

## 5. Boost My Marketing — built, shipped, and inert

Not a postcard requirement, but the most important partial here.

**Built and verified:** full campaign lifecycle; contribution capture with intent→webhook→credit discipline; contributor-chosen `on_unmet` (refund by default, roll-forward by consent); rollover expiry so "roll it into the next one" cannot become an indefinite hold; deadline sweep; derived `raised` rather than a drifting counter; anonymity by default; idempotency and `rateLimit('money')` on the charge path. 1,131 LOC backend plus frontend and a vendor route.

**Inert because** the two numbers that make it usable are both zero — `BOOST_POSTCARD_UNIT_COST_CENTS = 0` and `campaign_service.rate_bps = 0` — and the fulfilment pipeline needs an admin to click through it by hand.

**The PCM partnership resolves MB-8, which is the sole blocker.**

This is the highest-value, lowest-effort item in the entire workstream. Once a contracted per-piece rate exists, setting one constant makes a fully built, already-tested feature work. Roughly a day of work — validation, tests, and a careful check that the crowdfunding estimate reads correctly with a real number — to revive a feature that cost weeks.

**Sequence it immediately after the PCM contract is signed, ahead of most of the new build.** It is also the safest possible first exercise of the new vendor relationship: low volume, existing code paths, and a real production signal about whether the rate is right before larger orders depend on it.

**Complexity:** XS–S · **Priority:** P1 (immediately post-contract) · **Blocked on:** contracted rate
