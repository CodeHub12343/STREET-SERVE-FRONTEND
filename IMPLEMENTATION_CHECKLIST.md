# StreetServe — Frontend Implementation Checklist

> The actionable, tickable task list for building the frontend, ordered by the milestones in [FRONTEND_IMPLEMENTATION_ROADMAP.md](FRONTEND_IMPLEMENTATION_ROADMAP.md). Check items as they land. Every item traces to a planning doc.
> Legend: **P0** pilot-critical · **P1** MVP · **P2** V1.x · ⚠️ blocked on a backend gap.

---

## M0 — Foundation & tooling (P0)
- [ ] Next.js App Router + React 18 + TypeScript **strict**; `@/` path alias
- [ ] ESLint (`@typescript-eslint`, react-hooks, no-floating-promises) + Prettier + import-boundary rule (`FOLDER_STRUCTURE §1`)
- [ ] `next.config.js`: `compiler.styledComponents`, Serwist, `next/image`, `next/font`
- [ ] Env wiring: `NEXT_PUBLIC_{API_URL,SOCKET_URL,MAPBOX_TOKEN,STRIPE_PK}` + Clerk PK; `.env.local.example`
- [ ] styled-components **SSR registry** (`lib/registry.tsx`, `useServerInsertedStyleSheet`) — verify no FOUC
- [ ] `styles/`: `tokens.ts`, `theme.ts` (dark+light), `styled.d.ts` typed theme, `GlobalStyle.ts` (focus ring, tabular-nums, reduced-motion)
- [ ] Provider tree (`app/providers.tsx`): Clerk → Registry → Theme → Query → Socket → Toast (`NEXTJS_ARCHITECTURE §4`)
- [ ] `lib/api/client.ts` (bearer, envelope unwrap, error map), `endpoints.ts`, `errors.ts`
- [ ] `lib/query/{queryClient,keys}.ts`; `lib/socket/{io,SocketProvider,useNamespace}.ts`
- [ ] `middleware.ts` public/protected matchers; route-group empty layouts; `loading/error/not-found/global-error`
- [ ] Storybook/Ladle in both themes; CI (typecheck/lint/test/bundle-budget)

