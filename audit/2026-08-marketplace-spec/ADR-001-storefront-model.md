# ADR-001 · What a storefront is

**Status:** Accepted — 2026-08-02 (roadmap task 4.4, recommendation A-8)
**Decides:** whether a storefront is a *menu with richer presentation* or a *genuine catalog with a
hub-independent product model*.
**Blocks:** MS-1 (storefronts), MS-5 (used equipment), MS-6 (wholesale), HR-9 (vendor websites),
M-40. Five features sit on this distinction and, built independently, each would resolve it
differently.

---

## The situation

Two things are sellable today and they are not variations of each other:

| | `menu_items` | `products` |
|---|---|---|
| Owner | the business selling it | a **hub** (`hub_id`, required) |
| Fields | name, description, photo, price, availability | + split %, term days, return window, condition requirements, min trust score, required certification, quantity, listing type |
| Settlement | one party | three parties (seller / hub / platform), with snapshotted terms |
| Lifecycle | edit and delete | checkout → consignment → settlement → expiry / termination |

A non-hub vendor — the taco truck, which is the platform's centre of gravity — has a *menu*. They
have no `hub_id`, so they cannot have a `product` at all.

## What the five features actually need

- **MS-1 storefronts** — presentation. A nicer page over whatever the business sells.
- **HR-9 vendor websites** — presentation, externally hosted.
- **M-40** — presentation.
- **MS-5 used equipment** and **MS-6 wholesale** — *not* presentation. These are goods a **seller
  owns themselves**, listed for sale, with no hub holding them and no consignment split.

That split is the finding. Three of the five need a rendering contract. Two need something that
does not exist: **an item whose owner is a seller or a business rather than a hub.**

## Decision

**A storefront is a presentation layer, not a data model. It renders a `SellableItem` — a read
contract both existing models map onto. No third table is introduced for it.**

And, separately: **`products` generalises from "hub inventory" to "goods with an owner"**, where the
owner may be a hub (consignment, as today), a business, or a seller (MS-5 / MS-6). `hub_id` becomes
`owner_type` + `owner_id`, with `hub` as the only value the consignment settlement path accepts.

### Why not merge menu items into products

Because they differ in **ownership and settlement**, not in presentation, and merging optimises the
wrong one. A merged table puts fifteen consignment-only fields on every taco — nullable, meaningless,
and load-bearing for nobody — and every settlement code path acquires a branch that asks "is this
one actually consigned?". The audit's own list of what not to change includes *terms are
snapshotted, not referenced*; that discipline is only tractable because consignment rows are
recognisably consignment rows.

### Why not build storefronts as a third model

Because a storefront has no state of its own. It is a business, its items, and a layout. A
`storefronts` collection would immediately need to answer "which items?" — and the answer is "the
ones the business already has", which is a query, not a table.

### Why generalise the owner rather than adding a `seller_products` table

MS-5 and MS-6 items need the same reads (browse, search, discovery, photos, category), the same
purchase path, and the same refund path as consignment products. The only genuine difference is who
gets paid. That is a settlement concern, and settlement already dispatches on `listing_type`. A
parallel table would duplicate every read and every index to avoid one branch that already exists.

## The contract

`SellableItem` (`src/modules/catalog/sellable.ts`) is the shape a storefront renders:

```ts
interface SellableItem {
  id, kind: 'menu_item' | 'product',
  name, description, photoUrl, priceCents, available,
  owner: { type: 'business' | 'hub' | 'seller'; id: string },
  // Present only when the item carries consignment terms; absent for a menu item.
  consignment?: { splitPercent, termDays, returnWindowHours, minTrustScore, requiredCertification },
}
```

`priceCents` is the customer-facing price in both cases — `price_cents` for a menu item,
`unit_value_cents` for a product. Naming them the same in the contract is the point: a storefront
that has to know which field to read is a storefront that will read the wrong one.

The optional `consignment` block is deliberately optional rather than zeroed. A menu item with
`splitPercent: 0` would be indistinguishable from a badly configured consignment product; an absent
block cannot be misread.

## Consequences

**Now (this ADR + the contract):**
- MS-1, HR-9, and M-40 have one shape to build against. Storefront work is UI work.
- The contract exists and is tested; nothing else changed.

**When MS-5 / MS-6 are built (the L half, not done here):**
- Migrate `products.hub_id` → `owner_type` + `owner_id`, backfilling every existing row to
  `('hub', hub_id)`. `hub_id` stays as a read-only alias through one release.
- `addProduct` and `checkout` must **reject a non-hub owner on the consignment path**, default-deny,
  the same way `SUPPORTED_LISTING_TYPES` is already enforced. A seller-owned item settling through
  the three-party split would pay a hub that never held the goods.
- The A-2 reachability gate covers the new `owner_type` enum automatically.

**Not decided here:** whether a business can list *both* a menu and owned goods. The contract
supports it; no product requirement asks for it yet.
