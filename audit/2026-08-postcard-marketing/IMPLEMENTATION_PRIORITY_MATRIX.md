# Implementation Priority Matrix

Ranked by value, effort, and risk. Estimates assume PC-17-A has completed; before that they are ranges, not commitments (TD-10).

**Priority:** P0 launch-blocking · P1 needed for a good launch · P2 post-launch · P3 deferred/reconsider

---

## Tier 0 — Do before writing any code

Not engineering tasks. Nothing downstream is safe until these land.

| # | Action | Owner | Effort | Why it gates everything |
|---|---|---|---|---|
| 0.1 | **Rotate the leaked PCM key** | Ops | 1h | It authorises spending real money on print and postage (F-1) |
| 0.2 | **Get the Stripe Connect question answered in writing** | Business | days–weeks | Determines the entire payment architecture. Building either topology first risks discarding it (F-2) |
| 0.3 | **Decide merchant of record** | Business + accountant | 1 meeting | Settles tax, refunds, disclosure, chargeback liability, and margin-vs-fee in one decision |
| 0.4 | **Sign the partnership; get real unit economics** | Business | weeks | Unit cost is currently unverified. Also unblocks Boost (TD-1) |
| 0.5 | **PC-17-A — discovery spike against PCM sandbox** | Eng | 2–3d | Every estimate below rests on assumptions until this lands. 🟠 **Partially done 2026-08-08** — strategy answered, API surface still needs their OpenAPI spec. See `PCM_DISCOVERY_FINDINGS.md` |
| 0.6 | **Evaluate PostcardMania's white-label storefront** | Product | 1 demo | May replace much of Tier 2. Added by discovery |
| 0.7 | **Legal review — consumer PII if mail is list-based** | Legal | — | Added by discovery; reverses the saturation-only recommendation |

**0.2 is the highest-leverage item in the workstream.** One written answer determines whether this is a low-effort integration or a substantially larger build.

---

## Tier 1 — Highest value per hour

| # | Item | Value | Effort | Risk | Priority |
|---|---|---|---|---|---|
| 1.1 | **Backfill Boost's unit cost** (TD-1) | Very high | XS–S | Low | P1 |
| 1.2 | `integrations/print` adapter (PC-17) | Critical | M–L | Med | P0 |
| 1.3 | Margin config (PC-20) | High | XS | Low | P0 |

**1.1 deserves emphasis.** Setting one constant revives a complete, tested, already-shipped feature. Roughly a day of work for weeks of latent value — nothing else in this plan comes close on that ratio. It is also the safest first exercise of the PCM relationship: low volume, existing code paths, and a real production signal on whether the rate is right before larger orders depend on it.

Sequence it immediately after the contract, ahead of most new build.

---

## Tier 2 — Core build (P0)

| # | Item | Value | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| 2.1 | Product registry + one-sided constraint (PC-3) | High | S | Low | 0.5 |
| 2.2 | Audience model + city/ZIP/route targeting (PC-4/5/7) | Critical | L | High | 0.5 |
| 2.3 | Quote endpoint with expiry (PC-9) | Critical | M | Med | 1.2, 2.1, 2.2 |
| 2.4 | Quantity selection (PC-8) | High | S | Low | 2.1–2.3 |
| 2.5 | Order model + state machine (PC-10) | Critical | L | Med | 2.1–2.4 |
| 2.6 | Artwork upload + pre-press (PC-1) | Critical | M | Med | 0.5 |
| 2.7 | Content moderation gate (F-7) | Critical | M | Med | 2.6 |
| 2.8 | Checkout + split payment (PC-11–15) | Critical | M / L | **High** | 0.2, 0.3, 2.3, 2.5 |
| 2.9 | Ledger entries both legs (F-10) | Critical | S | Low | 2.8 |
| 2.10 | Submission job, idempotent (PC-16, F-5/F-6) | Critical | S | Med | 1.2, 2.8 |
| 2.11 | Refund policy + point of no return (F-4) | Critical | S | Low | 2.5 |
| 2.12 | Order wizard UI | Critical | L | Med | 2.1–2.8 |

**2.8 carries two effort figures** — M under Topology A (destination charge, primitive exists), L under Topology B (payables, settlement job, reconciliation). Resolved by 0.2.

