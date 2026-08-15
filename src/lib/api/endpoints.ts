/**
 * Typed path builders for the backend `/api/v1` surface (paths verified against the real
 * route files — SCREEN_TO_API_MAPPING.md). Keeps raw path strings out of feature code.
 * This is the foundation set; each feature extends it as its screens are built.
 */
export const endpoints = {
  // identity & verification
  me: '/users/me',
  notificationPreferences: '/users/me/notification-preferences',
  favorites: '/users/me/favorites',
  authRoles: '/auth/roles',
  verificationStatus: '/verification/status',
  verification: {
    idDocument: '/verification/id-document',
    selfieLiveness: '/verification/selfie-liveness',
    bankAccount: '/verification/bank-account',
  },
  pushTokens: '/users/me/push-tokens', // GAP-4: Web Push subscriptions (backend implemented)
  // GAP-3: notifications inbox (backend implemented — reconnect catch-up + the bell).
  notifications: '/users/me/notifications',
  notificationRead: (id: string) => `/users/me/notifications/${id}/read`,
  notificationsReadAll: '/users/me/notifications/read-all',
  publicProfile: (id: string) => `/users/${id}/public-profile`,

  // catalog & platform
  categories: '/catalog/categories',
  launch: '/platform/launch',
  preregistrations: '/preregistrations',
  preregistrationsCount: '/preregistrations/count',
  sponsors: '/sponsors',

  // live map
  mapNearby: '/map/nearby',
  mapTrending: '/map/trending', // R1b: discount-boosted discovery ranking
  liveSessions: {
    start: '/live-sessions/start',
    current: '/live-sessions/current',
    location: (id: string) => `/live-sessions/${id}/location`,
    status: (id: string) => `/live-sessions/${id}/status`,
    popUp: (id: string) => `/live-sessions/${id}/pop-up`,
    heartbeat: (id: string) => `/live-sessions/${id}/heartbeat`,
    stop: (id: string) => `/live-sessions/${id}/stop`,
  },

  // business
  businesses: '/businesses',
  /** Vendor-proposed taxonomy — the "Something else" path, so nobody is blocked by a gap. */
  categorySuggestions: '/category-suggestions',
  /** The signed-in vendor's own businesses — resolves the dashboard's active business. */
  businessesMine: '/businesses/mine',
  business: (id: string) => ({
    root: `/businesses/${id}`,
    menu: `/businesses/${id}/menu`,
    menuItem: (itemId: string) => `/businesses/${id}/menu/${itemId}`,
    reviews: `/businesses/${id}/reviews`,
    dashboard: `/businesses/${id}/dashboard`,
    analytics: `/businesses/${id}/analytics`,
    services: `/businesses/${id}/services`,
    service: (serviceId: string) => `/businesses/${id}/services/${serviceId}`,
    availability: `/businesses/${id}/availability`,
    /** Owner-gated read of the configured weekly windows (the editor's prefill). */
    availabilityWindows: `/businesses/${id}/availability-windows`,
    orders: `/businesses/${id}/orders`,
    follow: `/businesses/${id}/follow`,
    notifyMe: `/businesses/${id}/notify-me`,
    licenseDocuments: `/businesses/${id}/license-documents`,
    /** Resolved capability set — public, because the customer profile picks its CTA from it. */
    modules: `/businesses/${id}/modules`,
    registerHub: `/businesses/${id}/register-hub`,
    payoutsOnboard: `/businesses/${id}/payouts/onboard`,
    payouts: `/businesses/${id}/payouts`,
    queue: `/businesses/${id}/queue`,
    queueServeNext: `/businesses/${id}/queue/serve-next`,
    /** Owner-gated: the business's bookings with customer + service names (V-07). */
    bookings: `/businesses/${id}/bookings`,
  }),

  // wave & queue
  waveDowns: '/wave-downs',
  waveDown: (id: string) => `/wave-downs/${id}`,
  waveAccept: (id: string) => `/wave-downs/${id}/accept`,
  waveDecline: (id: string) => `/wave-downs/${id}/decline`,
  // Backend route is /queues/:ownerType/:ownerId — the ownerType segment is required. The queue UI
  // is business-centric, so it defaults to 'business'; sellers can pass 'seller'.
  queue: (ownerId: string, ownerType: 'business' | 'seller' = 'business') => ({
    root: `/queues/${ownerType}/${ownerId}`,
    me: `/queues/${ownerType}/${ownerId}/me`,
    join: `/queues/${ownerType}/${ownerId}/join`,
    leave: `/queues/${ownerType}/${ownerId}/leave`,
    checkout: `/queues/${ownerType}/${ownerId}/checkout`,
    discountSchedule: `/queues/${ownerType}/${ownerId}/discount-schedule`,
  }),

  // orders, transactions, bookings
  orders: '/orders',
  ordersQuote: '/orders/quote', // R9: server-authoritative price preview (subtotal…total)
  order: (id: string) => `/orders/${id}`,
  orderRefundPreview: (id: string) => `/orders/${id}/refund-preview`, // R13/U6 disclosure
  orderAccept: (id: string) => `/orders/${id}/accept`,
  orderReady: (id: string) => `/orders/${id}/ready`,
  orderComplete: (id: string) => `/orders/${id}/complete`,
  ordersMine: '/orders/mine',
  transactions: '/transactions',
  transactionsMine: '/transactions/mine',
  transaction: (id: string) => `/transactions/${id}`,
  bookings: '/bookings',
  bookingsMine: '/bookings/mine',
  booking: (id: string) => `/bookings/${id}`,
  bookingComplete: (id: string) => `/bookings/${id}/complete`,
  bookingNoShow: (id: string) => `/bookings/${id}/no-show`,
  waveDownsMine: '/wave-downs/mine',

  // messaging
  messageThreads: '/message-threads',
  messageThreadsMine: '/message-threads/mine',
  threadMessages: (id: string) => `/message-threads/${id}/messages`,
  threadRead: (id: string) => `/message-threads/${id}/read`,

  // consignment
  productsNearby: '/products/nearby',
  product: (id: string) => `/products/${id}`,
  hubs: '/hubs', // POST: register a business as a consignment hub (returns QR secret)
  hubsMine: '/hubs/mine', // the operator's own hubs
  hubProducts: (id: string) => `/hubs/${id}/products`,
  hubSettlements: (id: string) => `/hubs/${id}/settlements`,
  hubQr: (id: string) => `/hubs/${id}/qr`, // rotating check-in token (Phase 6)
  hubAnalytics: (id: string) => `/hubs/${id}/analytics`, // H-08 consignment performance
  hubApprovals: (id: string) => `/hubs/${id}/approvals`, // H-03 pending queue
  hubApprovalPolicy: (id: string) => `/hubs/${id}/approval-policy`,
  checkoutApprove: (id: string) => `/checkouts/${id}/approve`,
  checkoutDecline: (id: string) => `/checkouts/${id}/decline`,
  sellerAgreement: '/seller-agreement',
  agreement: (type: string) => `/agreements/${type}`, // R28: versioned, hashed body
  agreementAccept: (type: string) => `/agreements/${type}/accept`,
  checkouts: '/checkouts',
  checkoutsMine: '/checkouts/mine',
  sellerEarnings: '/checkouts/earnings', // GAP-6 (S-13): settled payouts + daily gross + pending
  sellerAnalytics: '/checkouts/analytics', // S-15: what sells, where, how fast
  feePreview: '/checkouts/fee-preview', // R12 (S-13): pre-publish net-payout calculator
  checkout: (id: string) => ({
    sales: `/checkouts/${id}/sales`,
    return: `/checkouts/${id}/return`,
    settlement: `/checkouts/${id}/settlement`,
    extend: `/checkouts/${id}/extend`, // R15
    reducePrice: `/checkouts/${id}/reduce-price`, // R15/R18
    end: `/checkouts/${id}/end`, // R15/§37 — gives notice; the sweep completes it
    autoRenew: `/checkouts/${id}/auto-renew`, // §39
    commission: `/checkouts/${id}/commission`, // §36
  }),

  // Monetization subscriptions (R29/R30)
  subscriptionPlans: '/subscriptions/plans',
  subscriptionsMine: '/subscriptions/mine',
  subscribe: '/subscriptions',
  subscriptionCancel: (plan: string) => `/subscriptions/${plan}/cancel`,
  subscriptionConfirm: (plan: string) => `/subscriptions/${plan}/confirm`,

  // Rent-to-Own (R20–R27)
  rtoDisclose: '/rto/disclose',
  rtoAgreements: '/rto/agreements',
  rtoAgreementsMine: '/rto/agreements/mine',
  rtoAgreement: (id: string) => `/rto/agreements/${id}`,
  rtoStatements: (id: string) => `/rto/agreements/${id}/statements`, // R19 3-party statements
  rtoPayoff: (id: string) => `/rto/agreements/${id}/payoff`,
  // §42/§44 — listings are the seller's offer and the source of every term on an agreement.
  /** Pre-flight: may this business publish an RTO offer at all? Asked before the form, not after. */
  rtoEligibility: '/rto/eligibility',
  rtoListings: '/rto/listings',
  rtoListingsMine: '/rto/listings/mine',
  rtoListing: (id: string) => `/rto/listings/${id}`,
  // §43/§60.3 — the compliance surface: who may sell, where, and in which categories.
  rtoApprovals: '/rto/approvals',
  rtoApproval: (sellerId: string) => `/rto/approvals/${sellerId}`,
  rtoMarkets: '/rto/markets',
  rtoMarketCity: (slug: string) => `/rto/markets/cities/${slug}`,
  // §50 seller remedies — alternatives to letting an agreement fail.
  rtoDefer: (id: string) => `/rto/agreements/${id}/defer`,
  rtoPartialPayment: (id: string) => `/rto/agreements/${id}/partial-payment`,
  rtoArrangement: (id: string) => `/rto/agreements/${id}/arrangement`,
  rtoPause: (id: string) => `/rto/agreements/${id}/pause`,
  rtoReinstate: (id: string) => `/rto/agreements/${id}/reinstate`,
  // §51 voluntary return — preview first, always.
  rtoReturnPreview: (id: string) => `/rto/agreements/${id}/return-preview`,
  rtoReturn: (id: string) => `/rto/agreements/${id}/return`,
  rtoReturnComplete: (id: string) => `/rto/agreements/${id}/return/complete`,
  // §52 — the second signature on a condition report.
  rtoAcknowledgeCondition: (id: string) => `/rto/agreements/${id}/condition/acknowledge`,

  // jobs / "Earn Today" (S-14, API §11) — gig board + geofenced check-in-out → same-day payout
  jobsNearby: '/jobs/nearby',
  jobsMine: '/jobs/mine', // gigs the caller APPLIED to (worker side)
  jobsPosted: '/jobs/posted', // gigs the caller POSTED, with applicant counts (employer side)
  jobTypes: '/jobs/types', // A-5 filter vocabulary — served, never hardcoded client-side
  jobs: '/jobs',
  job: (id: string) => ({
    root: `/jobs/${id}`,
    apply: `/jobs/${id}/apply`,
    checkIn: `/jobs/${id}/check-in`,
    checkOut: `/jobs/${id}/check-out`, // 💳 triggers the payout transfer
    cancel: `/jobs/${id}/cancel`,
    applicants: `/jobs/${id}/applicants`,
    qr: `/jobs/${id}/qr`, // rotating on-site check-in code (poster only)
    noShow: `/jobs/${id}/no-show`,
  }),

  /**
   * Phase D — Academy (D-3/D-4), seller profile (D-2), earn hub (D-1). The Academy reuses the same
   * completions table as B-5's resident course, which is why there is no separate training API.
   */
  academyCourses: '/academy/courses',
  academyCourse: (slug: string) => `/academy/courses/${slug}`,
  academySubmit: (slug: string) => `/academy/courses/${slug}/submit`,
  academyCredentials: '/academy/me/credentials',
  sellerProfile: '/sellers/me/profile',
  sellerProfileOptions: '/sellers/profile-options',
  earn: '/earn',

  // Phase F — monetization. Every paid placement carries a disclosure label the client MUST render.
  waiverStatus: '/subscriptions/waiver/status',
  waiverHistory: '/subscriptions/waiver/history',
  placementsMine: '/placements/mine',
  placementsFeatured: '/placements/featured',
  placementsCampaigns: '/placements/campaigns',
  placementsServe: '/placements/serve',
  placementsPricing: '/placements/pricing',
  placementPause: (id: string) => `/placements/${id}/pause`,
  /** Resume an abandoned checkout — hands back the client secret for an unpaid placement. */
  placementPay: (id: string) => `/placements/${id}/pay`,
  placementClick: (id: string) => `/placements/${id}/click`,
  coursePurchase: (slug: string) => `/academy/courses/${slug}/purchase`,

  // Phase E — AI. The coach can return an UNACHIEVABLE plan; clients must respect that flag.
  coachPlan: '/ai/coach/plan',
  /** Free AI suggestions left this month. Reading it never spends one. */
  aiQuota: '/ai/quota',
  outcomeStats: '/ai/outcomes/stats',
  eventsNearby: '/events/nearby',
  events: '/events',
  hubReallocation: (id: string) => `/ai/hubs/${id}/reallocation`,
  /** H-06 — real sell-through per product, computed from settled consignment sales. */
  hubAiDashboard: (id: string) => `/ai/hubs/${id}/dashboard`,

  // ─── Phase 7 · UX enhancements ─────────────────────────────────────────────────────────────
  // 7.2 — wish lists. The alert on the way back in stock is the feature; the list is the bookmark.
  wishlist: '/users/me/wishlist',
  wishlistItem: (id: string) => `/users/me/wishlist/${id}`,

  // 7.3 / 7.4 — loyalty stamps and referrals.
  businessLoyalty: (id: string) => `/businesses/${id}/loyalty`,
  businessLoyaltyRedeem: (id: string) => `/businesses/${id}/loyalty/redeem`,
  loyaltyCards: '/users/me/loyalty/cards',
  loyaltyRewards: '/users/me/loyalty/rewards',
  referrals: '/users/me/referrals',
  referralCode: '/users/me/referrals/code',
  referralClaim: '/users/me/referrals/claim',

  // 7.5 — scheduled pickup. The slots are generated server-side from the vendor's own settings.
  pickupSlots: (id: string) => `/businesses/${id}/pickup-slots`,

  // 7.6 — flash sales. Reads are public; writes are the same authority as editing the menu.
  flashSales: (id: string) => `/businesses/${id}/flash-sales`,
  flashSalesAll: (id: string) => `/businesses/${id}/flash-sales/all`,
  flashSaleCancel: (id: string) => `/flash-sales/${id}/cancel`,

  // 7.7 / 7.8 — mileage and corridor alerts. Both are movement data; both are self-scoped.
  mileage: '/reports/mileage',
  corridors: '/users/me/corridors',
  corridor: (id: string) => `/users/me/corridors/${id}`,

  // 7.9 — the festivals directory: further out and further ahead than the nearby feed.
  festivals: '/events/festivals',

  // 7.10 — back office. `crew`, never "staff" — see ADR-002.
  businessCrew: (id: string) => `/businesses/${id}/crew`,
  crewRespond: (id: string) => `/crew/${id}/respond`,
  crewMember: (id: string) => `/crew/${id}`,
  myCrews: '/users/me/crews',
  businessExpenses: (id: string) => `/businesses/${id}/expenses`,
  businessExpenseSummary: (id: string) => `/businesses/${id}/expenses/summary`,
  expense: (id: string) => `/expenses/${id}`,
  businessInvoices: (id: string) => `/businesses/${id}/invoices`,
  invoice: (id: string) => `/invoices/${id}`,

  // Admin: contractual notices that reached nobody (7.1).
  undeliveredNotices: '/admin/notices/undelivered',

  // Phase C map layers — viewport-scoped (bbox), read-only projections.
  mapHubs: '/map/hubs', // C-1/C-2 consignment hubs + what's checkoutable there
  mapDemand: '/map/demand', // C-3 aggregate demand tiles (never carries an actor id)
  hubInventoryMap: (id: string) => `/hubs/${id}/inventory-map`, // C-5 owner-only

  /**
   * Shelter Partner Program (Phase B). Two audiences, deliberately separate: `/residents/*` needs
   * no staff permission — a resident must never need shelter-admin rights to see their own money.
   */
  shelterPartner: (id: string) => ({
    enrollments: `/shelter-partners/${id}/enrollments`,
    exit: `/shelter-partners/${id}/enrollments/exit`,
    custody: `/shelter-partners/${id}/custody`,
    disburse: (custodyId: string) => `/shelter-partners/${id}/custody/${custodyId}/disburse`,
    reporting: `/shelter-partners/${id}/reporting`,
  }),
  residentClaim: '/residents/claim', // B-1 redeem the staff-issued code
  residentMe: '/residents/me', // B-2 capability matrix
  residentTrainingCourse: '/residents/training/course', // B-5
  residentTrainingStatus: '/residents/training/status',
  residentTrainingSubmit: '/residents/training/submit',
  residentCustody: '/residents/custody', // B-3 what the shelter is holding for me
  residentCustodyAck: (id: string) => `/residents/custody/${id}/acknowledge`,

  // trust, reviews, disputes
  trustScore: (subjectType: string, subjectId: string) =>
    `/trust-scores/${subjectType}/${subjectId}`,
  /** A-3: the caller's own score AND what it currently earns them (band, limits, fee discount). */
  myTrustBenefits: '/trust-scores/me/benefits',
  reviews: '/reviews',
  disputes: '/disputes',
  dispute: (id: string) => `/disputes/${id}`,

  // ai / recommendations
  aiRecommendationsProducts: '/ai/recommendations/products',
  aiRecommendationsLocations: '/ai/recommendations/locations',
  aiPricingSuggestion: '/ai/pricing-suggestion',
  aiSalesCoaching: '/ai/sales-coaching',
  aiRecommendationAccept: (id: string) => `/ai/recommendations/${id}/accept`,

  // storage (presigned uploads)
  uploadUrl: '/storage/upload-url',

  // seller payouts (Stripe Connect, own account)
  connectOnboard: '/payments/connect/onboard',
  connectStatus: '/payments/connect/status',
  /** A-2: why money is held — tier hold, uncollected cash, missing account, unsettled stock. */
  fundsAvailability: '/payments/funds-availability',

  // disputes (disputes/dispute defined above)
  disputeEvidence: (id: string) => `/disputes/${id}/evidence`,
  disputeResolve: (id: string) => `/disputes/${id}/resolve`,

  // admin
  // digital rail (Phase 2) — customer card payment for consignment stock
  salePaymentIntent: '/sales/payment-intent',
  salePaymentStatus: (id: string) => `/sales/${id}/payment-status`,
  saleCancelPayment: (id: string) => `/sales/${id}/cancel-payment`,
  salePaymentsForCheckout: (id: string) => `/sales/for-checkout/${id}`,
  payPublic: (token: string) => `/pay/${token}`, // public — no auth

  // growth — shares the signed-in user sent, with any tip they earned
  pingsMine: '/pings/mine',
  spotMe: '/spot-me',
  spotMeMine: '/spot-me/mine',
  giftRedeem: (code: string) => `/gifts/${code}/redeem`,
  pingBudget: (businessId: string) => `/ping-budgets/${businessId}`,

  // Pay It Forward (ADR-005). Reads are public — "this business has a community fund" is discovery
  // information, and hiding it behind a login would defeat putting it on the map.
  // Delivery Assist Network (ADR-004). Nothing here is public: an offer, a position and an address
  // are each things exactly one or two people are entitled to see.
  drivers: {
    me: '/drivers/me',
    apply: '/drivers/apply',
    attestation: '/drivers/me/attestation',
    eligibility: '/drivers/me/eligibility',
  },
  deliveries: {
    root: '/deliveries',
    offers: '/deliveries/offers',
    mine: '/deliveries/mine', // the delivery this driver is on, so a reload doesn't strand them
    byId: (id: string) => ({
      root: `/deliveries/${id}`,
      accept: `/deliveries/${id}/accept`,
      pickUp: `/deliveries/${id}/pick-up`,
      complete: `/deliveries/${id}/complete`,
      undeliverable: `/deliveries/${id}/undeliverable`,
      cancel: `/deliveries/${id}/cancel`,
      position: `/deliveries/${id}/position`,
      incidents: `/deliveries/${id}/incidents`,
    }),
  },

  // Boost My Marketing (ADR-006). Reads public — a campaign nobody can see raises nothing.
  /**
   * Postcard Marketing (ADR-007). Note there is no `quote` GET: quoting is a POST because it
   * WRITES a price snapshot onto the order, expiry and all.
   */
  postcards: {
    products: '/postcards/products',
    artworkSpec: (sku: string) => `/postcards/products/${sku}/artwork-spec`,
    listTypes: '/postcards/list-types',
    audiences: (businessId: string) => `/postcards/business/${businessId}/audiences`,
    artwork: (businessId: string) => `/postcards/business/${businessId}/artwork`,
    asset: (assetId: string) => `/postcards/artwork/${assetId}`,
    validateAsset: (assetId: string) => `/postcards/artwork/${assetId}/validate`,
    orders: (businessId: string) => `/postcards/business/${businessId}/orders`,
    order: (orderId: string) => `/postcards/orders/${orderId}`,
    quote: (orderId: string) => `/postcards/orders/${orderId}/quote`,
    // The server route is `pay`; this was `checkout` and 404'd on every attempt to pay.
    checkout: (orderId: string) => `/postcards/orders/${orderId}/pay`,
    cancel: (orderId: string) => `/postcards/orders/${orderId}/cancel`,
    moderationQueue: '/postcards/moderation/queue',
    moderate: (assetId: string) => `/postcards/moderation/${assetId}`,
  },

  boost: {
    estimate: '/boost/estimate',
    currentFor: (businessId: string) => `/boost/business/${businessId}/current`,
    campaigns: (businessId: string) => `/boost/business/${businessId}/campaigns`,
    campaign: (campaignId: string) => ({
      root: `/boost/campaigns/${campaignId}`,
      contributions: `/boost/campaigns/${campaignId}/contributions`,
      topUp: `/boost/campaigns/${campaignId}/top-up`,
      mailDate: `/boost/campaigns/${campaignId}/mail-date`,
      cancel: `/boost/campaigns/${campaignId}/cancel`,
    }),
  },

  payForward: (businessId: string) => ({
    fund: `/pay-it-forward/${businessId}`,
    impact: `/pay-it-forward/${businessId}/impact`,
    contributions: `/pay-it-forward/${businessId}/contributions`, // GET recent · POST to give
    settings: `/pay-it-forward/${businessId}/settings`,
  }),

  // tax (Phase 5)
  sellerTaxStatement: '/tax/statements/seller',
  hubTaxStatement: (id: string) => `/tax/statements/hub/${id}`,
  taxRemittance: '/tax/remittance',

  // refunds (Phase 4)
  refundSale: (id: string) => `/sales/${id}/refund`,
  saleRefunds: (id: string) => `/sales/${id}/refunds`,
  hubRefunds: (id: string) => `/hubs/${id}/refunds`,
  requestRefund: (token: string) => `/pay/${token}/refund-request`, // public

  // seller balance (Phase 3 cash rail)
  myDebts: '/debts/mine',
  myCredit: '/debts/credit',
  repayDebt: (id: string) => `/debts/${id}/repay`,

  // finance (Phase 1 double-entry ledger — read-only)
  financeAccounts: '/finance/accounts',
  financeEntries: '/finance/entries',
  financeReconciliation: '/finance/reconciliation',

  admin: {
    overview: '/admin/overview', // GAP-2 (backend implemented)
    /** Find a business by name, so no admin control has to ask for a Mongo ObjectId. */
    businessSearch: '/admin/businesses/search',
    users: '/admin/users',
    suspend: (id: string) => `/admin/users/${id}/suspend`,
    auditLogs: '/admin/audit-logs',
    disputes: '/admin/disputes',
    fraudFlags: '/admin/fraud-flags',
    sponsors: '/admin/sponsors',
    categorySuggestions: '/admin/category-suggestions',
    categorySuggestionReview: (id: string) => `/admin/category-suggestions/${id}/review`,
    categories: '/admin/categories',
    category: (id: string) => `/admin/categories/${id}`,
    licenseDocs: '/admin/license-documents',
    licenseDocReview: (id: string) => `/admin/license-documents/${id}/review`,
  },
} as const;
