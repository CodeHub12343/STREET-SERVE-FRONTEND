# Missing Features

Specified but not implemented. **53 of the 55 extracted requirements are Missing** — the two
exceptions are in [PARTIALLY_IMPLEMENTED_FEATURES.md](PARTIALLY_IMPLEMENTED_FEATURES.md).

This document groups the missing work by *what has to be true before it can be built*, which is more
useful for planning than restating the matrix. Per-requirement detail lives in
[FEATURE_COMPLETION_MATRIX.md](FEATURE_COMPLETION_MATRIX.md).

---

## 1. Missing because a decision has not been made — ✅ **RESOLVED 2026-08-04**

These were not engineering gaps. All three are now decided; the table below records the question and
the answer. What survives is procurement and counsel review, not design.

| # | The question | Decision |
|---|---|---|
| DAN-16 | Is a dispatched driver still an "engagement" under [ADR-002](../2026-08-marketplace-spec/ADR-002-staff-vs-gig.md)? Who insures the trip? | [**ADR-004**](ADR-004-driver-classification-and-liability.md) — engagement, ADR-002 extends unchanged. **Assignment, acceptance-rate pressure, and exclusivity are prohibited**, because they are what would change the answer. The platform provides no cover to drivers and never says it does; drivers attest to their own and lapse suspends dispatch. Vetting at `silver` + background check; role never self-grantable. No cash, no age-restricted goods, staged address disclosure |
| PIF-23 / PIF-24 | Whose money is a pool balance, and what happens if nobody redeems it? | [**ADR-005**](ADR-005-custodial-community-funds.md) — a custodial liability on the `tax_payable` model: never revenue, never the vendor's, **never withdrawable**. No fee on contributions; standard marketplace fee at redemption (a fee-free path would be an arbitrage). **12-month expiry, "never" removed**; expired funds go to city pools, never to the vendor — who would otherwise profit from suppressing redemption |
| MB-10 / MB-13 | Are contributions captured up front or authorised only? | [**ADR-006**](ADR-006-crowdfunding-capture-model.md) — **captured**, into ADR-005's custodial account, with a ≤60-day hard deadline and automatic full refund if missed. This **reverses** the audit's own A-10 recommendation: authorise-don't-capture lets a campaign hit its goal in authorisations and come up short at capture |

**What remains of this section is procurement and counsel review, not design:** insurance quoted and
bound; one counsel conversation covering the custodial structure and the 12-month escheatment
position; counsel review of the driver terms; a background-check vendor with its adverse-action
process. All four are launch gates, and all four are slow — start them now.

The [copy-rule register](COPY_RULE_REGISTER.md) (Phase 0.4) captures the seven prohibitions these
decisions create, with the test each one lands with.

## 2. Missing infrastructure that several features share (P0/P1)

Build these once, before the features that need them.

