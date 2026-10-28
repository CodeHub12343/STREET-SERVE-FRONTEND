# Franchise / Multi-Vendor — Module Rules Audit

**Written for:** engineers maintaining the franchise phases. One-page summary of how each
backend module behaves when a business belongs to a multi-truck brand. Required reading before
touching settlement, promotions, or lifecycle logic in those modules.

**Phase anchor:** FRANCHISE_IMPLEMENTATION_ROADMAP.md §Phase 5.

---

## Module rules at a glance

| Module | Rule for multi-truck brands | Why |
| --- | --- | --- |
| `vendors` | Brand-level. One business = one truck's menu/hours/licence/payout destination. Multi-operator brands share a business. | A business is still the lowest unit the catalogue, licence, and menu are keyed to. The brand sits ABOVE businesses, not alongside them. |
| `livemap` | Operator-level. Each truck has its own live session. | Phase 1 — one `(actor_type, actor_id)` session per operator. The pin's business metadata resolves through the operator's home business. |
| `orders` | Business-level. Operators of the same business share orders. | An order books a transaction against a Business counterparty; splitting orders per operator would fork tax reporting and customer receipts. Operator attribution lives in `BrandSplit`, not in Orders. |
| `payments` | Policy-aware. `pooled` → destination charge unchanged. `per_operator` → platform charge + `BrandSplit` legs on completion. | Phase 2. See `brandPayoutsService.settleTransaction`. |
| `promotions` / flash sales | **Brand-scoped with per-operator exclusion.** `excluded_operator_ids` on `FlashSale`. | Phase 4. "20% off at every James's truck except Oakland" is modelled by excluding one operator. |
| `reviews` | **Brand-scoped aggregate; per-operator optional callout.** `brand_id` + `operator_id` on `Review`. Map pin shows the brand's combined score. | Phase 4. A customer who ate at any truck has reviewed the brand. |
| `livemap.follows` | **Brand-scoped.** `brand_id` on `Follow`; follower hears when ANY truck goes live. | Phase 4. The customer thinks they're following "James's Ice Cream", not a specific truck. |
| `loyalty` punch-cards | **Business-scoped for now** (deferred). | Phase 4 explicitly deferred cross-truck loyalty; implementing it requires a reward-ledger shape that doesn't exist. |
| `payforward` | **Business-scoped for now.** | A PIF fund is keyed to one business. A multi-business brand can have one PIF per business. Brand-level PIF (one fund covers any truck) is a nice-to-have, not a Phase-4 requirement. |
| `boost` / postcards | **Business-scoped for now.** The brand owner can run a campaign per business. | A brand-wide Boost campaign would need its own aggregation at the campaign level — a Phase-6 add-on. |
| `consignment` | **Brand-only.** Only brand owners configure hubs; consignment stock is NOT shared across operators of the same brand. | A hub's inventory is a bailment with specific allocations and settlements. Letting an operator with no financial responsibility move it would break the audit chain. Operators serve orders through the business, which already accesses the hub's stock. |
| `rto` | **Brand-only.** RTO agreements are set up by the brand owner against a specific business; operators cannot modify agreements. | RTO is a 12-month three-party contract; per-operator contracting is out of scope and legally fraught. |
| `tax` | Operator-aware. `operatorStatement` reports direct transfers from `BrandSplit`. Business-level and hub-level statements unchanged. | Phase 5. Each operator receives their own annual summary; the business's own statement still exists for pooled brands. |

---

## Rule categories

### Brand-only
The owner (or a manager) configures these; operators cannot touch them. Any attempt to modify
from an operator session returns 403 via `businessAccess.canManage` or the module's own owner
guard.

- `vendors` — menu, hours, logo, settings
- `consignment` — hubs, approvals, settlements
- `rto` — agreements, pricing, repossession
- `boost` — campaign creation and funding
- `postcards` — artwork, send runs

### Brand-scoped with operator-level override
Default behaviour applies to every operator of the brand; an explicit per-operator rule can
narrow or exclude.

- `promotions` — operator exclusion list on each `FlashSale`
- `reviews` — brand-level aggregate rating, per-operator tag for the comment
- `livemap.follows` — follow the brand, hear from every truck

### Operator-level (unavoidable)
These exist at the operator level by their nature. Scoping them at the brand would break their
semantics.

- `livemap` sessions — a session is one truck's position
- `payments` per_operator split — the whole point of this policy is the per-operator share

### Still business-scoped (deferred)
Explicitly left at the business layer in this cycle because the right shape isn't obvious yet.

- `loyalty` punch-cards — cross-truck transfer requires a new ledger
- `payforward` funds — brand-level fund is a nice-to-have, not a correctness need
- `wave-downs` — a wave reaches the business that owns the pin; the operator serving it is the
  one at that business

---

## When a module needs to change rule

If a future requirement moves one of the rows above to a different column:

1. Add the new column rule to this table in the same commit.
2. If the move involves the data model (new field on an entity), add a backfill script that is
   idempotent AND reversible (follow the `scripts/backfill-brands.ts` template).
3. If the move involves access control, extend `shared/businessAccess` rather than inline
   checks — Phase 0 is the reason that helper exists.
4. Update the FRANCHISE_IMPLEMENTATION_ROADMAP.md changelog so the move is dated.
