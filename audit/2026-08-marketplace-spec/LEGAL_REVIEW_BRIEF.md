# Legal Review Brief — StreetServe Agreements (spec §60)

**Prepared:** 2026-08-01 · **Status:** ready to send to counsel
**Blocks:** launch of rent-to-own, consignment rent-to-own, and consignment (roadmap M-1)

This brief accompanies the four agreement drafts. It exists so counsel is asked the structuring
question **once**, before review — restructuring a reviewed agreement afterwards is far more
expensive than agreeing the shape first.

---

## 1. What we need

Attorney-reviewed final text for four agreements. Each is versioned and content-hashed in the
platform, and every acceptance stores the version plus a SHA-256 of the exact body agreed, so the
record of what a given user consented to is tamper-evident. Delivering final text is a drop-in
replacement; no engineering work depends on it.

| Agreement | Parties | Current state |
|---|---|---|
| Seller Terms of Sale | Platform ↔ vendor/seller | Placeholder |
| Consignment Bailment Agreement | Product owner (hub) ↔ seller | Placeholder |
| Rent-to-Own Agreement | Seller ↔ customer | Placeholder |
| Consignment Rent-to-Own Agreement | Owner ↔ managing business ↔ customer | Placeholder |

---

## 2. The structural decision already made — please confirm or correct

We have split each agreement's obligations into two layers.

**Structured fields** — recorded per agreement, validated by the system, shown to the customer
before acceptance, and frozen onto the agreement at signing.
**Prose** — the versioned agreement body, identical for every agreement of that type.

**The rule applied:** *an obligation is a field when it can differ between two listings on the
platform; it is prose when it is true of every agreement of that type.*

The reason is enforceability. Anything that lives only in prose cannot be validated, defaulted,
compared between listings, or rendered in the acceptance flow — so the specification's requirement
that "the customer must see the full cost before accepting" would be enforceable for the money and
unenforceable for everything else. Two rent-to-own listings for the same appliance can legitimately
allocate maintenance differently; no amount of shared boilerplate can express that.

### 2.1 Rent-to-Own — structured fields (spec §44)

Each is captured per listing, disclosed before acceptance, and frozen at signing:

| Field | Values | Default if unstated |
|---|---|---|
| Maintenance responsibility | customer / seller / owner / shared | customer |
| Damage responsibility | customer / seller / owner / shared | customer |
| Voluntary return offered | yes / no | **no** |
| Return transport responsibility | customer / seller / owner / shared | customer |
| Restocking fee | amount | $0 |
| Prior payments refundable on return | yes / no | **no** |
| Ownership credit preserved on return | yes / no | **no** |
| Reinstatement after cancellation allowed | yes / no | yes |
| Cancellation notice | days | 7 |
| Delivery fee | amount | $0 |
| Sales tax rate | basis points | 0 |

**Please confirm the defaults.** They are deliberately the conservative reading: a seller must opt
*in* to offering returns, to refunding payments, and to preserving ownership credit. Silence
therefore cannot imply a protection the seller never agreed to — which is the failure mode §51 is
written to prevent. If any of these should instead be mandatory (no default permitted), tell us and
we will make them required at listing time.

The money terms — cash price, initial payment, installment amount and count, frequency, total cost
to own, the rental/ownership split of each payment, platform fee, grace period, late fee, and the
early-payoff amount — are already structured, already disclosed pre-acceptance, and already frozen
at signing.

### 2.2 Consignment Rent-to-Own — structured fields (spec §54)

All ten are **required**; there is no default and the platform refuses to create the agreement
without them. With two businesses and a customer there is no obvious answer to who bears a damaged
item, and defaulting one would bury the disagreement until it costs someone money.

1. Who holds ownership during the payment period (owner / managing business)
2. Who delivers
3. Who manages returns
4. Who provides customer support
5. Who bears loss or damage
6. Who handles missed payments
7. Who approves early payoff
8. Where the goods go if the customer returns them
9. When ownership transfers (final payment / early payoff / either)
10. How each payment divides — enforced numerically by the platform, and restated in plain language
    on every party's statement

### 2.3 Consignment (bailment) — structured fields (spec §35–§41)

Already structured and enforced: term length (7/14/30/60/90/180/365 days or no fixed limit, default
30), minimum authorized selling price, whether the seller may discount, bundle, or accept offers,
who returns unsold goods, the return window (7–14 days), per-day storage fee, and the abandonment
cutoff. Unsold goods move to Return-Pending on expiry and are **never** automatically kept by the
seller.

### 2.4 What remains prose

What rent-to-own is; that title stays with the seller until the agreement's conditions are met; the
platform's role as marketplace rather than counterparty; dispute resolution and governing law; the
statutory consumer disclosures; the bailment relationship in consignment.

---

## 3. Specific questions for counsel

1. **Classification.** Does our rent-to-own structure constitute a consumer credit sale, a lease-
   purchase, or a rental-purchase agreement, and does that answer vary by state? Which states
   require separate licensing or registration?
2. **The disclosure sentence.** Every listing shows: *"You'll pay $X total to own this — $Y more
   than the $Z cash price. Rent-to-own may cost more than buying outright."* Is that sufficient, and
   is prescribed wording or prominence required anywhere we operate?
3. **Late fees and grace periods.** We apply 3 days (weekly), 5 (bi-weekly), and 7 (monthly), with a
   seller-set late fee. Are there caps or prohibitions we must encode?
4. **Repossession.** We currently implement **no** repossession or self-help remedy. Please confirm
   that voluntary return plus cancellation is a sound position, and what notice would be required if
   recovery were ever added.
5. **Early payoff.** The formula is frozen at acceptance and cannot be changed by the seller. Is a
   statutory minimum discount required?
6. **Defaults.** See §2.1 — are conservative defaults acceptable, or must every field be stated?
7. **Three-party liability.** In consignment RTO, does the managing business or the product owner
   carry the consumer-facing obligation, and does our field-level allocation survive that?
8. **Data retention.** How long must acceptance records and condition reports be retained?
9. **Adjacent products.** Separately from these four agreements, please review two existing modules
   for lending classification: seller debt with credit limits and escalation, and peer-to-peer
   micro-advances between users. Neither is presented as a loan; both may be lending-adjacent.
10. **The waiver.** "Stock Protection" is a contractual waiver of the platform's own right to
    recover, deliberately **not** insurance. The codebase and the UI both prohibit the words
    *insurance, policy, premium, claim,* and *covered peril*. Please confirm this holds, and that the
    waiver does not require an insurance licence in any state we operate.

---

## 4. Scope limits at launch

Per §60 we intend to launch rent-to-own narrowly:

- **Approved sellers only** — enforced; a seller must be explicitly approved.
- **Approved locations only** — enforced by a per-city feature flag.
- **Regulated categories excluded** — enforced; any category requiring a licence is refused, which
  covers vehicles. *An explicit category allowlist is still to be built (roadmap M-9); please advise
  whether any additional categories must be excluded by name.*

---

## 5. Where the drafts and fields live

| Item | Location |
|---|---|
| Four agreement bodies | `src/modules/agreements/agreements.registry.ts` |
| §44/§54 field definitions and the boundary rationale | `src/modules/rto/rto.terms.ts` |
| Consignment terms | `src/modules/consignment/consignment.model.ts` |
| Fee schedule | `src/config/constants.ts` |