- **`community_fund_payable` ledger account type + entry types** (X-2, PIF-23). `ACCOUNT_TYPES` has no custodial category other than `tax_payable`, whose comment — *"NEVER revenue and never distributable"* — is the exact discipline required. Must also update `DEBIT_NORMAL` in [`ledger.model.ts:38-42`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ledger/ledger.model.ts#L38-L42), or balances read inverted.
- **`delivery` order fulfilment mode + destination address** (DAN-10). `fulfillment_type` is pickup-only. Nothing about delivery can be built until an order can carry a destination. Independently useful and independently shippable.
- **`driver` role, excluded from `SELF_GRANTABLE_ROLES`** (X-3).
- **New fee types** — `delivery_coordination`, and a campaign service fee if MB charges one (X-1). One seed migration covers both.
- **`/delivery` realtime namespace** (X-4). The first sustained high-write realtime path on the platform.
- **New notification preference categories** (X-6). Every category must be user-mutable, or a generosity notification becomes spam.

## 3. Missing product surface — Delivery Assist Network

Every requirement DAN-1 through DAN-15 is absent. In dependency order:

1. **Request** (DAN-1) — vendor-initiated, on an existing order. Model on `WaveDownSchema`: same request/accept/expire shape, same fee-snapshot discipline.
2. **Driver presence** (DAN-2, DAN-3) — on-shift sessions with a position. Reusing `live_sessions` with a new `actor_type` inherits map presence and the stale-session sweep for free.
3. **Broadcast + claim** (DAN-2, DAN-4) — geo fan-out (the [`livemap.service.ts:578-607`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L578-L607) pattern) then an atomic `findOneAndUpdate` guarded on status.
4. **Lifecycle + failure paths** (DAN-7, DAN-13) — including the case the spec does not mention: **nobody accepts**. That is the common failure, and the customer must not be charged for it.
5. **Live tracking** (DAN-6) — the only genuinely novel infrastructure in the feature.
6. **Money** (DAN-8, DAN-9, DAN-11) — fee at completion, payout via the existing gig rail, disclosure at checkout.
7. **Trimmings** (DAN-5, DAN-12, DAN-14, DAN-15).

**What is conspicuously missing from the specification itself, and needed for launch:**
- **Driver safety** — no share-my-trip, no emergency contact, no incident reporting. A platform sending people to strangers' addresses needs all three.
- **Customer address privacy** — the destination must not be visible to the driver before acceptance, and should be revocable after completion.
- **Cash handling** — the spec never says whether a driver can collect payment. ✅ **Decided (ADR-004 §5): never. Prepaid only.**
- **Age and food-safety gating** — alcohol delivery is a licensing question. ✅ **Decided (ADR-004 §5): default-deny**, consistent with existing food gating.
- **Address privacy** ✅ **Decided (ADR-004 §6): staged** — approximate area in the broadcast, exact address only after acceptance, nothing after completion.

## 4. Missing product surface — Pay It Forward

All of PIF-1 through PIF-22 absent. The build splits cleanly:

**Phase 1 — the feature that delivers the value (money pool only):**
PIF-1 toggle · PIF-2 pool · PIF-3 contribute · PIF-4 redeem · PIF-9 caps · PIF-10 fraud · PIF-11 dashboard · PIF-15 notifications · PIF-7 anonymity.

That is a complete, shippable, honest product. It needs no inventory coupling and no new identity
concepts.

**Phase 2 — breadth:** PIF-5 product pools · PIF-6 partial payment · PIF-13/14 discovery + map icons · PIF-16 reporting · PIF-22 discounted rates.

**Phase 3 — reach, and the riskiest items:** PIF-12 global counter · PIF-17 badges · PIF-18 sharing · PIF-19 corporate sponsorship · PIF-20 priority groups · PIF-21 public impact page.

**Two items in the spec warrant pushback:**

- **PIF-20 priority groups (veterans, first responders, teachers, unhoused).** The intent is good; verifying membership of a protected or sensitive class is an identity-document problem with real discrimination, privacy, and retention exposure. ✅ **Decided (ADR-005): self-attestation with a vendor-set cap. No document verification, ever.**
- **PIF-16 "tax-friendly donation reports".** A vendor is not a charity, and a contribution to a for-profit business's community pool is generally **not** tax-deductible for the giver. ✅ **Decided (ADR-005): it ships as a *contribution record*,** and `tax-deductible` / `charitable donation` / `501(c)(3)` are prohibited substrings under [CR-6](COPY_RULE_REGISTER.md), enforced the same way as the `stock_waiver` rule.

## 5. Missing product surface — Boost My Marketing

All of MB-1 through MB-13 absent. Smallest of the three features, with two hard external dependencies:

- **MB-8 print/mail vendor** — nothing evaluated. One real quote unblocks MB-4's estimate and the entire unit economics.
- **MB-7 mailing list** — a postal address list is a licensed data product with a privacy surface. **Every-door saturation mail avoids buying a consumer address list entirely** and is the recommended route; it is also how small local businesses actually buy direct mail.

**MB-9 "Delivered" status** should not ship unless the chosen vendor genuinely reports delivery
confirmation. Many report *mailed* only. A status the platform cannot observe is a promise it cannot keep.

## 6. Explicitly out of scope of this audit

The specification does not mention, and this audit does not assess: driver background-check vendor
selection, insurance underwriting, or counsel's actual opinion on any of the above. Those are named
as prerequisites, not evaluated.
