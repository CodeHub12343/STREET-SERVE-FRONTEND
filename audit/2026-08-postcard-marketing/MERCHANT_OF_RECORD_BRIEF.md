# Merchant-of-Record Brief — for the accountant / tax advisor

**Purpose:** unblock roadmap item 0.3.
**Owner:** Business (James) + accountant.
**Reading time:** ~5 minutes. Four questions at the end.

This is written for an advisor with no prior context on the platform. It states the facts, the two possible structures, and exactly what we need decided — nothing here requires technical knowledge.

---

## 1. What is being built

StreetServe is a marketplace platform for mobile and local businesses (food trucks, street vendors, small storefronts).

We are adding a service where a business can order a **direct-mail postcard campaign** through StreetServe: upload a design, choose an area to mail to, choose a quantity, and pay. The printing and mailing is performed by **PostcardMania**, an established commercial printer, not by us.

Expected initial scale: single-digit to low-double-digit orders per month, typical order value $200–$1,000. Mailing is within the United States, potentially into many states.

Our intended economics: roughly **10% of the order value** to StreetServe, the rest to PostcardMania for printing and postage.

---

## 2. The two possible structures

We can implement either. **We need you to tell us which is correct, and what it obliges us to do.**

### Structure A — Marketplace facilitation

StreetServe operates as a marketplace. The customer's payment is split at the moment of purchase: PostcardMania receives their portion directly into their own account; StreetServe retains a **platform fee** of ~10%.

- StreetServe never takes title to the printing service
- StreetServe's revenue is a **fee for facilitating**, disclosed to the parties
- PostcardMania is arguably the merchant of record for the print service
- Money never sits with StreetServe

### Structure B — Wholesale resale

StreetServe buys printing from PostcardMania at a **wholesale rate** and resells it to the business at **retail**. StreetServe collects the full amount, keeps the difference as **margin**, and pays PostcardMania on account (e.g. net 30).

- StreetServe is selling a print-and-mail service to the customer
- StreetServe's revenue is a **margin**, embedded in the retail price
- StreetServe is merchant of record for the whole transaction
- StreetServe holds the customer's money before paying the supplier

### Which is likely

**Structure B.** PostcardMania's published partner materials describe wholesale pricing that partners mark up, and commission per order — the language of a supplier, not a marketplace seller. We are confirming this with them in writing, but B is what we should plan for.

---

## 3. Why this matters to us

We are not asking out of curiosity. Four concrete things depend on the answer, and two of them are hard to change once we have started charging customers.

### 3.1 Sales tax — the big one

Printing and mailing services are taxable in many US states, with rules that vary by state and sometimes turn on whether the mail is delivered in-state.

Our concern with **Structure B**: if StreetServe is the merchant of record, we may be selling a taxable service into **every state we mail into**. That raises economic-nexus and registration questions we are not currently set up for.

Under **Structure A**, the tax position may sit with PostcardMania, who already operate nationally and presumably handle this.

**This may be the strongest argument for one structure over the other, and we would like your view.**

We use Stripe for payments and have **Stripe Tax** available but not yet configured for this service. We can automate collection once we know what to collect.

### 3.2 Revenue recognition

- Under **A**, is our revenue the ~10% fee only?
- Under **B**, is our revenue the **gross** order value with the wholesale cost as cost of goods sold — meaning reported revenue is ~10x higher for the same profit?

This affects our financial statements and anything we show investors. We would rather get it right from the first order than restate later.

### 3.3 How we describe the charge to the customer

Under **A**, a platform fee is normally itemised and disclosed. Under **B**, a margin is embedded in the price and normally is not.

Our platform has an existing convention of disclosing fees to users, so we need to know which this is. Getting it wrong means either an incorrect disclosure or a missing one.

### 3.4 Working capital and risk

Under **B**, we collect from the customer and pay the supplier later. That is favourable for cash flow but means we hold funds we owe, and we carry the risk if a customer charges back after the mail has gone out. **Printing cannot be reversed** — once mailed, there is nothing to reclaim.

---

## 4. What we need from you

**Q1 — Which structure should we adopt, and why?** Particularly considering the multi-state sales-tax exposure in 3.1.

**Q2 — Under the recommended structure, what are our sales-tax obligations?** Do we need to register anywhere new? Is the trigger the mailing destination or our own location? Can Stripe Tax handle it?

**Q3 — How should we recognise revenue** — gross with COGS, or net?

**Q4 — Anything else we should have in place before the first order?** Contract terms with the supplier, disclosures to the customer, insurance, record retention.

---

## 5. Useful context

- We have **not** taken a single order. Nothing is live. This is the cheap moment to decide.
- Volume will be deliberately small at first — a pilot of 5–10 orders with known customers.
- No supplier agreement is signed yet, so terms are still negotiable.
- **Related open question:** if the mailing lists are purchased through us, we may be handling consumer names and home addresses, which carries separate privacy obligations. We are trying to structure it so the list stays entirely with PostcardMania and never reaches our systems. Flagging in case it bears on your advice.

---

## 6. Where the answer goes

Record in `ADR-007 §5`. It then unblocks: the fee-versus-margin classification in our pricing configuration, Stripe Tax wiring, the customer-facing receipt, and the refund policy.
