# Phase 0 Tracker — Unblock

**Purpose:** get from "audit complete" to "engineering can safely start."
**Updated:** 2026-08-08

Phase 0 is four items. **One is engineering and is done. Three are business decisions that no amount of code can substitute for.** This tracker exists so those three have owners, artifacts, and a visible state — rather than sitting implicitly in a backlog.

---

## Status

| # | Item | Owner | Status | Artifact |
|---|---|---|---|---|
| 0.1a | Vendor credential has a validated, gitignored home; boot guard against pointing a dev box at the live print queue | Eng | ✅ **Done** | `config/env.ts`, `.env.example` |
| 0.1b | **Rotate the leaked production key** at portal.pcmintegrations.com | Ops / James | 🔴 **Not started — do today** | — |
| 0.2 | Topology: Stripe Connect split, or wholesale billing? | Business | ✅ **Decided 2026-08-08 — B, wholesale resale** | `ADR-007` §4 |
| 0.3 | Merchant of record + tax treatment | Business + accountant | 🟡 Ready to send | `MERCHANT_OF_RECORD_BRIEF.md` |
| 0.4 | Partnership signed; per-piece rates, SKUs, minimum order quantity | Business | 🟡 Ready to send | `PARTNER_BRIEF_POSTCARDMANIA.md` §B2–B3 |
| 0.5 | *(new)* Evaluate PostcardMania's white-label Storefront — it may replace much of the build | Product + Business | 🟡 Ready to send | `PARTNER_BRIEF_POSTCARDMANIA.md` §B4 |
| 0.6 | *(new)* Legal review: consumer-PII exposure if mailing lists are list-based | Legal + Product | 🔴 Not started | `PCM_DISCOVERY_FINDINGS.md` Finding 4 |
| 0.7 | *(new)* Confirm what "one side" means | James | 🟡 One question | `PARTNER_BRIEF_POSTCARDMANIA.md` §C1 |
| PC-17-A | Technical discovery | Eng | 🟠 **Partial** — strategy answered, API surface not | `PCM_DISCOVERY_FINDINGS.md` |

Items 0.5–0.7 were not in the original roadmap. Discovery surfaced them, and each is cheap to answer now and expensive to discover mid-build.

---

## What was delivered this pass

### Engineering — 0.1a, complete and verified

`PCM_API_KEY`, `PCM_ENVIRONMENT`, `PCM_API_BASE_URL`, `PCM_WEBHOOK_SECRET` added to `config/env.ts`, all optional so nothing can fail to boot. Matching documented block in `.env.example`. `.env` was already gitignored.

Plus a **fatal boot guard**: a process refuses to start if `PCM_ENVIRONMENT=production` while `NODE_ENV` is not production.

> The guard exists because PostcardMania's sandbox and production keys are **both base64-wrapped UUIDs and indistinguishable by shape**. Nothing about a key tells you which environment it spends money in, and a print run is the one action in this platform that cannot be undone — the failure mode is physical mail to real households, discovered days later.

Verified across three configurations: production key in dev → refuses (exit 1, explicit message); sandbox key in dev → boots; no PCM vars at all → boots, defaults to sandbox. Typecheck clean. Backend suite: 726 passing; the single "worker exited unexpectedly" error is a pre-existing tinypool artifact that also appears in a subset run where 420/420 tests passed.

**The credential now has a home that is not a chat message.** That was the point.

### Discovery — PC-17-A, partial

Answered the strategic questions and reversed two audit assumptions. Full detail in `PCM_DISCOVERY_FINDINGS.md`; headlines:

- **PCM Integrations is PostcardMania** — a large, established printer, not a small integrator
- **Their partner model is wholesale-and-markup**, which points to Topology B, not the promised instant split
- **They already sell a white-label storefront** covering much of what we planned to build
- **Mail appears list-based, not saturation** — which puts consumer PII back in scope
- API host confirmed; **endpoint paths, auth header, and artwork specs remain unknown** and need their OpenAPI spec

### Decision and business artifacts

- `ADR-007` — three decisions settled and implementable; four framed and pending
- `PARTNER_BRIEF_POSTCARDMANIA.md` — one document that closes 0.2, 0.4, 0.5, 0.7 and the rest of PC-17-A
- `MERCHANT_OF_RECORD_BRIEF.md` — self-contained, written for an advisor with no platform context, closes 0.3

---

## What I could not do, and why

**0.1b — rotating the key** requires logging into PostcardMania's portal. That is an account action with credentials I do not have and should not have.

**0.2, 0.3, 0.4** are not engineering tasks in any form. They require a partner's written commitment, an accountant's judgement, and a signed contract. I have made each one a document that can be sent today rather than a question someone has to compose first, which is the whole of what engineering can contribute here.

**The rest of PC-17-A** needs authenticated access to PostcardMania's docs. Their documentation is a JS-rendered SPA; endpoint paths are not guessable, and I confirmed that by probing — every candidate returned 404. Asking them for the OpenAPI spec is minutes of their time versus days of ours.

---

## Recommended order

**Today**
1. **Rotate the production key** (0.1b). It authorises spending on print and postage, and it has been in two chat transcripts.
2. Send `PARTNER_BRIEF_POSTCARDMANIA.md`. Lead with §B1, §B4, §A4 — those three shape the architecture.
3. Send `MERCHANT_OF_RECORD_BRIEF.md` to the accountant. It runs in parallel and has its own latency.
4. Answer §C1 (what "one side" means). One sentence, and it shapes three requirements.

**On the partner's reply**
5. Record decisions in ADR-007 §4–§7.
6. **If wholesale is confirmed:** tell stakeholders plainly that the "instant split, zero manual accounting" description does not hold. Settlement is automatable but periodic. Better renegotiated now than discovered after launch.
7. **If the storefront is a fit:** stop and re-plan before building. It could replace most of a 10–12 week roadmap.
8. Re-estimate the feature matrix against real facts (TD-10).
9. **Set `BOOST_POSTCARD_UNIT_COST_CENTS`.** One constant, roughly a day of work, and a complete feature that has been shipped-but-inert since launch starts working. Best value-per-hour in the workstream — do it before the new build.

---

## Exit criteria

Phase 0 is done when all of these are true:

- [ ] Production key rotated; old key confirmed dead
- [ ] Topology answered **in writing** and recorded in ADR-007 §4
- [ ] Merchant of record decided; tax obligations understood (ADR-007 §5)
- [ ] Build-vs-storefront decided (ADR-007 §7)
- [ ] Consumer-PII exposure resolved, ideally by keeping lists on PostcardMania's side (ADR-007 §6)
- [ ] Partnership signed
- [ ] Per-piece rates, SKUs, and minimum order quantity documented
- [ ] "One side" clarified
- [ ] OpenAPI spec or Postman collection in hand; PC-17-A completed
- [ ] Feature matrix re-estimated against facts rather than assumptions

**Until the topology answer lands, no payment-path code.** The two structures diverge at the first line of the order service; anything built speculatively is likely to be thrown away.

**Engineering is not idle meanwhile.** Topology-independent work available now: content and acceptable-use policy drafting; order state machine implementation (ADR-007 §2 is decided); extracting the shared fulfilment module from Boost — a pure refactor of existing code; upload hardening; order wizard UX. None of it touches money.
