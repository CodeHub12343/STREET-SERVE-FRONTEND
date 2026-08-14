# StreetServe — Security Audit

> Security review scoped to the new spec's surfaces (commerce, fees, RTO, agreements) plus the existing controls they build on. `[Observed]` grounded in source; `[Verify]` to confirm. No code modified. Severity: 🔴/🟠/🟡.

---

## 1. Existing controls (positive baseline)
**[Observed]** The backend ships a real security posture:
- `middleware/`: `auth`, `rbac`, `rateLimit` (tiered: read/write/**money**/auth in `constants.ts`), `idempotency`, `validate`, `requestContext`, `requireFeature`.
- Financial integrity: immutable `Settlement`/transaction ledgers (`immutablePlugin`), idempotency keys on charges/refunds/transfers, `reconcile()` drift detection, `writeAudit` audit trail.
- Auth via external verifier + webhook (`integrations/auth`), Stripe webhook handler, KYC integration.
- Self-grant guard: `SELF_GRANTABLE_ROLES` limits which roles a user can assign themselves.
- Unmutable notification categories (payout/dispute/verification) — anti-abuse.

This is a **strong baseline**. Findings below are mostly *new-surface* risks.

## 2. Findings

**S1 · 🟠 [Verify] — Money-path rate limits vs new fee/RTO endpoints.**
`RATE_LIMITS.money` (10/min) covers current charge endpoints. New RTO installment, buyout, and fee-config endpoints must be explicitly bound to the `money`/`write` tiers — easy to forget on a new module.
**Action:** ensure every `rto`/fee route declares a rate-limit tier; add a test asserting money routes are limited.

**S2 · 🟠 [Verify] — RBAC on RTO approval gate (R27).**
RTO must be limited to approved sellers/categories, vehicles excluded. This is an authorization boundary.
**Action:** enforce via `rbac` + `requireFeature`; admin-only approval; deny-by-default for ineligible categories (`Category.requires_license`/`regulated_by` are available signals).

**S3 · 🟠 [Verify] — Stripe webhook signature verification & replay.**
**Action:** confirm `webhooks/stripe.webhook.ts` verifies signatures, enforces the endpoint secret, and is idempotent/replay-safe for charge + `account.updated` (the service layer is idempotent; confirm the edge is too).

**S4 · 🟠 [Verify] — IDOR on financial reads.**
New surfaces (RTO dashboard, per-party consignment statements, fee calculator) expose money data.
**Action:** every read must scope to the authenticated principal (customer/seller/hub/owner); confirm `listMine` / counterparty listing patterns are reused and no endpoint trusts a client-supplied owner id.

**S5 · 🟡 [Verify] — Agreement acceptance integrity (R28).**
Clickwrap acceptances are legal artifacts. Ensure acceptance records are immutable, timestamped server-side, capture the exact version/hash of the agreement shown, and can't be back-dated. (Current bailment model stores `version` + `accepted_at`; extend with content hash.)

**S6 · 🟡 [Verify] — PII in condition documentation (R24).**
RTO/consignment condition photos/videos + serial numbers are PII-adjacent and evidentiary.
**Action:** store via the existing `storage` integration with access control + retention policy; don't expose public URLs; align with `LOCATION_RETENTION_DAYS`-style retention.

**S7 · 🟡 [Verify] — Promotion/fee tampering.**
Promoted-product pricing (R11) and customer service fee (R10) must be server-set; never trust client-submitted fee/promo amounts.
**Action:** server computes all fees from `FeeSchedule`/registry; reject client-provided fee fields.

**S8 · 🟡 [Verify] — Location privacy for live GPS.**
`LOCATION_RETENTION_DAYS=30` exists. Confirm customer/vendor live coordinates are access-scoped, coarsened where appropriate (geohash bucketing helps), and that Wave-Down doesn't leak precise customer location beyond the accepting vendor.

**S9 · 🟡 [Verify] — Refund/chargeback abuse in RTO.**
Missed-payment + repossession flows are fraud-sensitive.
**Action:** audit-log every state transition (pattern already exists via `writeAudit`); rate-limit reinstatement; require idempotent recovery actions.

## 3. Compliance (gating, not optional)
**[Observed]** Spec §60 flags attorney review for RTO/installment/late-fee/repossession/consignment across states.
- RTO = potential consumer-lending classification; disclosures (APR-like total cost, R20) are legally required and vary by state.
- **Action:** legal review **before** enabling RTO; gate RTO by `City.feature_flags` (already supported) to launch only in cleared jurisdictions.

---

## Severity summary
| Sev | Items |
|---|---|
| 🔴 | none confirmed |
| 🟠 | S1, S2, S3, S4 |
| 🟡 | S5, S6, S7, S8, S9 |

**Overall:** no confirmed high-severity vulnerabilities in the audited surfaces; the baseline is strong. The security work is **forward-looking** — bind new commerce/RTO surfaces to the existing controls (rate limits, RBAC, idempotency, audit, server-authoritative fees) and clear the compliance gate before RTO launch.
