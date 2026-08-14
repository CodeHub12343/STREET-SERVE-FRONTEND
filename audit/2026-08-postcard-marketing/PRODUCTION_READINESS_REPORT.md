# Production Readiness Report

**Verdict: NOT READY — the feature does not exist.** No user can order a postcard today.

This report therefore assesses two things: the readiness of the **platform substrate** the feature will sit on (which is largely good), and the readiness gates the feature itself must clear before launch.

Scored 1–5. Substrate scores reflect verified existing code; feature scores are 0 where nothing exists.

---

## Summary

| Dimension | Substrate | Feature | Notes |
|---|---|---|---|
| Architecture | 4 / 5 | 0 / 5 | Adapter pattern, modular boundaries, ADR practice all sound |
| Security | 4 / 5 | 0 / 5 | Platform strong; **one critical live credential leak** |
| Scalability | 4 / 5 | 0 / 5 | BullMQ, Redis, Connect all proven. Bottleneck will be human moderation |
| Maintainability | 4 / 5 | 0 / 5 | Unusually well-commented codebase; reasoning is recorded |
| Performance | 4 / 5 | 0 / 5 | Fee cache with pub/sub invalidation; map route already at 95% of budget |
| Usability | 3 / 5 | 0 / 5 | Marketing surfaces fragmented; no design-tool UX exists |
| Compliance | 2 / 5 | 0 / 5 | **Weakest dimension.** Tax, content liability, mailability all unresolved |

---

## 1. Security

