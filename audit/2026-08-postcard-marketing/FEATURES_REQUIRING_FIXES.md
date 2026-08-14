# Features Requiring Fixes

Defects and correctness gaps found during the audit. Since the postcard feature does not exist, most entries are either (a) real defects in adjacent shipped code, or (b) **design traps** — mistakes the obvious implementation would make, recorded now because catching them at design time costs hours and catching them in production costs real money and mailed paper.

Each is labelled accordingly. Design traps are explicitly *not* claims that existing code is broken.

---

## F-1 · CRITICAL · Leaked vendor API credential

**Real defect. Operational, not code.**

The production key (a base64-wrapped UUID beginning `YWI0Zjg4Nzgt…`, decoding to `ab4f8878-…`) was transmitted in plaintext through consumer messaging and an AI chat transcript.

> The full value used to be written out here. It has been redacted: this document is committed to
> a git repository, and reproducing a live credential inside the report that flags it as leaked
> only widens the exposure. The prefix is enough to identify which key to rotate.

**Impact:** this credential authorises spending money on printing and postage. Anyone holding it can place fulfilment orders against the partner account. Unlike a leaked read key, the loss is immediate and physical.

**Fix:** rotate at `portal.pcmintegrations.com` now. Store the replacement in the platform secret store per `SECRET_MANAGEMENT_REVIEW.md` — never in a repo, never in a committed `.env`, never in a chat. Confirm with PCM whether the old key was used, and whether they offer scoped or sandbox-only keys for development.

**Also:** establish the rule before the integration lands. Vendor credentials go from the vendor's portal to the secret store directly. Nobody pastes one into a message.

---

## F-2 · CRITICAL · The "instant split" may not be deliverable as promised

**Design trap, with a commercial root cause.**

The transcript commits to: *"We can easily configure the payment gateway to instantly route the printing/mailing cost to the partner and drop our 10% profit margin straight into our account... Zero manual accounting, completely automated."*

The Stripe primitive genuinely exists ([`integrations/stripe/types.ts:13-18, 52`](../../../STREET-SERVE-APPLICATION-BACKEND/src/integrations/stripe/types.ts)), so the engineering claim is sound **on one condition**: PCM must onboard as a Stripe Connect connected account under StreetServe's platform — accepting Connect terms, submitting KYC to Stripe, and taking money as transfers rather than as an invoiced vendor.

Established print vendors often decline. They have their own merchant processing and their own accounts-receivable process, and they are not marketplace sellers.

**Impact if they decline:** the requirement as written is not buildable. The fallback — collect in full, recognise margin, settle with PCM on net terms via ACH — is a materially different architecture: different money flow, different refund mechanics, different tax position, different reconciliation job, and StreetServe carrying float and credit risk it does not carry under Connect.

**Fix:** get it answered in writing before any payment code is written. Building either topology speculatively risks discarding the work.

---

## F-3 · HIGH · `postcardEstimate` computes the inverse of what direct ordering needs

**Real limitation of existing code — correct for its current caller.**

[`boost.controller.ts:82-90`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.controller.ts) answers "how many postcards does $X buy?" Direct ordering needs "what does N postcards to area A cost?"

**Impact:** reusing it for the order flow would produce a nonsensical checkout.

**Fix:** build a separate quote path. Keep the existing helper unchanged — money→quantity is genuinely correct for crowdfunding, where the sum raised is what varies. Two callers, two questions, two functions.

---

## F-4 · HIGH · No refund policy covers an irreversible physical good

**Real gap.** `modules/payments/refundPolicy.ts` and `modules/refunds` predate this feature and have no rule for it.

Every refundable path in this platform involves something reversible or undelivered. A printed and mailed postcard is neither. Boost sidesteps this: contributions are refunded when a campaign *fails to fund*, i.e. always before anything is printed.

**Impact:** without an explicit rule, a support agent will eventually refund a mailed order and the platform absorbs the full vendor cost with nothing to reclaim.

**Fix:** define the point of no return as `submitted` and enforce it **in the service**, not the UI. Before `submitted`: full refund. After: no refund, stated at checkout and in the order agreement (`modules/agreements` already exists for exactly this). Add the corresponding rule to `refundPolicy.ts` so it is one policy, not tribal knowledge.

---

## F-5 · HIGH · Naive submission design loses paid orders

**Design trap.**

The obvious implementation calls PCM synchronously inside the Stripe payment webhook. A vendor timeout then leaves an order paid but never submitted, with no retry and no alert — and it will be discovered by the buyer, not by us.

