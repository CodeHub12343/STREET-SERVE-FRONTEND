# Running a brand on StreetServe

A short guide for anyone running more than one truck under the same name. Everything in here
is live today — if a step below doesn't work, that's a bug, not a plan.

## What a brand is, in two sentences

A **brand** is the parent entity: your name, your logo, your Stripe account(s). A **truck**
(we call it an **operator**) is one person running one vehicle under your brand. One brand can
have one truck or many; adding a second truck doesn't require starting a new profile.

## Setting up for the first time

If you already have a StreetServe profile and want to turn it into a brand with multiple
trucks, send a message to support. They'll run the one-click conversion that:

- Keeps your orders, reviews, followers, and payout history intact.
- Creates a brand with you as the owner.
- Points your existing profile at the brand.
- Optionally seats initial trucks you name.

You don't need to re-register, and your Stripe account stays connected.

## Inviting a second driver

1. Open **Members & invites** from your brand overview.
2. Enter their email, pick **Operator**, pick which truck (business) they're running, and
   give the truck a name — something short like "North truck" that shows on the map pin.
3. Press Send invite.

They get an email with a link that expires in **7 days**. If they already have a StreetServe
account, they also get an in-app notification. On accept, they land on their truck's own
vendor dashboard — they can go live, serve orders, see their own earnings. They cannot:

- Edit the brand's menu, logo, hours, or settings.
- See another operator's orders or earnings.
- Change payout destinations or run promotions.

If you need to withdraw an invite before it's accepted, hit **Revoke** on that row.

## Managers vs operators

- **Operators** run one truck. They go live, serve orders, see their own numbers.
- **Managers** help you run the brand. They can edit the menu, run promotions, invite more
  operators, and see every truck's numbers. They cannot delete the brand or change you as the
  owner.

Invite a manager the same way you invite an operator — pick **Manager** in step 2.

## How payouts work

Two modes. You pick one for the brand; it applies to every sale.

### Pooled (the default)

Every sale lands in your brand's single payout account, exactly like a one-truck profile.
Simple, matches what the pre-franchise app did.

### Per-operator split

Each sale is split between your operators at the share percentages you set. Example: three
operators at 30% / 30% / 40%. Each operator receives their share directly to **their own
connected Stripe account**, in a single atomic transfer per sale.

Two gates have to be cleared before an operator receives money directly:

1. They complete Stripe onboarding (hit the Connect button in their dashboard).
2. **You** approve their Stripe account from your side. This is the guard against an
   operator connecting the wrong account; nobody can route money without your approval.

Until both are cleared, that operator's share goes to **your** account with a specific
reason recorded. No money is ever stranded — the brand owner always catches the fallback.

Switch between pooled and per_operator from the admin brand page any time; the next sale
uses the new policy.

## Refunds under per-operator

If a sale is refunded, the operator transfer for that sale is reversed automatically. You see
this in the brand earnings page as a negative row under "Reversed (refunds)". No manual
action required.

## Taking a truck off a brand

Three ways:

- **Retire the operator row.** Their dashboard access ends, their live pin drops off the map
  within one heartbeat. Historical records (orders they served, earnings they received) stay
  intact. Use this for amicable departures.
- **Revoke the brand membership.** Deeper — removes their role from the brand entirely.
- **For a full ownership change**, contact support. Brand ownership transfer isn't
  self-service; it's a verified handoff.

## Reviews and followers

Both are brand-level. A customer rating any one of your trucks counts toward your brand's
single aggregate rating. A customer following your brand hears whenever any truck goes live.
This matches what customers actually mean when they say "I love James's Ice Cream" — they
don't mean truck #2 specifically.

If a reviewer wants to call out one truck (positive or negative), the review carries an
operator tag — but it still counts toward the brand's score.

## Promotions — including the "every truck except Oakland" case

A promotion runs across every truck of the brand by default. If you want to carve one truck
out, open the sale's settings and add the operator to the **exclusion list**. The map pin for
that truck won't show the discount; the checkout for that truck won't apply it.

Why exclusion and not inclusion: when you add a new truck, it inherits the sale
automatically. Inclusion lists go stale.

## Taxes

Each operator gets their own annual **operator tax statement** that shows direct Stripe
transfers to their account. Pulled from the authoritative split ledger, re-derivable any
time. Your brand's statement (if pooled) is unchanged.

Sales tax is still collected and remitted by StreetServe as marketplace facilitator; Stripe
issues each operator's 1099-K.

## What's not supported yet

- Cross-truck loyalty punch-cards (a stamp earned at truck 1 is not spendable at truck 2 yet).
- Brand-level Pay It Forward funds (each truck has its own PIF pool).
- Brand-level Boost / postcard campaigns (one campaign per business).
- Bulk CSV invite of operators.
- Self-service brand-ownership transfer.

These are tracked and will show up in a later cycle.

## Who to ask

- **Billing questions, Stripe approval issues, operator onboarding problems**: email support.
- **"My invite link doesn't work"**: the invite probably expired at 7 days; have the brand
  owner resend. The accept URL stays the same.
- **"The map pin is wrong"**: check that your operator row is `active` and that your live
  session is `parked` or `driving`, not `away`. If the pin is still wrong, screenshot and
  send to support — the live map's state is reconcilable from the server, so a stuck pin is
  always fixable.
