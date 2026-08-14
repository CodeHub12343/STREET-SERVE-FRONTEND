# ADR-002 · Staff or gig? What "someone who works for me" means

**Status:** Accepted — 2026-08-03 (roadmap task 7.10, prerequisite for M-21/M-22/M-23/M-25)
**Decides:** whether the platform models **employees** (a staffing system) or keeps modelling
**engagements** (a gig marketplace), and therefore what the back-office tools are built on.
**Blocks:** M-21 employee management, M-22 shift scheduling, M-23 expenses, M-25 invoices, and
M-39 fleet.

---

## The situation

The `jobs` module is a **gig marketplace**: a poster creates a job, applicants apply, one is
selected, they check in and out, they get paid for that occasion. There is no ongoing relationship
in the data — no wage, no employment record, no next week.

M-21 asks for "employee management", and the audit flagged the ambiguity rather than guessing:

> `jobs` is a gig marketplace, not staffing. Confirm which one the business actually needs before
> building.

That confirmation is this document.

## Decision

**The platform models engagements, not employment. There is no employee entity, and there will not
be one.**

A business can have **people it works with repeatedly** — a `crew` — which is a saved list of users
plus a default rate, not an employment record. Everything else stays as it is: work happens through
the existing jobs flow, and a crew member is simply someone the poster does not have to re-find.

### Why not employees

Three reasons, in order of weight.

1. **Employment is a legal status, and modelling it invites claiming it.** The moment the platform
   stores a wage, a schedule, and a job title, it is asserting an employment relationship — and in
   most US states the consequences follow the substance, not the label: withholding, workers'
   compensation, unemployment insurance, wage-and-hour rules, and in California the ABC test.
   StreetServe's users are sole traders on the edge of the formal economy. Handing them a UI that
   makes them look like an employer, without any of the compliance machinery that being one
   requires, would put the platform's most vulnerable users on the wrong side of a payroll audit.

2. **It is not what the business actually needs.** The need behind M-21 is *"the same three people
   help me at the Saturday market"*. That is a saved list, not an HR system. Shift scheduling
   (M-22) over a saved list is a rota; shift scheduling over employees is a labour-law surface with
   break rules and overtime.

3. **The platform cannot support it honestly.** Payroll means tax withholding, and the money rails
   here are Stripe Connect transfers to individuals — which is a **contractor** payment rail. There
   is no path from what exists to a W-2 that does not start with a payroll provider integration
   nobody has asked for.

### What a `crew` is, precisely

- A named list of users a business works with repeatedly, with an optional default rate.
- Membership is **mutual**: the business invites, the person accepts. A list someone can be added to
  without consenting is a list that will be used to imply a relationship they did not agree to.
- A crew member gets **first refusal** on new jobs — they are notified before the job goes public.
  That is the actual convenience being asked for.
- It confers **no obligation in either direction**. No minimum hours, no exclusivity, no schedule.

### Consequences for the blocked features

| Feature | Resolution |
|---|---|
| **M-21 employee management** | Reframed as **crew management**. Built. |
| **M-22 shift scheduling** | Reframed as offering a dated job to the crew first. Falls out of the existing jobs flow plus crew notification; no separate scheduling entity. |
| **M-23 expenses** | Unaffected by this decision — a business's own costs. Built. |
| **M-25 invoices** | Unaffected — billing a customer for work done. Built. |
| **M-39 fleet** | Still blocked, but on a *vehicle* entity, not on this. |

### The copy rule this creates

Nothing in the product may call a crew member an **employee**, **staff**, or **hire**, and nothing
may present a rate as a **wage** or **salary**. This is not delicacy about wording: those words are
the ones a regulator and a court read as claims about a relationship. A test enforces the
prohibition, in the same way the `stock_waiver` copy rule is enforced.

## What this does not decide

Whether a business should be able to *pay* a crew member through the platform outside a job. That is
a money-rail question with its own KYC and tax consequences, and nothing here depends on it.