**Fix:** enqueue a `postcard.submit` BullMQ job on webhook confirmation. Idempotency key on the vendor call (F-6). Bounded retry with backoff. Dead-letter that pages ops. The BullMQ infrastructure is already in place (`worker.ts`, `registerScheduledJobs`).

---

## F-6 · HIGH · A retried submission prints and mails twice

**Design trap. This one costs real money per occurrence.**

Retries are inevitable — timeouts, redeploys, at-least-once queue semantics. Without idempotency, each retry is another physical print run.

**Fix:** deterministic idempotency key derived from the order id, passed to PCM on every submit. **Confirm in PC-17-A that PCM honours idempotency keys.** If they do not, build local dedupe — persist `vendor_order_id` before the call returns and refuse to submit an order that already has one. Do not discover this in production.

The platform already applies this discipline on every Stripe money call; extend it to the print vendor.

---

## F-7 · HIGH · Uploaded artwork is printed and mailed with no moderation gate

**Design trap with legal exposure.**

StreetServe would physically produce and mail third-party artwork into homes. Hate speech, adult content, fraudulent claims, infringing marks, or non-mailable content becomes StreetServe's problem and the USPS's.

**Fix:** acceptable-use terms in the order agreement; automated first pass; **human review before submission for MVP** (volume is low, downside is unbounded); rejection path that refunds cleanly — rejection happens before the point of no return, so this composes with F-4.

---

## F-8 · MEDIUM · Quotes without expiry silently book losses

**Design trap.**

Postage rates and vendor pricing move. A quote generated Monday and paid Friday, honoured at Monday's price, is a loss that appears only at reconciliation.

**Fix:** `quote_expires_at` on the order. Re-quote at checkout if expired, and show the buyer the change rather than failing silently.

---

## F-9 · MEDIUM · Deliverable counts computed in-house will disagree with the invoice

**Design trap.**

Building our own ZIP/route geography and counting addresses ourselves seems reasonable and is wrong: only the vendor knows current deliverable counts. Our number and their invoice will differ, and the buyer was quoted ours.

**Fix:** treat PCM as authoritative for counts and price. Cache for responsiveness; never treat the cache as a quote.

---

## F-10 · MEDIUM · Split payment without ledger entries does not satisfy "no manual accounting"

**Real gap.**

PC-15 asks for no manual accounting. A correct Stripe split alone does not deliver that — money that moves without a double-entry record is manual accounting deferred to quarter-end. Every other money path in this codebase is ledgered (`modules/ledger`, `ledger/communityFund.ts`).

**Fix:** ledger both legs — vendor cost and platform margin — at capture, with the order id as reference. Include postcard orders in the nightly Stripe reconciliation job.

---

## F-11 · MEDIUM · A radius is not a mailing area

**Design trap.**

`ads.radius_m` exists and looks reusable. It is not: postal geography is discrete (ZIP, ZIP+4, carrier route) and does not follow circles. Likewise `livemap/corridors.service.ts` models *travel* corridors — the word "route" appears in both the corridor model and the specification's "mailing routes," and they are unrelated objects.

**Fix:** a distinct `postcard_audiences` model keyed on postal units from PCM's taxonomy. Note the distinction in code comments; the naming collision will otherwise mislead the next reader.

---

## F-12 · MEDIUM · The 10% margin is being modelled as a platform fee

**Design trap — category error.**

The fee registry ([`constants.ts:372-429`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts)) holds fees: amounts deducted from a counterparty's proceeds and disclosed to them. The 10% is a resale margin embedded in a retail price. Registering it as a fee without deciding which it is yields either an incorrect disclosure or a missing one — and this platform has explicit fee-disclosure conventions that a mislabelled entry would violate.

**Fix:** make the merchant-of-record decision first (`ARCHITECTURAL_IMPROVEMENTS.md` §2), then register with a comment recording the classification and its reasoning.

---

## F-13 · LOW · Sales tax on print and mail is undetermined

**Real gap.** Printing and mailing services are taxable in many US states, and liability depends on merchant of record. Stripe Tax is integrated (`THIRD_PARTY_INTEGRATIONS.md` §4) but no postcard tax treatment exists.

**Fix:** determine treatment with an accountant once merchant-of-record is settled; wire Stripe Tax accordingly. Flagged low only because it is not launch-blocking at pilot volume — it becomes material quickly.

---

## F-14 · LOW · No spend authority control

**Design trap.** `boost:manage` gates campaign management. Postcard orders spend real money in one click, and a $500 order is a different risk from editing a campaign title.

**Fix:** dedicated `postcard:order` permission. Consider a per-order value threshold requiring owner approval. Cheap now, awkward to retrofit after the first disputed order.
