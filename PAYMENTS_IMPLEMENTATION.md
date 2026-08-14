# StreetServe — Payments Implementation (Frontend)

> How the client implements Stripe payments: Elements/Payment Element mounting, the PaymentIntent flow, idempotency, round-up tips, wallets (Apple/Google Pay), Connect onboarding, receipts/fee-splits, and payout-status surfacing.
> **Money rule:** no raw card data touches our servers; every money mutation is server-authoritative + idempotent. Backend owns PaymentIntents, transfers, tax, payouts, webhooks (`API_SPECIFICATION §5,§7,§9,§11,§15`).
> Companion: [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md) §11, [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md), [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md).

---

## 1. Stack & principles

- **Stripe.js + Stripe Elements / Payment Element** (`docs/07`). Loaded lazily via a memoized `loadStripe()` (`lib/stripe/loadStripe.ts`) — never in the global bundle.
- **`<Elements>` wraps only payment surfaces**, per transaction, with a server-provided `clientSecret` — not the app root (`NEXTJS_ARCHITECTURE §4`).
- **No raw card data on our servers** — the Payment Element tokenizes in-browser. Apple Pay / Google Pay work via the Payment Request API in-browser (not native-only).
- **All amounts integer cents; server computes every total, discount, tip split, and fee** — the client displays, never calculates money.

---

## 2. The PaymentIntent flow (💳 screens: C-22, C-26 pay, C-28, S-06, S-08, V-09, S-14 check-out)

```
1. User confirms intent (cart C-21 → Pay)
2. client → POST /transactions (or /orders, /bookings, /checkouts, /gifts, /ping-budgets)
        headers: Idempotency-Key: <uuid generated once per intent>
        body: { ...domain, applies discount server-side }
   ← { transactionId, clientSecret }        // server created the PaymentIntent
3. <Elements clientSecret> → stripe.confirmPayment(...)   // card/wallet, in-browser
4. Result:
   • success → show pending-confirmation → await server truth
   • requires_action → Stripe handles 3DS in-Element
   • decline → "nothing was taken, order is held" (never silent retry)
5. Backend receives Stripe webhook (/webhooks/stripe) → marks transaction paid
   → emits /notifications 'notify' → client transitions to Receipt (C-24)
```

- **The POST response is the ticket; the webhook/socket is the settle.** The client treats the `notify`/status change as authoritative confirmation, not the `confirmPayment` return alone (`SCREEN_TO_API_MAPPING §11`).
- **Discount is applied server-side** at transaction creation from the locked queue tier (C-20) — the client shows the discount line but never computes it (FR-3/FR-11: discount is a server-side ledger fact, not a client coupon).

---

## 3. Idempotency (mandatory on every 💳 POST)

- Generate a client `Idempotency-Key` (UUID) **once per user intent**, stored with the in-flight mutation; **reused across every retry** (network error, user re-tap). A repeated key returns the cached first response (`API_SPECIFICATION §18`) — this is what prevents double charges.
- The Pay button **locks its width** and disables during flight (`docs/06 §2.6a` loading state); re-taps reuse the same key, never mint a new one.
- Mutations **never auto-retry** (`STATE_MANAGEMENT §2.1`) — idempotency + explicit user retry, not silent retries that could imply a second charge.

---

## 4. Money-safety states (every payment screen)

Per `docs/12 §6` + `docs/13 C-22`:

| State | UI |
|---|---|
| **Idle** | total shown on cart, sheet, and button (3× by design — C-22) |
| **Processing** | genuine **`Spinner`** (the one sanctioned exception to skeleton-only, `docs/06 §2.6e`) — a blocking financial submission |
| **Requires action (3DS)** | handled inside the Payment Element |
| **Success (pending settle)** | "Payment received, confirming…" → resolves on webhook/socket |
| **Decline** | "Nothing was taken — your order is held, not lost" + retry-with-different-method / cancel |
| **Failure-without-double-charge** | explicit no-double-charge reassurance; same idempotency key on retry |
| **409/422** | oversell (S-08) / business-rule specific copy, never generic |

---

## 5. Round-up tips (FR-6.4)

- Round-up is the **pre-selected default** in the tip row (C-21/C-22), framed opt-in-by-default per the source material.
- 100% of the round-up goes to the vendor (no platform cut) — `POST /transactions/:id/round-up`.
- Displayed as a distinct line on the receipt; the client shows the computed round-up amount returned by the server.

---

## 6. Wallets & payment methods

- **Apple Pay / Google Pay** via the Payment Request API surface in the Payment Element automatically when the device/browser supports them — no native app needed (`docs/07`).
- Saved methods render as a radio list (C-22); "Add new" uses the Payment Element setup flow.
- **StreetServe Wallet** (C-35): payment methods + Spot-Me obligations + ping-tip balance, composed client-side from `/transactions/mine` + `/pings/mine` + `/spot-me` (GAP-5 — no single wallet endpoint; acceptable for pilot).

---

## 7. Connect onboarding & payouts (sellers/vendors/hubs)

- Bank linking = **Stripe Connect hosted onboarding** — the client redirects to the Stripe-hosted link from `POST /businesses/:id/payouts/onboard` (vendor V-01) / `POST /payments/connect/onboard` / `/verification/bank-account` (seller S-02). **StreetServe never handles raw bank credentials.**
- **Escrow / connected-account model:** funds route via Stripe Connect (no co-mingling) — the client just initiates and reflects status.
- **Tiered payout timing** surfaced on receipts/settlements/payouts (Bronze 3d / Silver next-day / Gold instant — `AUTHENTICATION_IMPLEMENTATION §6`): C-24, S-10, V-12.
- **Payout/account status** (V-12) from the Connect account status; "action needed" states deep-link back to hosted onboarding.

---

## 8. Receipts, fees & tax

- **`ReceiptCard`** (C-24, S-10, H-05, V-12) renders the server's itemized breakdown: base → discount ("You saved $X as customer #2") → tip → **fee split** → total (`docs/13 C-24`), all tabular numerals.
- **Marketplace-facilitator sales tax** is computed server-side via Stripe Tax — the client displays the tax line, never computes it.
- **Consignment settlement** (S-10): gross − platform fee − hub share = seller net, with payout timing + Trust Score delta — all server-computed.
- The **fee schedule is admin-configurable data** on the backend (`fee_schedule`), never hard-coded — the client always reads fees from the response, never assumes a rate.

---

## 9. Security & compliance checklist (frontend)

- [ ] Only the **publishable key** (`NEXT_PUBLIC_STRIPE_PK`) in the browser; secret key stays on the backend.
- [ ] Card data only ever in the Stripe Element (PCI scope minimized) — never in our state or logs.
- [ ] `Idempotency-Key` on every 💳 POST, reused across retries.
- [ ] No client-side money math — display server values only.
- [ ] Webhook/socket confirmation is authoritative, not the `confirmPayment` return.
- [ ] Decline/failure never silently retries; always explicit no-double-charge messaging.
- [ ] Connect/KYC bank flows are hosted redirects — no raw financial credentials in our UI.
```
