# Technical Debt

Debt this feature **inherits** from existing code, and debt it **will create** if built as specified. Separated because they need different owners.

---

## Part A — Inherited debt

### TD-1 · Boost is shipped, tested, and inert · MEDIUM

A complete feature — 1,131 LOC backend, frontend components, a vendor route, full lifecycle and refund logic — that no user can benefit from, because `BOOST_POSTCARD_UNIT_COST_CENTS = 0` and `campaign_service.rate_bps = 0`.

**Carrying cost:** it must be maintained, migrated, and kept green in CI while returning nothing. It also occupies conceptual space — a future engineer reasonably assumes postcards are "done."

**This is not a criticism of the original decision.** Refusing to invent a price was correct, and the constant says so. But the cost is real and it accrues.

**Resolution:** the PCM contract clears MB-8. Setting the rate revives the feature. Roughly a day. Highest value-per-hour item in this workstream.

### TD-2 · Marketing surfaces are fragmenting · MEDIUM

`modules/boost`, `modules/ads`, `modules/promotions`, plus `subscriptions` (featured placements) and `growth`. Five ways for a business to spend money on being seen, with no common surface, no unified spend reporting, and no shared vocabulary.

Adding postcards makes it six. **Postcards will make this worse before anything makes it better** — that is an accepted cost, not an oversight, but it should be accepted knowingly.

**Resolution:** the vendor marketing hub (PC-19). Deferred to P2 deliberately — unifying is better done with six real surfaces and usage data than with five and a guess.

### TD-3 · Geographic modelling is inconsistent across modules · LOW

At least four incompatible representations: `ads` lat/lng + `radius_m`; `livemap/corridors` path + radius; `delivery` postal_code as a plain string; `livemap` demand tiles. Postcards will add a fifth (postal units).

**Why this is only LOW:** these genuinely model different things, and forcing them into one abstraction would be worse than the duplication. The actual debt is the **naming collision** — "route" means a travel corridor in `livemap` and a USPS carrier route in postcards.

**Resolution:** name the new model unambiguously (`postcard_audiences`, `carrier_route`) and comment the distinction where the collision is likely to mislead. Do not attempt a unified geography layer.

### TD-4 · No refund rule for irreversible physical goods · MEDIUM

`refundPolicy.ts` handles reversible and undelivered things. Every existing path qualifies — including Boost, which only ever refunds *before* anything is printed.

**Resolution:** F-4. Add the point-of-no-return rule to `refundPolicy.ts` so it lives with the other policies rather than as tribal knowledge in the postcard service.

### TD-5 · Vendor credential hygiene has no established practice · MEDIUM

The leak (F-1) is the symptom. `SECRET_MANAGEMENT_REVIEW.md` covers infrastructure secrets; nothing covers the human path by which a *partner's* key reaches the secret store. PCM is the first such partner, so the practice does not exist yet.

**Resolution:** write it down before the second partnership. Vendor portal → secret store directly; never through chat; rotate on any exposure; separate sandbox and production keys.

---

## Part B — Debt this feature will create

### TD-6 · Two postcard systems with overlapping vocabulary · HIGH if mishandled

Boost and Postcard Marketing will both have campaigns, mail dates, mailing statuses, and per-piece costs, with different money semantics behind identical words.

**Mitigation, and this is the load-bearing one:** extract the fulfilment status machine into a shared module rather than copying it (`ARCHITECTURAL_IMPROVEMENTS.md` §3). Two copies will drift. Name the money concepts distinctly — Boost has *contributions*, postcards have *orders*; never let "campaign" mean both without qualification.

**Cost if mishandled:** every future change to the mailing pipeline must be made twice and verified twice, and eventually will not be.

### TD-7 · Vendor coupling in the pricing model · MEDIUM

Quotes, deliverable counts, SKUs, and status vocabulary all originate at PCM. Even behind an adapter, PCM's *model* of the world leaks into our schema — if they express targeting as route lists and we store route lists, a vendor with a different taxonomy is a migration, not a swap.

**Mitigation:** store our own audience selection alongside the vendor's resolution, so the buyer's intent survives a vendor change even if the resolution does not. Accept the residual coupling knowingly.

### TD-8 · Manual moderation will not scale · MEDIUM (deferred by design)

Human review of every design before print is right for MVP — low volume, unbounded downside. It is a queue with a human in it, and it becomes a bottleneck somewhere in the low hundreds of orders per week.

**Mitigation:** instrument review latency and queue depth from day one, so the scaling point is observed rather than hit. Automated pre-screening reduces load; it does not remove the queue.

**Accepted deliberately.** Do not over-engineer moderation before there is volume to moderate.

### TD-9 · An unsigned partnership underpins the whole feature · HIGH

Every estimate, schema, and design in this audit assumes PCM. The transcript's own framing is exploratory: *"I'll keep you posted if I get close to a partnership."*

**Mitigation:** the domain-shaped adapter (`ARCHITECTURAL_IMPROVEMENTS.md` §4) is the entire hedge, and it is why that recommendation is not optional. Beyond it: do not build the design tool (PC-2) until the partnership is signed — it is the largest item and the most vendor-spec-dependent.

### TD-10 · Estimates rest on an unverified API · MEDIUM

Everything downstream of PC-17 is estimated against an API nobody has seen (`IMPLEMENTATION_AUDIT_REPORT.md` §5.1).

**Mitigation:** PC-17-A first, then re-estimate the whole matrix. Treat current numbers as planning ranges, not commitments — and say so to stakeholders rather than letting a roadmap date harden around a guess.

---

## Priority

| ID | Debt | Severity | When |
|---|---|---|---|
| TD-9 | Unsigned partnership | HIGH | Hedge now (adapter), resolve commercially |
| TD-6 | Two postcard systems | HIGH if mishandled | Prevent at design time — extract, don't copy |
| TD-1 | Boost inert | MEDIUM | Immediately post-contract. Best value/hour available |
| TD-4 | No irreversible-goods refund rule | MEDIUM | Before launch |
| TD-5 | Vendor credential practice | MEDIUM | Now — F-1 already happened |
| TD-10 | Unverified estimates | MEDIUM | PC-17-A, then re-estimate |
| TD-7 | Vendor coupling | MEDIUM | Mitigate at design time |
| TD-2 | Marketing fragmentation | MEDIUM | Post-launch (PC-19) |
| TD-8 | Manual moderation | MEDIUM | Accepted; instrument now |
| TD-3 | Geographic inconsistency | LOW | Name carefully; do not unify |