## M1 — Primitive & template kit (P0)
- [ ] Primitives: Button (4 variants/2 sizes/loading), IconButton, Input/TextArea, Select/Stepper, Chip/**StatusChip**, Badge, Avatar, **Skeleton**, Spinner, Toast, Banner, **Sheet** (3 snaps), Tabs/SegmentedControl, ProgressRail/Stepper, **Countdown**, Modal, **EmptyState**, **ErrorState** (`COMPONENT_LIBRARY §2`)
- [ ] Layout templates: MapShell, SheetStack, TabPage, WizardFlow, DashboardShell, SettingsList, ConversationView (`COMPONENT_LIBRARY §3`)
- [ ] `Map` + `MapPin`+`StatusRing` + `ClusterPin` (Mapbox dark/light, `docs/06 §2.6h`)
- [ ] a11y baked into primitives: 44px targets, focus ring, aria, reduced-motion
- [ ] Every list/data primitive ships loading/empty/error variants

## M2 — Auth & onboarding (P0)
- [ ] Clerk sign-in/up mounted; JIT `/users/me` principal; `useMe()`
- [ ] `useRequireAuth/Role/AnyRole` guard hooks per group (`ROUTING_STRUCTURE §10`)
- [ ] C-02 welcome, C-05 profile (`PATCH /users/me`), C-06 role intent (`POST /auth/roles`)
- [ ] C-07/08 permission primers; ⚠️push-token registration (GAP-4)
- [ ] `RoleSwitcher` (additive roles, `mode.store`)
- [ ] C-36 Verification center + S-02 seller verify: `/verification/*`, tier ladder, async pending/rejected, shelter path
- [ ] Suspended-account bounce; sign-out clears cache + socket + push

## M3 — Live map (P0)
- [ ] C-10 Map Home: pins, status rings, category tabs, search, Serve-Near-Me FAB
- [ ] `mapViewport.store` + `filters.store`; `GET /map/nearby` (`keys.mapNearby`)
- [ ] Geohash-cell socket subscribe/leave on pan (`REALTIME_IMPLEMENTATION §4`); precision matches backend
- [ ] `pin:update/remove/block_party` → cache patch; interpolate motion, snap on reduced-motion
- [ ] C-12 **list view a11y parity** (sort distance/status)
- [ ] C-14 profile sheet: 5-surface status selector, queue/discount card, action row, TrustScoreBadge, menu preview, reviews
- [ ] States: skeleton pins, "nothing near you" empty, location-denied banner+city fallback, offline stale pins

## M4 — Wave → Queue → Pay (P0)
- [ ] C-18 wave confirm (promise block: SLA + would-be discount); `POST /wave-downs`
- [ ] C-19 wave active 3 sub-states; `Countdown` from **server deadline**; `wave:accepted`; no-charge copy
- [ ] C-20 queue: position dot-rail, locked discount, hold timer, Pop-Up banner, leave=toast; `queue:update`/`popup:delay`
- [ ] C-21 cart: steppers, queue-context card, tip row (round-up default), total on CTA
- [ ] C-22 `PaymentSheet` (Elements), **Idempotency-Key** reused on retry, processing Spinner, decline "nothing taken"
- [ ] C-23 `OrderTracker` (order-ahead) + cancellation card; C-24 `ReceiptCard`/`FeeSplit`
- [ ] Webhook/socket is authoritative settle; e2e: happy path + decline + retry + 409 oversell

## M5 — Vendor operating loop (P0)
- [ ] V-01 registration wizard (business, category+license upload, Stripe Connect onboard)
- [ ] V-02 `LiveStatusToggle` (Driving/Parked/Away, go-live), 422 LICENSE_REQUIRED; location ticks via socket
- [ ] V-03 wave inbox (accept/decline/propose, per-request SLA)
- [ ] V-04 queue mgmt (discount tiers, Pop-Up toggle); V-05 order kanban (ready blocked if away_closed)
- [ ] V-06 menu manager CRUD + Today's Special
- [ ] `GET /businesses/:id/dashboard` wired

## M6 — Seller consignment & hub (P1)
- [ ] S-01 intro; S-03 discover (`GET /products/nearby`, map)
- [ ] S-04 product detail + **Seller Agreement clickwrap gate** (`POST /seller-agreement`)
- [ ] S-05 reserve; S-06 QR checkout (`QRScanner`+`PhotoCapture`, presign upload, idempotency)
- [ ] S-07 My Inventory (return-deadline urgency); S-08 log sale (**409 oversell block**)
- [ ] S-09 return (QR + photos + reconcile); S-10 settlement (`ReceiptCard`, Trust delta)
- [ ] S-11 AI feed (one card at a time); ⚠️S-13 earnings (compose, GAP-6)
- [ ] H-02 catalog, H-03 approvals (TrustScoreBadge, auto-approve), H-04 live inventory map+recall, H-05 settlements

## M7 — Comms, history, profile, scheduling (P1)
- [ ] C-26/27 booking flow + detail (availability, cutoff, reminders)
- [ ] C-31 favorites (live status), C-32/33 messages (`ConversationView`, `/messages` live+receipts)
- [ ] C-25 unified orders history (merge orders+transactions+bookings)
- [ ] C-34 profile, C-35 wallet (compose GAP-5), C-37 settings (per-category prefs, precision, theme), C-38 help
- [ ] V-07 bookings, V-08 messages, V-11 analytics (charts), V-12 payouts
- [ ] ⚠️Notification center + reconnect catch-up (GAP-3); ⚠️web push (GAP-4)

## M8 — Trust, safety & admin (P1)
- [ ] C-16 reviews (transaction-gated composer); C-38 dispute open + evidence upload
- [ ] A-02 dispute console (SLA timers, evidence viewer, resolve)
- [ ] A-03 category/license review; A-05 user mgmt (search/suspend/override/audit-logs)
- [ ] A-04 fraud flags; ⚠️A-01 ops overview (GAP-2 or compose)

## M9 — PWA hardening & V1.x (P1→P2)
- [ ] Serwist SW: precache shell, runtime caching rules (`PWA_IMPLEMENTATION §3`), offline shell states
- [ ] Install prompts (Android `beforeinstallprompt`, iOS hint); manifest + maskable icons
- [ ] Queued seller QR (`offlineQueue.store` + Background Sync, idempotent replay, conflict UI)
- [ ] Query-client persistence for cold-open last-known
- [ ] **P2:** gifting/redemption (C-28/29), Spot Me (C-30), ping budget (V-09), giveaways (V-10), Block Party (C-17), sales coaching (S-12), jobs (S-14), shelter (A-06), sponsors (A-07), hub AI (H-06)

## M10 — Polish & launch readiness
- [ ] Every screen verified with loading/empty/error/offline; money screens with pending + no-double-charge
- [ ] a11y: axe clean + manual screen-reader pass on core flows; keyboard-complete dashboards; list-view parity confirmed
- [ ] Performance: app-shell JS budget met; map/Stripe/QR lazy; Lighthouse PWA pass
- [ ] Responsive matrix (360/390/768/1024/1280/1440 + standalone PWA safe areas)
- [ ] e2e green: auth, wave→queue→pay, seller checkout+oversell, admin dispute resolve, offline queue replay
- [ ] OpenAPI-generated types in sync (contract check green)

---

## Cross-cutting "definition of done" (applies to every screen)
- [ ] Uses only design-system tokens/components (no hard-coded color/space/motion)
- [ ] Loading (skeleton) + actionable empty + retryable error + offline states
- [ ] Correct route group, guard, and layout template per `ROUTING_STRUCTURE`
- [ ] Server state via TanStack Query keys; client state via Zustand; socket patches cache (no parallel store)
- [ ] Handles `401/403/409/422/429` with specific UX (never generic)
- [ ] 💳 screens: idempotency key reused, pending state, no double charge, server-authoritative confirm
- [ ] WCAG 2.1 AA: 44px targets, focus ring, color+icon+text, reduced-motion, aria-live for dynamic values
- [ ] Dark + light themes; responsive per `RESPONSIVE_STRATEGY`
- [ ] Money in cents (format at render); timestamps ISO-8601 UTC; geo `[lng,lat]`

## Backend gaps to close (tracked, owner = backend)
- [x] ⚠️ **GAP-2** `GET /admin/overview` (A-01) — composed snapshot (city, live sessions, active vendors, GMV/orders today, open disputes, fraud flags, pending licenses, new signups). `admin.service.getOverview`; perm `admin:read_overview` (admin + ops_finance).
- [x] ⚠️ **GAP-3** `GET /users/me/notifications` (cursor-paginated + unread count) + `POST …/:id/read` + `…/read-all`. Durable `notifications` collection; `notificationsService.notify` now persists (reconnect catch-up) alongside the realtime emit.
- [x] ⚠️ **GAP-4** `POST /users/me/push-tokens` (+ `DELETE`) — Web Push subscriptions upserted per endpoint (`push_subscriptions`); perm `notifications:manage_self`.
- [x] ⚠️ **GAP-6** seller earnings feed (S-13) — `GET /checkouts/earnings`: settled-payout history + recent daily gross series + pending totals (`consignmentRepository.sellerEarnings`); perm `checkout:manage_own`.
- [x] GAP-1 (docs): `docs/12` platform label updated RN → mobile-first PWA (Next.js App Router).
- [x] GAP-5 **Decision: no action for pilot.** Wallet (C-35) composes client-side from existing feeds (transactions, settlements, spot-me, gifts); a dedicated `GET /users/me/wallet` is deferred until a server-authoritative balance is needed (post-pilot). No orphaned contract — the frontend has no `wallet` endpoint reference.
```