**2.2 is the highest-risk build item.** Its shape depends entirely on PCM's targeting taxonomy, and PC-6 (neighborhood) may not exist at all as a postal unit.

---

## Tier 3 — Needed for a good launch (P1)

| # | Item | Value | Effort | Depends on |
|---|---|---|---|---|
| 3.1 | Shared fulfilment module, extracted from Boost (PC-18, TD-6) | High | M | 2.5 |
| 3.2 | Vendor webhook receiver, signed + deduped | High | S | 1.2 |
| 3.3 | Buyer status timeline + notifications | High | S | 3.1 |
| 3.4 | Spend authority `postcard:order` (F-14) | Med | XS | 2.5 |
| 3.5 | Quote sanity bounds | Med | XS | 2.3 |
| 3.6 | Ops runbook + moderation queue tooling | High | S | 2.7 |
| 3.7 | Moderation queue instrumentation (TD-8) | Med | XS | 2.7 |
| 3.8 | Downloadable template pack sized to PCM spec | **High** | S | 0.5 |

**3.8 is the cheapest high-value item in the plan.** A template pack (Canva / Illustrator / PDF at PCM's exact trim and bleed) serves most of the need PC-2's design tool addresses, at roughly 2% of the cost. Ship it and measure upload abandonment before committing to an editor.

---

## Tier 4 — Post-launch (P2)

| # | Item | Value | Effort |
|---|---|---|---|
| 4.1 | Neighborhood targeting (PC-6), if PCM supports it | Med | M |
| 4.2 | Vendor marketing hub (PC-19, TD-2) | Med | M |
| 4.3 | Order history, reorder, campaign analytics | Med | M |
| 4.4 | Automated pre-screening to reduce moderation load | Med | M |

---

## Tier 5 — Reconsider (P3)

| # | Item | Value | Effort | Recommendation |
|---|---|---|---|---|
| 5.1 | **On-platform design tool (PC-2)** | Med | **XL** | **Defer — but re-evaluate first (updated 2026-08-08).** PostcardMania's white-label storefront likely includes a design tool, which would make this free rather than XL. Check item 0.5 before writing this off. Absent that, still defer: weakest justification (one clause), most vendor-dependent, hardest to make accessible. Ship 3.8 and let data decide |
| 5.2 | Two-sided postcards | Med | S | Explicitly out of MVP scope. Cheap later *if* 2.1 is a product registry rather than a hardcode |
| 5.3 | Targeted-list mail | Low | L | **Recommend against.** Adds consumer PII obligations for scope the spec never asked for |
| 5.4 | **Influencer Share** | Unknown | XL | **Confirm which product owns it first.** May belong to HonestNeed, not StreetServe. Independent of postcards; do not bundle |

---

## Critical path

```
0.1 rotate key
      ↓
0.2 Connect answer ──┬──▶ 0.3 merchant of record
      ↓              │
0.4 sign contract ───┤
      ↓              │
0.5 PC-17-A spike ───┴──▶ 1.2 adapter ──▶ 2.1 products ──▶ 2.2 audiences
                                                                  ↓
                          2.6 artwork ──▶ 2.7 moderation      2.3 quote
                                    ↓          ↓                  ↓
                                    └──────▶ 2.5 order ◀──────  2.4 qty
                                                  ↓
                                              2.8 checkout + split
                                                  ↓
                                    2.9 ledger · 2.10 submit · 2.11 refunds
                                                  ↓
                                              2.12 wizard
                                                  ↓
                                    3.1 fulfilment · 3.2 webhook · 3.3 timeline
                                                  ↓
                                              PILOT (5–10 orders)
```

**1.1 (revive Boost) branches off after 0.4 and runs in parallel** with the adapter work. It has no dependency on the new build.

---

## What can run in parallel

While Tier 0 is blocked on business decisions, engineering is **not** idle. These are safe because none depends on the Connect answer or PCM's API shape:

- Content policy and acceptable-use drafting (2.7 prep)
- Order state machine design and ADR-007 drafting
- Order wizard UX and flows (structure is topology-independent)
- Extracting the shared fulfilment module from Boost (3.1) — pure refactor of existing code
- Upload hardening and pre-press validator research (2.6 prep, minus exact specs)

**What must not start:** anything in the payment path. It diverges at the first line depending on 0.2.