### Strong, verified
- Signature-verified Stripe webhooks with raw-body handling and event dedupe
- `Idempotency-Key` middleware on money paths
- Tiered rate limiting — `money` at 10/min ([`constants.ts:266`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts))
- Permission-based RBAC (`requirePermission`)
- Log redaction, hardened after a real incident where `checkout_qr_secret` printed in clear text ([`logger.ts:25-31`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/logger.ts))
- Rotating hub QR tokens replacing a static secret ([`hubQr.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/hubQr.ts))
- `payouts_frozen` on connected accounts for dispute holds
- CVE gate with expiring exceptions (Phase 6)

This is a security posture built by people who had already been bitten and wrote down why.

### Blocking
- **F-1 — live vendor credential leaked in plaintext.** Authorises spending on print and postage. Rotate before any integration work.

### Required before launch
- Vendor webhook signature verification and dedupe, matching Stripe's discipline
- Vendor credential in the secret store, separate sandbox and production keys
- `postcard:order` permission distinct from `boost:manage` (F-14)
- Upload hardening: type/size limits, malware scan, no user-controlled paths
- Quote sanity bounds so a vendor pricing bug cannot charge an absurd amount

**Not pen-tested.** Phase 6 notes this platform-wide; it applies to this feature too.

---

## 2. Compliance — the weakest dimension

Nothing here is engineering-blocked; all of it is decision-blocked, and all of it is launch-blocking.

| Item | Status | Owner |
|---|---|---|
| Merchant of record | **Undecided** | Business + accountant |
| Sales tax on print/mail per destination state | **Undetermined** (F-13) | Accountant |
| Content liability for mailed artwork | **No policy** (F-7) | Legal + product |
| USPS mailability rules | **Not reviewed** | Legal |
| Acceptable-use terms in order agreement | **Missing** | Legal |
| Refund policy for irreversible goods | **Missing** (F-4) | Product |
| PCM partnership agreement | **Unsigned** | Business |
| Consumer PII (only if targeted-list mail) | **Avoidable** — recommend saturation-only | Product |

**These need a person, not a commit.** Phase 8 of the platform roadmap already identified a class of items in this shape; this is more of them. They should be tracked on the business side with named owners and dates, not left implicit in an engineering backlog.

---

## 3. Scalability

Substrate is sound: BullMQ workers with a separate worker process, Redis-backed fee cache with pub/sub invalidation, Socket.IO with a Redis adapter, MongoDB with reviewed index coverage, a documented load model.

**The real bottleneck will be human moderation** (TD-8), not infrastructure. Every order needs a human to approve artwork before print. That is correct for MVP and becomes a queue somewhere in the low hundreds of orders per week.

**Vendor rate limits are unknown** (PC-17-A). Design the submission job to backpressure gracefully rather than assuming headroom.

**Recommendation:** instrument moderation queue depth and latency from the first order, so the scaling point is observed rather than discovered.

---

## 4. Performance

`PERFORMANCE_BASELINE.md` records the map route at ~95% of its budget — the platform's tightest constraint. Postcard ordering does not touch it.

Two things to watch:
- **Quote latency.** Every quantity or area change may hit PCM. Debounce; cache non-binding estimates; only bind at checkout.
- **Map-based area selection** could be heavy if it renders thousands of ZIP or route polygons. Simplify geometry, cluster at low zoom, load on demand.

---

## 5. Usability

**Positive:** the platform has a real design system, brand palette deepened to AA, a component library, and accessibility work with `vitest-axe` and Playwright coverage. A new surface inherits all of it.

**Concerns:**
- Ordering is a genuinely complex multi-step flow (product → area → quantity → artwork → review → pay) with an irreversible ending. It needs saved drafts, a clear review step, and unambiguous language about the point of no return.
- Buyers will not know print vocabulary — bleed, trim, DPI, CMYK. Error messages must translate ("your image will print blurry at this size" not "insufficient DPI").
- Artwork rejection after payment feels like a bug to the buyer. Validating before checkout (`ARCHITECTURAL_IMPROVEMENTS.md` §7) is a usability fix as much as a process one.
- Marketing surfaces are fragmented (TD-2); postcards adds a sixth.

**Accessibility:** if the design tool (PC-2) is ever built, a canvas editor is one of the hardest things to make accessible. Another argument for deferring it in favour of downloadable templates.

---

## 6. Architecture and maintainability

**Strong.** Verified: clean module boundaries; a real adapter layer (`integrations/`) that the code actually honours; an ADR practice with reasoning recorded; configuration centralised with an explicit rule against magic numbers; CI gates for reachability, route coverage, and enum writers.

The comment quality is unusual and materially useful — `boost.model.ts` explaining why `delivered` is absent and why `raised` is derived rather than counted let this audit understand intent without guessing. **Match that standard in the new module**; it is the reason this codebase is auditable.

**Risk:** two postcard systems with overlapping vocabulary (TD-6). Mitigated by extracting the shared fulfilment module rather than copying it.

---

## 7. Launch gates

**Must clear before any production order:**

1. Vendor credential rotated and vaulted (F-1)
2. PCM partnership signed, with the Connect question answered in writing (F-2)
3. Merchant of record decided; tax treatment determined (F-13)
4. Content policy written; moderation gate live (F-7)
5. Refund policy covering the point of no return, enforced in the service (F-4)
6. Idempotent submission with dead-letter alerting (F-5, F-6)
7. Ledger entries for both legs; postcard orders in nightly reconciliation (F-10)
8. Vendor webhook signature-verified and deduped
9. End-to-end test against PCM sandbox, including a real print proof
10. Support runbook: stuck order, vendor outage, artwork rejection, refund dispute

**Recommended before scale:**

11. Moderation queue instrumentation
12. Quote sanity bounds
13. Spend-authority controls (F-14)

---

## 8. Recommended pilot

**Do not launch broadly.** Run 5–10 real orders with known, cooperative businesses first, with ops watching each one end to end and at least one physical card in hand before the next batch.

**Justification:** this is the platform's first feature that produces an irreversible physical artifact paid for with real money and fulfilled by a third party nobody has integrated with before. A software bug here is not a rollback — it is paper in mailboxes. The pilot is also the only realistic way to validate the unit economics, since the true per-piece cost is unverified (`IMPLEMENTATION_AUDIT_REPORT.md` §5.3).
