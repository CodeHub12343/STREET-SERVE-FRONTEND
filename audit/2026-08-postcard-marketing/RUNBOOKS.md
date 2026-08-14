# Postcard Marketing — Ops Runbooks

For whoever is on call. Each entry is: how you find out, what you check, what you do.

**The one thing to internalise:** past the vendor's daily batch cutoff (~11:30 PM EST), the paper is printed. Nothing below un-prints it. Every "act fast" instruction here exists because acting before the cutoff is free and acting after it costs the full order.

---

## 1. A paid order never reached the printer

**How you find out:** `postcard_submission_failures_total` increments, or a `FATAL` log line `postcard order could NOT be submitted — paid with no mailing`. The buyer also sees "Needs attention" on their order, so they may contact support first.

**Why it matters:** somebody has been charged and has no mailing. This is the worst state in the feature.

**Check, in order:**

1. Find the order: `db.postcard_orders.findOne({ _id: ObjectId("...") })`.
2. Read `submission_last_error` and `submission_attempts`.
3. `status` tells you which case you are in:
   - `paid` with attempts below the limit → still retrying on its own. **Do nothing yet.**
   - `submission_failed` → it has given up. Continue below.

**Then, by cause:**

| `submission_last_error` says | What happened | Do this |
|---|---|---|
| "Artwork was rejected after payment" | A reviewer refused it after the buyer paid | Refund in full (§4). Tell the buyer why, using the moderator's reason |
| "missing its artwork or audience" | Data problem — the order lost a reference | Escalate to engineering. Do not retry; it will fail identically |
| Vendor 5xx / timeout / "unreachable" | Vendor outage (§2) | Once the vendor is healthy, clear the backoff to re-arm the sweep |
| "implausible price" | Vendor pricing returned something absurd; the sanity bound stopped it | Escalate. **Do not override the bound** — it exists to prevent a $250,000 charge |

**To re-arm the sweep after a transient failure:**

```js
db.postcard_orders.updateOne(
  { _id: ObjectId("...") },
  { $set: { status: 'paid', submission_attempts: 0, submission_next_attempt_at: null } }
)
```

Safe to do. Retrying submission cannot double-print: the vendor rejects a duplicate `extRefNbr` with 409, and the sweep treats that as success.

---

## 2. The vendor is down

**How you find out:** submission failures climbing across *several* orders, or `print vendor is unreachable` in the logs.

**What is already happening automatically:** submissions retry with backoff and orders stay `paid`. Status polling logs and moves on. **Nothing is lost** — the sweep re-reads order state every minute, so recovery needs no intervention.

**What to do:**

1. Confirm it is them, not us: `npm run probe:print -- --real` (read-only, places no order).
2. If their API is down, wait. Check whether any affected order's **mail date is today** — those are the ones with a deadline. If the outage will outlast the cutoff, tell those buyers their mailing slips a day.
3. If it lasts beyond a few hours, bump `POSTCARD_SUBMISSION_MAX_ATTEMPTS` so orders do not exhaust their retries during the outage. Otherwise they land in `submission_failed` and need manual re-arming afterwards.

**Do not** hand-submit orders through the vendor's portal while the sweep is running. That is the one way to get a genuine double-print: the portal order carries no `extRefNbr`, so the vendor's duplicate detection will not catch it.

---

## 3. Artwork was rejected after the buyer paid

**How you find out:** moderator rejects an asset attached to a paid order; the sweep fails the order immediately with `refund required`.

**Why the sweep does not refund automatically:** refunding is a money movement, and a background job issuing refunds on its own is a class of bug nobody wants. The buyer also deserves an explanation with it.

**Do this:**

1. Read the moderator's `moderation_reason` — it is written to be shown to the business.
2. Refund in full (§4).
3. Contact the business with the reason and what would make the design acceptable.

**Judgement:** the bar is *may we lawfully print and post this* — ownership, prohibited content, mailability. It is **not** whether the design is any good. If a rejection cannot be explained in terms of that bar, it was probably wrong; reverse it and let it print.

---

## 4. Refunding a postcard order

**Before the vendor's batch closes** (i.e. before the mail date's cutoff): full refund, no cost to us beyond the processor fee.

**After it closes:** the cards are printed and posted. We have paid the vendor. A refund here is a **write-off**, not a refund — it needs a manager, and it should be rare.

The refund path reverses all three ledger legs (revenue, vendor payable, cash). Do not adjust the ledger by hand; use the refund endpoint so the entries stay balanced.

Check `postcard_payables` for the order too — if the payable has already been settled to the vendor, the money is gone and the write-off is real.

---

## 5. The moderation queue is backing up

**How you find out:** `postcard_moderation_queue_depth` rising, or `postcard_moderation_oldest_seconds` past a few hours.

**Why it matters, quietly:** artwork waiting on review does not reach the printer. A queue nobody works turns into missed mail dates, and the buyer sees an order that has been "paid" for two days doing nothing.

**Watch the age, not just the depth.** Three items nobody has looked at in two days is worse than thirty being actively worked.

**Do this:** work the queue at `/admin/postcard-artwork`. If depth is persistently high, this is the TD-8 scaling ceiling arriving — that is a staffing or automation decision, not an incident.

---

## 6. A buyer wants to cancel

**Before the mail date's cutoff:** cancel it. Free, and the vendor honours it.

**After:** it cannot be cancelled. The cards exist. Say so plainly rather than promising to try — the vendor will refuse and the buyer will have been told twice.

Cancellation asks the **vendor** and honours their answer; we never flip our own status and assume. If our record says cancelled and theirs says printing, theirs is right.

---

## 7. Vendor account balance ran dry

**How you find out:** orders stuck with fulfilment stage `payment_hold`, or the vendor portal banner "No Payment Method on File".

**What it is:** the vendor runs a **prepaid retainer**. If it empties, they stop processing — our orders sit there, paid by the customer and going nowhere.

**Do this:** top up the retainer in the vendor portal. Orders resume on their own; no re-submission needed.

**Prevention:** `getBalance()` is exposed on the adapter. Watch it. Running out is entirely avoidable and entirely invisible until it bites.

---

## 8. Something asks you to bypass a guard

Occasionally there is pressure to "just push it through". These are the guards that exist for a reason, and what happens if you disable one:

| Guard | If you bypass it |
|---|---|
| `WIRE_VERIFIED` / production refusal | Real orders go to guessed endpoints |
| Moderation before submission | Unreviewed artwork is printed and posted into homes |
| Quote sanity bounds | A vendor pricing bug charges a customer an absurd amount |
| `PCM_ENVIRONMENT` boot guard | A dev box mails real postcards at real cost |
| Duplicate-reference handling | The same run prints twice, billed twice |

None of these is a nice-to-have. If one is genuinely blocking something legitimate, that is an engineering fix, not a config override.
