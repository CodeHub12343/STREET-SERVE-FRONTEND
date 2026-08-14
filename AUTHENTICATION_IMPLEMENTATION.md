# StreetServe — Authentication Implementation (Frontend)

> How the Next.js client implements identity, sessions, the additive 9-role model, verification-tier gating, and route protection — against the backend's Clerk-managed auth (`BACKEND/AUTHENTICATION_AND_AUTHORIZATION.md`).
> **Security note:** all client guards are **UX only**. The backend enforces `authenticate → role → ownership → tier` on every route and the socket handshake; the frontend never assumes it is the authority.
> Companion: [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md), [ROUTING_STRUCTURE.md](ROUTING_STRUCTURE.md), [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md).

---

## 1. Provider & identity source

- **Clerk** is the managed auth provider (primary; Auth0 is the documented swap). `@clerk/nextjs` wraps the app via `<ClerkProvider>` (outermost — `NEXTJS_ARCHITECTURE §4`).
- Clerk owns: sign-up/in UI, **OTP** (email/phone), password reset, brute-force protection, session + refresh-token rotation. We build **none** of these (`docs` = "a distraction at pilot stage").
- **Sign-in/up screens (C-03/C-04)** are Clerk-hosted components mounted at `(auth)/sign-in` / `sign-up`. Our custom onboarding (profile, role intent, primers) runs **after** Clerk auth as our own wizard steps.

---

## 2. Token flow

- The **access JWT** (~15 min, Clerk-issued) is attached as `Authorization: Bearer` to every Express API call via `getToken()` in `lib/api/client.ts`.
- The **refresh token** is managed by Clerk (httpOnly / secure storage); rotation + reuse-detection are Clerk's job.
- On a `401` from the API, the client calls `getToken({ skipCache: true })` once and retries; a second `401` → redirect to sign-in with return URL.
- **The socket handshake uses the same JWT** (`auth.token`) — see [REALTIME_IMPLEMENTATION.md](REALTIME_IMPLEMENTATION.md) §2.

> The Express API verifies the JWT against Clerk's **JWKS** (no shared secret, no DB hit on the hot path) — the client just supplies the token.

---

## 3. The Principal (roles come from OUR DB, not the token)

Critical rule from the backend doc: **roles are read from our DB, never from JWT claims.** So the client's authoritative principal is `GET /users/me`, cached at `keys.me`:

```ts
interface Principal {
  userId: string;
  roles: Role[];                              // customer|seller|vendor|hub|shelter_admin|sponsor|admin|ops_finance
  verificationTier: 'tier0'|'bronze'|'silver'|'gold';
  status: 'active'|'suspended';
  cityId?: string;
}
```

- `useMe()` (wrapping `keys.me`) is the single source for roles/tier/status across the app.
- On first authenticated load, the backend JIT-upserts the local user (also synced via `/webhooks/clerk`); the client just fetches `/users/me`.
- **Never** infer capabilities from Clerk's `publicMetadata` roles — always from `/users/me`. (Prevents a stale/forged claim granting a role.)

---

## 4. Additive multi-role model + role switching

- One account holds many roles simultaneously (`customer + seller + vendor`). Trust/history/verification carry forward — **portable across roles** (Q10). There are **no separate logins per role** (`docs/06 §3`).
- Adding a role = `POST /auth/roles` (C-06 and any "become a seller/vendor" entry point). After success, refetch `keys.me`.
- **`RoleSwitcher`** (in every shell topbar/profile) sets `mode.store.activeMode` and navigates to that surface's route group. The switcher only shows roles the user actually holds; "Become a…" launches the add-role + verification wizard.

---

## 5. Route protection (client, UX layer)

Two tiers, backing the authoritative server checks:

### 5.1 `middleware.ts` (coarse — is there a session?)
- `clerkMiddleware` with public matchers: `(marketing)`, `(auth)`, `/api/health`, manifest/SW, and public reads (`/business/[id]`, `/map` browse, `/gift/[code]`).
- Protected matchers: `(customer)/(seller)/(dashboard)/(admin)` → unauthenticated redirects to sign-in with `?redirect_url=`.
- Middleware does **not** know app-roles (they're in our DB, not the token).

### 5.2 Layout guard hooks (fine — role/tier/status)
Per route group (`ROUTING_STRUCTURE §10`):
```ts
useRequireAuth();                       // (customer) — any authenticated user
useRequireRole('seller');               // (seller)   — else → add-role flow
useRequireRole('vendor');               // (dashboard)/vendor
useRequireAnyRole('admin','ops_finance'); // (admin)
```
- Missing role → route to the **add-role/verify** path, not a hard 403 (additive model, friction-scales-with-money principle).
- **Suspended** (`status==='suspended'`) → bounce to a support screen; the backend also rejects at Principal load + socket handshake, so a suspended user can't act even if they bypass the client.

---

## 6. Verification-tier gating (capability gate, not route gate)

Tiers gate **actions**, not whole routes (`BACKEND/AUTHENTICATION_AND_AUTHORIZATION.md §2 Layer 3`). Browsing stays frictionless; verification appears only at money movement (`docs/06 §1`).

| Tier | Unlocks | Gated actions surface as |
|---|---|---|
| tier0 | browse inventory | "Verify to check out" prompt → C-36/S-02 |
| bronze | ID+selfie → low-value checkout | checkout enabled |
| silver | bank linked → standard limits | higher limits |
| gold | sustained trust → premium inventory, higher split, instant payout | premium items enabled |
| shelter | cosign → tier-1-equivalent | capped allocation |

- The client reads `verificationTier` from `keys.me` to **pre-disable** gated CTAs with an explanatory prompt (better UX), but **always** submits and handles the server's `422 LICENSE_REQUIRED` / tier rejection — the tier check is a **security control**, and the server is authoritative.
- **Verification Center (C-36)** and **Seller verify (S-02)** drive `POST /verification/id-document|selfie-liveness|bank-account` (provider-hosted redirects: Stripe Identity/Persona for KYC, Stripe Connect for bank). Status is **async**: submit → `pending` → KYC webhook → tier update → surfaced via `/notifications` socket or `GET /verification/status` poll. **Fail closed:** unresolved = current tier.

---

## 7. Sign-out & session end

- `signOut()` (Clerk) → clears session, **disconnects the socket**, clears the Query cache (`queryClient.clear()`), and (GAP-4) deletes the push token.
- Admin suspension mid-session: the next API call / socket event fails auth → client force-signs-out to the support screen.

---

## 8. Ownership (why the client doesn't enforce it)

Layer-2 **resource ownership** ("seller A can't settle seller B's checkout") is **server-only** — the client can't be trusted to enforce it and doesn't try. The client simply:
- Only *shows* resources returned by "mine" endpoints (`/checkouts/mine`, `/orders/mine`, `/message-threads/mine`).
- Handles `403 FORBIDDEN` gracefully if a user reaches an unauthorized resource by URL manipulation.

---

## 9. Security checklist (frontend obligations)

- [ ] Bearer token from Clerk on every API + socket call; never persisted to localStorage.
- [ ] Roles/tier/status always from `keys.me`, never from JWT claims or client guesses.
- [ ] Every gated action handles `401/403/422` server responses (client guard is not the enforcement).
- [ ] Suspended users bounced everywhere; socket + API failures force sign-out.
- [ ] Sign-out disconnects socket + clears cache + revokes push token.
- [ ] No secret in `NEXT_PUBLIC_*`; only publishable keys (Clerk PK, Stripe PK, Mapbox token) reach the browser.
- [ ] Public reads degrade to a sign-in CTA rather than exposing authed-only data.
```
