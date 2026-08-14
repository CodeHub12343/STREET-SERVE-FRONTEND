# StreetServe — Missing Features

> Features present in the new update spec but **absent** from both codebases (confirmed by source inspection). Grouped by domain, priority-tagged for a production-ready-MVP sequence. R-numbers map to `PROJECT_AUDIT_REPORT.md §2`.

## Legend
Priority: P0 (MVP blocker) · P1 (MVP) · P2 (post-MVP) · P3 (future). Cx: S/M/L/XL.

---

## 1. Rent-to-Own domain — **entirely missing** (largest gap)

| # | Missing feature | Priority | Cx | Notes |
|---|---|---|---|---|
| R20 | RTO agreement model (cash price, ownership credit, buyout, disclosures) | P1 | L | New `rto` module; mirror `payments`/`consignment` layering |
| R21 | Installment schedule engine + live dashboard (next due, balance, ownership %) | P1 | L | Needs immutable installment ledger + BullMQ scheduler |
| R22 | Grace period + reminder cadence + missed-payment state machine | P1 | L | Due→Grace→Late→Arrangement→Paused→Return→Reinstated→Completed→Cancelled→Disputed |
| R23 | Early purchase / payoff with **locked** formula | P1 | M | Formula immutable post-acceptance |
| R24 | Condition documentation (delivery + return: photos/video/serial) | P1 | M | Reuse consignment `condition_photo_url` pattern |
| R25 | Ownership transfer on completion (Paid-in-Full receipt + proof-of-ownership) | P1 | M | Removes recovery rights, closes auto-pay |
| R26 | 10% fee per installment + optional setup ($5–25) + optional late fee | P1 | M | Extend fee engine per-installment |
| R27 | RTO eligibility/approval gate (approved sellers/categories; no vehicles) | P1 | M | Reuse `requireFeature` + RBAC + admin approval |
| R19 | **Consignment**-RTO 3-party split + per-party statements | P2 | XL | Owner/managing-business/customer split; after RTO core |

## 2. Fees & checkout

| # | Missing feature | Priority | Cx |
|---|---|---|---|
| R10 | Optional 3% customer service fee (min $0.50 / max $10), config-flagged | P1 | M |
| R11 | Promoted-product pricing tiers ($5/1d, $15/7d, $40/30d) + placement + billing | P2 | L |
| R8 | Payment-processing fee as a separate itemized, pass-through line | P1 | M |
| R9 (partial) | Tax + delivery/shipping as first-class checkout lines | P0 | M |

## 3. Consignment lifecycle

| # | Missing feature | Priority | Cx |
|---|---|---|---|
| R14 | Duration options (7/14/30/60/90/180/365/custom/no-limit), default 30d | P1 | M |
| R15 | Expiry notifications (14/7/3/on-date) + action choices | P1 | L |
| R16 | Auto-renewal (opt-in, configurable intervals, pre-notice, opt-out) | P2 | M |
| R17 (partial) | Return-Pending status + storage-fee/abandonment terms | P1 | M |
| R18 | Owner minimum-authorized-price + seller price-change permissions | P1 | M |

## 4. Product-rule surfaces

| # | Missing feature | Priority | Cx |
|---|---|---|---|
| R1b | "Trending" surface that rewards optional discounting | P1 | M |
| R28 (3 of 4) | Regular-sale, RTO, consignment-RTO digital agreements (attorney-reviewed) | P1 | M |

## 5. Monetization "50 features" — mostly greenfield tail

**Revenue/subscription**
| Feature | Priority | Cx |
|---|---|---|
| Pro membership tiers ($19.99–$99/mo) | P2 | L |
| Verified-badge subscription | P2 | M |
| Featured placement / sponsored pins / sponsored search (as paid products) | P2 | L |
| Ads dashboard + banner + video ads | P3 | L |
| AI marketing assistant subscription (productized) | P2 | M |
| Fleet GPS subscription | P3 | L |
| POS system | P3 | XL |
| Payment-processing revenue share | P3 | M |
| Financing / insurance / fuel-discount / wholesale-club marketplaces | P3 | XL |

**Marketplace/sales**
| Feature | Priority | Cx |
|---|---|---|
| Storefronts (productized) | P2 | L |
| Pre-order / scheduled pickup | P2 | M |
| Gift cards | P2 | M |
| Loyalty rewards program | P2 | M |
| Customer subscriptions (weekly/monthly) | P3 | L |
| Flash sales w/ countdown | P2 | M |
| Wholesale supplier marketplace | P3 | L |
| Used-equipment marketplace | P3 | L |

**Business tools**
| Feature | Priority | Cx |
|---|---|---|
| Employee management + shift scheduling | P3 | L |
| Expense tracker / mileage tracker | P3 | M |
| Tax report generator / invoice generator | P3 | M |
| Customer CRM | P3 | L |

**Community**
| Feature | Priority | Cx |
|---|---|---|
| Events calendar / festivals directory | P3 | M |
| Vendor meetups / mentorship network | P3 | M |
| Community voting for favorite vendors | P3 | S |
| Charity fundraising days (productized) | P3 | M |
| Emergency roadside assistance directory | P3 | M |
| Business insurance / financing marketplaces | P3 | XL |

---

## MVP-blocking subset (what "Missing" actually gates launch)
Only these missing items are **P0/P1 for a production MVP**: R9 tax/delivery lines (P0), R1b Trending (P1), R8/R10 fee lines (P1), R14/R15/R17/R18 consignment lifecycle (P1), R28 agreements (P1), and the RTO core R20–R27 **iff** RTO is in MVP scope (audit recommends deferring). Everything under §5 is **post-MVP revenue**, aligned with the spec's own "crush the local launch first, monetize later" sequencing.
