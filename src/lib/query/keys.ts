/**
 * Central query-key registry (STATE_MANAGEMENT.md §3). Factory functions keep keys typed and
 * invalidation surgical (prefix-based). No ad-hoc key arrays anywhere else in the app.
 */
export const keys = {
  me: ['me'] as const,
  verification: ['verification', 'status'] as const,
  notificationPrefs: ['me', 'notification-prefs'] as const,
  notifications: ['me', 'notifications'] as const,

  mapNearby: (bbox: string, cat?: string, q?: string) =>
    ['map', 'nearby', bbox, cat ?? 'all', q ?? ''] as const,
  /** Coords rounded to ~1km so panning doesn't thrash the Trending cache. */
  trending: (lng: number, lat: number) =>
    ['map', 'trending', lng.toFixed(2), lat.toFixed(2)] as const,
  categories: ['catalog', 'categories'] as const,

  myBusinesses: ['business', 'mine'] as const,
  business: (id: string) => ['business', id] as const,
  /** Vendor-side raw business record (canGoLive/licence). Distinct from `business`, which caches
   *  the customer-facing normalized profile under a different shape. */
  vendorBusiness: (id: string) => ['business', id, 'vendor-detail'] as const,
  businessModules: (id: string) => ['business', id, 'modules'] as const,
  vendorServices: (id: string) => ['business', id, 'services'] as const,
  menu: (id: string) => ['business', id, 'menu'] as const,
  vendorMenu: (id: string) => ['business', id, 'menu', 'vendor'] as const,
  liveSession: (id: string) => ['live-session', id] as const,
  waveInbox: (id: string) => ['wave-inbox', id] as const,
  businessOrders: (id: string) => ['business', id, 'orders'] as const,
  reviews: (id: string) => ['business', id, 'reviews'] as const,
  dashboard: (id: string) => ['business', id, 'dashboard'] as const,
  payouts: (id: string) => ['business', id, 'payouts'] as const,
  availability: (id: string) => ['business', id, 'availability'] as const,

  queue: (ownerId: string) => ['queue', ownerId] as const,
  queueMe: (ownerId: string) => ['queue', ownerId, 'me'] as const,
  wave: (id: string) => ['wave', id] as const,

  order: (id: string) => ['order', id] as const,
  refundPreview: (id: string) => ['order', id, 'refund-preview'] as const,
  orderQuote: (businessId: string, items: { menuItemId: string; quantity: number }[], tipCents: number) =>
    ['order-quote', businessId, items.map((i) => `${i.menuItemId}:${i.quantity}`).join(','), tipCents] as const,
  ordersMine: ['orders', 'mine'] as const,
  transaction: (id: string) => ['transaction', id] as const,
  transactionsMine: ['transactions', 'mine'] as const,
  bookings: ['bookings'] as const,
  booking: (id: string) => ['booking', id] as const,

  // Monetization
  subscriptionPlans: ['subscriptions', 'plans'] as const,
  entitlements: (businessId?: string) => ['subscriptions', 'mine', businessId ?? 'user'] as const,

  // Rent-to-Own (R20–R27)
  rtoListings: (scope: string) => ['rto', 'listings', scope] as const,
  rtoListing: (id: string) => ['rto', 'listing', id] as const,
  rtoListingsMine: (sellerId: string) => ['rto', 'listings', 'mine', sellerId] as const,
  rtoEligibility: (sellerId: string, categoryId?: string) =>
    ['rto', 'eligibility', sellerId, categoryId ?? 'any'] as const,
  rtoMarkets: ['rto', 'markets'] as const,
  rtoApprovals: ['rto', 'approvals'] as const,
  rtoAgreementsMine: ['rto', 'mine'] as const,
  rtoAgreement: (id: string) => ['rto', id] as const,

  favorites: ['favorites'] as const,
  threadsMine: ['message-threads', 'mine'] as const,
  thread: (id: string) => ['message-threads', id] as const,

  productsNearby: (cat?: string) => ['products', 'nearby', cat ?? 'all'] as const,
  product: (id: string) => ['product', id] as const,
  sellerAgreement: ['seller-agreement'] as const,
  agreement: (type: string) => ['agreement', type] as const,
  sellerEarnings: ['seller', 'earnings'] as const,
  payoutStatus: ['seller', 'payout-status'] as const,
  /** A-2: the payout-hold explainer. */
  fundsAvailability: ['seller', 'funds-availability'] as const,
  financeAccounts: (ownerType: string, accountType: string) =>
    ['finance', 'accounts', ownerType, accountType] as const,
  financeEntries: (scope: string) => ['finance', 'entries', scope] as const,
  financeReconciliation: ['finance', 'reconciliation'] as const,
  salePayment: (id: string) => ['sale-payment', id] as const,
  taxStatement: (year: number) => ['tax', 'statement', year] as const,
  taxRemittance: ['tax', 'remittance'] as const,
  myDebts: ['seller', 'debts'] as const,
  myCredit: ['seller', 'credit'] as const,
  payPublic: (token: string) => ['pay', token] as const,
  feePreview: (unitPriceCents: number, splitPercent: number, quantity: number) =>
    ['seller', 'fee-preview', unitPriceCents, splitPercent, quantity] as const,
  checkoutsMine: ['checkouts', 'mine'] as const,
  checkout: (id: string) => ['checkout', id] as const,
  settlement: (id: string) => ['checkout', id, 'settlement'] as const,
  myHubs: ['hub', 'mine'] as const,
  hubProducts: (id: string) => ['hub', id, 'products'] as const,
  hubPendingCheckouts: (id: string) => ['hub', id, 'pending-checkouts'] as const,
  hubSettlements: (id: string) => ['hub', id, 'settlements'] as const,
  hubApprovalPolicy: (id: string) => ['hub', id, 'approval-policy'] as const,
  hubStationToken: (id: string) => ['hub', id, 'station-token'] as const,
  hubAnalytics: (id: string) => ['hub', id, 'analytics'] as const,
  hubRefunds: (id: string) => ['hub', id, 'refunds'] as const,

  trust: (type: string, id: string) => ['trust', type, id] as const,
  /** A-3: the caller's own band and what it unlocks. */
  myTrustBenefits: ['trust', 'me', 'benefits'] as const,

  /**
   * Phase C map layers. Bbox is rounded to ~1km in the key so a pixel of pan doesn't refetch —
   * the same trick `jobsNearby` uses, applied to all four corners.
   */
  mapHubs: (bbox: string, category?: string) => ['map', 'hubs', bbox, category ?? 'all'] as const,
  mapDemand: (bbox: string) => ['map', 'demand', bbox] as const,
  hubInventoryMap: (id: string) => ['hub', id, 'inventory-map'] as const,

  // Phase F — monetization.
  waiverStatus: ['seller', 'waiver'] as const,
  placementsMine: (scope: string) => ['placements', 'mine', scope] as const,
  placementsPricing: ['placements', 'pricing'] as const,
  /** Ads served for a surface. Keyed by surface + context so two feeds never share a fill. */
  placementsServe: (placement: string, ctx: string) => ['placements', 'serve', placement, ctx] as const,

  // Phase E — AI.
  coachPlan: ['ai', 'coach'] as const,
  aiQuota: ['ai', 'quota'] as const,
  eventsNearby: (bbox: string) => ['events', 'nearby', bbox] as const,
  hubReallocation: (id: string) => ['hub', id, 'reallocation'] as const,
  hubAiDashboard: (id: string) => ['hub', id, 'ai-dashboard'] as const,

  // Phase D — Academy, seller profile, earn hub.
  academyCourses: ['academy', 'courses'] as const,
  academyCourse: (slug: string) => ['academy', 'course', slug] as const,
  academyCredentials: ['academy', 'credentials'] as const,
  sellerProfile: ['seller', 'profile'] as const,
  earn: (bbox: string) => ['earn', bbox] as const,

  // Phase B — Shelter Partner Program.
  residentMe: ['resident', 'me'] as const,
  residentTraining: ['resident', 'training'] as const,
  residentCustody: ['resident', 'custody'] as const,
  shelterCustody: (partnerId: string) => ['shelter', partnerId, 'custody'] as const,
  shelterReport: (partnerId: string) => ['shelter', partnerId, 'reporting'] as const,
  dispute: (id: string) => ['dispute', id] as const,
  aiRecs: ['ai', 'recommendations'] as const,
  pingsMine: ['pings', 'mine'] as const,
  spotMe: ['spot-me'] as const,
  /** The device's own position — shared by the jobs board and geofenced check-in. */
  deviceLocation: ['device', 'location'] as const,
  /**
   * Coords rounded to ~1km so a small GPS drift doesn't refetch the whole board. The A-5 type
   * filter is part of the key — it changes the server's result set, so it cannot share a cache
   * entry with the unfiltered board.
   */
  jobsNearby: (lng?: number, lat?: number, types?: readonly string[]) =>
    [
      'jobs',
      'nearby',
      lng?.toFixed(2) ?? 'none',
      lat?.toFixed(2) ?? 'none',
      types?.length ? [...types].sort().join(',') : 'all',
    ] as const,
  jobsMine: ['jobs', 'mine'] as const,
  job: (id: string) => ['jobs', id] as const,
  /** A-5 filter vocabulary — effectively static, fetched once. */
  jobTypes: ['jobs', 'types'] as const,

  // ─── Phase 7 ────────────────────────────────────────────────────────────────────────────
  wishlist: ['me', 'wishlist'] as const,
  loyaltyCards: ['me', 'loyalty', 'cards'] as const,
  loyaltyRewards: ['me', 'loyalty', 'rewards'] as const,
  businessLoyalty: (id: string) => ['business', id, 'loyalty'] as const,
  referrals: ['me', 'referrals'] as const,
  pickupSlots: (id: string) => ['business', id, 'pickup-slots'] as const,
  flashSales: (id: string) => ['business', id, 'flash-sales'] as const,
  flashSalesAll: (id: string) => ['business', id, 'flash-sales', 'all'] as const,
  corridors: ['me', 'corridors'] as const,
  /** Mileage is scoped by actor AND window — a 7-day view must not read a 30-day cache entry. */
  mileage: (actorType: string, actorId: string, days: number) =>
    ['reports', 'mileage', actorType, actorId, days] as const,
  festivals: (lng?: number, lat?: number, withinDays?: number) =>
    ['events', 'festivals', lng?.toFixed(2) ?? 'none', lat?.toFixed(2) ?? 'none', withinDays ?? 60] as const,
  businessCrew: (id: string) => ['business', id, 'crew'] as const,
  myCrews: ['me', 'crews'] as const,
  businessExpenses: (id: string) => ['business', id, 'expenses'] as const,
  businessExpenseSummary: (id: string, from: string, to: string) =>
    ['business', id, 'expenses', 'summary', from, to] as const,
  businessInvoices: (id: string) => ['business', id, 'invoices'] as const,
  undeliveredNotices: ['admin', 'notices', 'undelivered'] as const,

  // Pay It Forward
  communityFund: (businessId: string) => ['business', businessId, 'community-fund'] as const,
  communityImpact: (businessId: string) => ['business', businessId, 'community-impact'] as const,
  communityContributions: (businessId: string) =>
    ['business', businessId, 'community-contributions'] as const,

  // Delivery
  driverProfile: ['me', 'driver-profile'] as const,
  driverEligibility: ['me', 'driver-eligibility'] as const,
  deliveryOffers: ['deliveries', 'offers'] as const,
  activeDelivery: ['deliveries', 'mine'] as const,
  delivery: (id: string) => ['delivery', id] as const,

  // Boost My Marketing
  // Postcard Marketing (ADR-007)
  postcardProducts: ['postcards', 'products'] as const,
  postcardArtworkSpec: (sku: string) => ['postcards', 'artwork-spec', sku] as const,
  postcardListTypes: ['postcards', 'list-types'] as const,
  postcardOrders: (businessId: string) => ['business', businessId, 'postcard-orders'] as const,
  postcardOrder: (orderId: string) => ['postcards', 'order', orderId] as const,
  postcardAsset: (assetId: string) => ['postcards', 'asset', assetId] as const,
  postcardModerationQueue: ['postcards', 'moderation-queue'] as const,

  boostCurrent: (businessId: string) => ['business', businessId, 'boost-current'] as const,
  boostCampaign: (campaignId: string) => ['boost', campaignId] as const,
  boostContributions: (campaignId: string) => ['boost', campaignId, 'contributions'] as const,

  // admin
  adminOverview: ['admin', 'overview'] as const,
  adminBusinessSearch: (q: string) => ['admin', 'businesses', 'search', q] as const,
  adminDisputes: ['admin', 'disputes'] as const,
  categoryReview: ['admin', 'category-review'] as const,
  adminCategories: ['admin', 'categories'] as const,
  adminLicenseDocs: ['admin', 'license-documents'] as const,
  licenseDocuments: (businessId: string) => ['business', businessId, 'license-documents'] as const,
  adminUsers: ['admin', 'users'] as const,
  fraudFlags: ['admin', 'fraud-flags'] as const,
  auditLogs: ['admin', 'audit-logs'] as const,
  sponsors: ['admin', 'sponsors'] as const,
} as const;
