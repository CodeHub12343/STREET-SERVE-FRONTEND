/**
 * Demo dataset (gated by NEXT_PUBLIC_MAP_DEMO). Lets the whole live-map experience — moving pins,
 * list view, and the status-driven profile sheet — run with no backend or Mapbox token. Structural
 * Centered on the pilot market, Modesto CA.
 *
 * **A-10 — the fixtures are checked against the feature types, not cast to them.** The hooks used to
 * write `demo.menu as MenuItem[]`, and that cast was the risk: demo mode is load-bearing for several
 * component tests, so a breaking API-shape change could rename a field, leave these fixtures
 * untouched, and keep every demo-backed test green while the real path was broken.
 *
 * The casts are gone. The consuming hooks declare their real return type
 * (`queryFn: (): Promise<MenuItem[]>`) and return these fixtures directly, so TypeScript checks
 * assignability at the boundary and a contract change fails the build.
 *
 * The check lives at the CONSUMER rather than here because `lib/` is cross-cutting plumbing and is
 * forbidden from importing `features/` (enforced by `import/no-restricted-paths`). Structural typing
 * makes that constraint free: the shapes below never name the feature types and are still verified
 * against them.
 */
export interface DemoMenuItem {
  id: string;
  name: string;
  priceCents: number;
  todaysSpecial?: boolean;
}
export interface DemoReview {
  id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
}
export interface DemoBusiness {
  id: string;
  sessionId: string;
  name: string;
  category: string;
  logoUrl?: string;
  lngLat: [number, number];
  status: 'driving' | 'parked' | 'away';
  etaMin?: number;
  rating: number;
  reviewCount: number;
  about: string;
  hours: string;
  locationLine: string;
  todaysSpecial?: string;
  trustScore: number;
  menu: DemoMenuItem[];
  reviews: DemoReview[];
  queue: { count: number; cap: number; schedule: { position: number; percent: number }[] };
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    id: 'biz_taco', sessionId: 'sess_taco', name: 'Taco Loco', category: 'food',
    lngLat: [-120.9969, 37.6391], status: 'driving', etaMin: 2, rating: 4.8, reviewCount: 214,
    about: 'Birria, al pastor, and the best consommé in the Central Valley. Chasing the lunch rush.',
    hours: 'Mon–Sat · 11am–9pm', locationLine: 'Heading your way — near Main St & 5th Ave',
    todaysSpecial: 'Birria ramen — $12', trustScore: 92,
    menu: [
      { id: 'm1', name: 'Birria Tacos (3)', priceCents: 1100, todaysSpecial: true },
      { id: 'm2', name: 'Al Pastor Burrito', priceCents: 1000 },
      { id: 'm3', name: 'Elote', priceCents: 500 },
    ],
    reviews: [
      { id: 'r1', author: 'Marisol', rating: 5, body: 'Consommé to die for. Worth the wave.', createdAt: daysAgo(2) },
      { id: 'r2', author: 'Dev', rating: 4, body: 'Fast and friendly, line moved quick.', createdAt: daysAgo(9) },
    ],
    queue: { count: 4, cap: 20, schedule: [{ position: 1, percent: 5 }, { position: 2, percent: 10 }, { position: 3, percent: 15 }, { position: 4, percent: 20 }] },
  },
  {
    id: 'biz_bean', sessionId: 'sess_bean', name: 'Bean Bus', category: 'coffee',
    lngLat: [-120.9925, 37.6415], status: 'parked', etaMin: 0, rating: 4.6, reviewCount: 138,
    about: 'Single-origin pour-overs and cold brew from a converted school bus.',
    hours: 'Daily · 6am–2pm', locationLine: 'Parked — Graceada Park, 15th & Needham',
    todaysSpecial: 'Honey lavender latte', trustScore: 88,
    menu: [
      { id: 'm1', name: 'Cold Brew', priceCents: 450 },
      { id: 'm2', name: 'Honey Lavender Latte', priceCents: 600, todaysSpecial: true },
    ],
    reviews: [{ id: 'r1', author: 'Priya', rating: 5, body: 'Best cold brew in town.', createdAt: daysAgo(1) }],
    queue: { count: 2, cap: 15, schedule: [{ position: 1, percent: 5 }, { position: 2, percent: 10 }] },
  },
  {
    id: 'biz_fix', sessionId: 'sess_fix', name: 'Fix-It Mobile', category: 'services',
    lngLat: [-121.0015, 37.6362], status: 'parked', etaMin: 5, rating: 4.9, reviewCount: 76,
    about: 'On-the-spot phone screen + bike repairs. Book a slot or wave us over.',
    hours: 'Tue–Sun · 9am–6pm', locationLine: 'Parked — Downtown Modesto, 10th St',
    trustScore: 95,
    menu: [{ id: 'm1', name: 'Screen Repair (diagnostic)', priceCents: 0 }],
    reviews: [{ id: 'r1', author: 'Sam', rating: 5, body: 'Fixed my screen in 20 min curbside.', createdAt: daysAgo(4) }],
    queue: { count: 0, cap: 8, schedule: [{ position: 1, percent: 5 }] },
  },
  {
    id: 'biz_thread', sessionId: 'sess_thread', name: 'Thread & Co.', category: 'shopping',
    lngLat: [-120.9902, 37.6378], status: 'driving', etaMin: 6, rating: 4.4, reviewCount: 52,
    about: 'Vintage and upcycled streetwear from a mobile boutique.',
    hours: 'Wed–Sun · 12pm–8pm', locationLine: 'Heading your way — near J St',
    trustScore: 81,
    menu: [], reviews: [],
    queue: { count: 1, cap: 12, schedule: [{ position: 1, percent: 5 }, { position: 2, percent: 10 }] },
  },
  {
    id: 'biz_wok', sessionId: 'sess_wok', name: 'Wok This Way', category: 'food',
    lngLat: [-120.9948, 37.6349], status: 'parked', etaMin: 0, rating: 4.7, reviewCount: 190,
    about: 'Wok-fired noodles and dumplings, made to order.',
    hours: 'Mon–Sat · 11am–10pm', locationLine: 'Parked — 9th & I St',
    todaysSpecial: 'Dan dan noodles', trustScore: 90,
    menu: [
      { id: 'm1', name: 'Dan Dan Noodles', priceCents: 1200, todaysSpecial: true },
      { id: 'm2', name: 'Pork Dumplings (6)', priceCents: 800 },
    ],
    reviews: [{ id: 'r1', author: 'Lena', rating: 5, body: 'Dumplings are unreal.', createdAt: daysAgo(3) }],
    queue: { count: 6, cap: 20, schedule: [{ position: 1, percent: 5 }, { position: 2, percent: 10 }, { position: 3, percent: 15 }] },
  },
  {
    id: 'biz_scoop', sessionId: 'sess_scoop', name: 'Cloud Scoop', category: 'food',
    lngLat: [-121.0031, 37.6428], status: 'away', rating: 4.5, reviewCount: 61,
    about: 'Liquid-nitrogen ice cream. Back on the road tomorrow.',
    hours: 'Thu–Sun · 1pm–9pm', locationLine: 'Closed — opens tomorrow 1pm',
    todaysSpecial: 'Ube soft serve', trustScore: 84,
    menu: [{ id: 'm1', name: 'Ube Soft Serve', priceCents: 650, todaysSpecial: true }],
    reviews: [{ id: 'r1', author: 'Theo', rating: 4, body: 'Fun show, tasty scoop.', createdAt: daysAgo(12) }],
    queue: { count: 0, cap: 15, schedule: [{ position: 1, percent: 5 }] },
  },
];

export function findDemoBusiness(id: string): DemoBusiness | undefined {
  return DEMO_BUSINESSES.find((b) => b.id === id);
}

// ---- Vendor side (Milestone 5) ----
/** The business the demo vendor operates (they run Taco Loco). */
export const DEMO_VENDOR_BUSINESS_ID = 'biz_taco';

const secs = (n: number) => new Date(Date.now() + n * 1000).toISOString();

export interface DemoWaveRequest {
  id: string;
  customerName: string;
  note?: string;
  slaDeadline: string;
  distanceLabel: string;
}

export function demoIncomingWaves(): DemoWaveRequest[] {
  return [
    { id: 'wq_1', customerName: 'Alex R.', note: 'By the blue truck near the park', slaDeadline: secs(230), distanceLabel: '0.3 mi' },
    { id: 'wq_2', customerName: 'Jordan P.', slaDeadline: secs(170), distanceLabel: '0.1 mi' },
  ];
}

export interface DemoVendorOrder {
  id: string;
  customerName: string;
  items: { name: string; qty: number }[];
  totalCents: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  placedAt: string;
}

// ---- Consignment: seller + hub (Milestone 6) ----
export const DEMO_HUB_BUSINESS_ID = 'hub_market';
export const DEMO_HUB_NAME = 'Modesto Maker Market';

export interface DemoProduct {
  id: string;
  hubId: string;
  hubName: string;
  name: string;
  category: string;
  declaredValueCents: number;
  /** Seller's share of each sale, %. */
  sellerSplitPercent: number;
  returnWindowDays: number;
  quantityAvailable: number;
  conditionNotes: string;
  lngLat: [number, number];
  distanceLabel: string;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'prod_candle', hubId: DEMO_HUB_BUSINESS_ID, hubName: DEMO_HUB_NAME, name: 'Soy Candles (12-pack)', category: 'shopping', declaredValueCents: 24000, sellerSplitPercent: 70, returnWindowDays: 14, quantityAvailable: 12, conditionNotes: 'Sealed, no chips', lngLat: [-120.9969, 37.6391], distanceLabel: '0.4 mi' },
  { id: 'prod_tote', hubId: DEMO_HUB_BUSINESS_ID, hubName: DEMO_HUB_NAME, name: 'Canvas Tote Bags (10)', category: 'shopping', declaredValueCents: 15000, sellerSplitPercent: 65, returnWindowDays: 21, quantityAvailable: 10, conditionNotes: 'Screen-printed, minor variance', lngLat: [-120.9925, 37.6415], distanceLabel: '0.6 mi' },
  { id: 'prod_honey', hubId: DEMO_HUB_BUSINESS_ID, hubName: DEMO_HUB_NAME, name: 'Local Honey Jars (24)', category: 'food', declaredValueCents: 30000, sellerSplitPercent: 60, returnWindowDays: 30, quantityAvailable: 24, conditionNotes: 'Glass — handle with care', lngLat: [-121.0015, 37.6362], distanceLabel: '0.3 mi' },
];

export function findDemoProduct(id: string): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((p) => p.id === id);
}

export interface DemoCheckout {
  id: string;
  productId: string;
  productName: string;
  hubName: string;
  quantity: number;
  soldQty: number;
  sellerSplitPercent: number;
  unitPriceCents: number;
  checkedOutAt: string;
  returnDeadline: string;
  status: 'active' | 'returned' | 'settled' | 'return_pending';
  termDays?: number | null;
  expiresAt?: string | null;
  currentUnitPriceCents?: number;
  minimumAuthorizedPriceCents?: number | null;
}

export function demoSellerCheckouts(): DemoCheckout[] {
  return [
    { id: 'co_1', productId: 'prod_candle', productName: 'Soy Candles (12-pack)', hubName: DEMO_HUB_NAME, quantity: 12, soldQty: 5, sellerSplitPercent: 70, unitPriceCents: 2500, checkedOutAt: daysAgo(2), returnDeadline: new Date(Date.now() + 3 * 86_400_000).toISOString(), status: 'active', termDays: 30, expiresAt: new Date(Date.now() + 12 * 86_400_000).toISOString(), currentUnitPriceCents: 2500, minimumAuthorizedPriceCents: 2000 },
    { id: 'co_2', productId: 'prod_honey', productName: 'Local Honey Jars (24)', hubName: DEMO_HUB_NAME, quantity: 24, soldQty: 20, sellerSplitPercent: 60, unitPriceCents: 1500, checkedOutAt: daysAgo(6), returnDeadline: new Date(Date.now() + 12 * 3_600_000).toISOString(), status: 'active' },
  ];
}

/** Seller earnings feed (S-13) — settled payouts + recent daily gross + pending totals, offline. */
export interface DemoSellerEarnings {
  totals: {
    lifetimeGrossCents: number;
    settledNetCents: number;
    settledCount: number;
    pendingGrossCents: number;
    pendingCheckoutCount: number;
  };
  windowDays: number;
  dailyGross: { date: string; grossCents: number; count: number }[];
  payouts: Array<{
    checkoutId: string;
    grossSalesCents: number;
    platformFeeCents: number;
    hubShareCents: number;
    sellerNetCents: number;
    payoutRef: string | null;
    settledAt: string;
  }>;
}

/** Pre-publish fee calculator (R12) offline — mirrors the server's consignment fee + split math. */
export interface DemoFeePreview {
  input: { unitPriceCents: number; splitPercent: number; quantity: number };
  grossCents: number;
  platformFeeCents: number;
  sellerNetCents: number;
  hubShareCents: number;
  customer: {
    subtotalCents: number;
    serviceFeeCents: number;
    processingFeeCents: number;
    taxCents: number;
    totalCents: number;
  };
  rto: null;
  estimated: boolean;
}

export function demoFeePreview(unitPriceCents: number, splitPercent: number, quantity: number): DemoFeePreview {
  const grossCents = Math.max(0, Math.round(unitPriceCents)) * Math.max(1, quantity);
  const platformFeeCents = Math.floor((grossCents * 1000) / 10000); // consignment 10%
  const distributable = grossCents - platformFeeCents;
  const sellerNetCents = Math.floor((distributable * splitPercent) / 100);
  const hubShareCents = distributable - sellerNetCents;
  // Customer-facing fees are OFF at launch (transparency-first), so the customer total = gross.
  return {
    input: { unitPriceCents, splitPercent, quantity },
    grossCents,
    platformFeeCents,
    sellerNetCents,
    hubShareCents,
    customer: {
      subtotalCents: grossCents,
      serviceFeeCents: 0,
      processingFeeCents: 0,
      taxCents: 0,
      totalCents: grossCents,
    },
    rto: null,
    estimated: true,
  };
}

const ymd = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export function demoSellerEarnings(): DemoSellerEarnings {
  const checkouts = demoSellerCheckouts();
  const pendingGross = checkouts.reduce((s, c) => s + c.soldQty * c.unitPriceCents, 0);
  // One already-settled payout (10% platform fee, 70% seller split), plus a couple of recent days.
  const gross = 12_500;
  const platformFee = Math.round(gross * 0.1);
  const sellerNet = Math.round(((gross - platformFee) * 70) / 100);
  const hubShare = gross - platformFee - sellerNet;
  return {
    totals: {
      lifetimeGrossCents: gross + pendingGross,
      settledNetCents: sellerNet,
      settledCount: 1,
      pendingGrossCents: pendingGross,
      pendingCheckoutCount: checkouts.length,
    },
    windowDays: 14,
    dailyGross: [
      { date: ymd(5), grossCents: 5000, count: 2 },
      { date: ymd(3), grossCents: 7500, count: 3 },
      { date: ymd(1), grossCents: 3000, count: 1 },
    ],
    payouts: [
      {
        checkoutId: 'co_settled_1',
        grossSalesCents: gross,
        platformFeeCents: platformFee,
        hubShareCents: hubShare,
        sellerNetCents: sellerNet,
        payoutRef: 'tr_demo_1',
        settledAt: daysAgo(4),
      },
    ],
  };
}

/**
 * Trending (R1b) offline. Mirrors the backend's weighted shape (discount boost + demand + recency)
 * so demo ranking behaves like production: discounting vendors surface first.
 */
export interface DemoTrendingItem {
  businessId: string;
  sessionId: string;
  name: string;
  logoUrl?: string | null;
  categoryId?: string | null;
  status: 'driving' | 'parked';
  discountPercent: number;
  queueCount: number;
  score: number;
  factors: string[];
  reasonSummary: string;
  location: { type: string; coordinates: [number, number] };
}

export function demoTrending(): DemoTrendingItem[] {
  return DEMO_BUSINESSES.filter((b) => b.status !== 'away')
    .map((b) => {
      const discountPercent = b.queue.cap ?? 0;
      const queueCount = b.queue.count ?? 0;
      // Same weights as the server (discount .35 / demand .30 / recency .20); demo pins are fresh.
      const score =
        0.35 * Math.min(1, discountPercent / 25) + 0.3 * Math.min(1, queueCount / 8) + 0.2;
      const factors: string[] = [];
      if (discountPercent > 0) factors.push(`up to ${discountPercent}% off in line`);
      if (queueCount > 0) factors.push(`${queueCount} in line right now`);
      factors.push('just updated their spot');
      return {
        businessId: b.id,
        sessionId: b.sessionId,
        name: b.name,
        logoUrl: b.logoUrl ?? null,
        categoryId: b.category,
        status: b.status as 'driving' | 'parked',
        discountPercent,
        queueCount,
        score: Math.round(score * 1000) / 1000,
        factors,
        reasonSummary: `Trending because: ${factors.join('; ')}.`,
        location: { type: 'Point', coordinates: b.lngLat },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export interface DemoAiRec {
  id: string;
  title: string;
  why: string;
  action: string;
}

export function demoAiRecs(): DemoAiRec[] {
  return [
    { id: 'ai_1', title: 'Sell candles near Graceada Park today', why: 'Weekend foot traffic peaks 11am–2pm and your candles sell 2× faster there.', action: 'Reserve more candles' },
    { id: 'ai_2', title: 'Restock honey — you’re 83% sold', why: 'At your current rate you’ll be out by tomorrow; the hub has 24 more.', action: 'Reserve honey' },
    { id: 'ai_3', title: 'Bundle totes + candles', why: 'Sellers who bundle these lift average order value by ~$8.', action: 'See bundle tips' },
  ];
}

export interface DemoPendingCheckout {
  id: string;
  sellerName: string;
  productName: string;
  quantity: number;
  trustScore: number;
  requestedAt: string;
  shelterCosigned: boolean;
}

export function demoPendingCheckouts(): DemoPendingCheckout[] {
  return [
    { id: 'pc_1', sellerName: 'Dana W.', productName: 'Soy Candles (12-pack)', quantity: 12, trustScore: 88, requestedAt: secs(-600), shelterCosigned: false },
    { id: 'pc_2', sellerName: 'Marcus T.', productName: 'Canvas Tote Bags (10)', quantity: 10, trustScore: 72, requestedAt: secs(-1800), shelterCosigned: true },
  ];
}

// ---- Comms / history / scheduling (Milestone 7) ----
export interface DemoThread {
  id: string;
  businessId: string;
  businessName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}
export interface DemoMessage {
  id: string;
  threadId: string;
  from: 'me' | 'them';
  body: string;
  at: string;
}

export function demoThreads(): DemoThread[] {
  return [
    { id: 'th_taco', businessId: 'biz_taco', businessName: 'Taco Loco', lastMessage: 'Parked at Graceada til 2pm!', lastAt: secs(-300), unread: 1 },
    { id: 'th_bean', businessId: 'biz_bean', businessName: 'Bean Bus', lastMessage: 'Thanks for the order 🙌', lastAt: daysAgo(1), unread: 0 },
  ];
}
export function demoMessages(threadId: string): DemoMessage[] {
  if (threadId === 'th_taco') {
    return [
      { id: 'm1', threadId, from: 'me', body: 'Are you near Graceada Park today?', at: secs(-900) },
      { id: 'm2', threadId, from: 'them', body: 'Parked at Graceada til 2pm!', at: secs(-300) },
    ];
  }
  return [
    { id: 'm1', threadId, from: 'me', body: 'Do you have oat milk?', at: daysAgo(1) },
    { id: 'm2', threadId, from: 'them', body: 'Yep! And thanks for the order 🙌', at: daysAgo(1) },
  ];
}

export interface DemoBooking {
  id: string;
  businessId: string;
  businessName: string;
  service: string;
  startAt: string;
  status: 'confirmed' | 'proposed' | 'cancelled' | 'completed';
  priceCents: number;
}
export function demoBookings(): DemoBooking[] {
  return [
    { id: 'bk_1', businessId: 'biz_fix', businessName: 'Fix-It Mobile', service: 'Phone screen repair', startAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), status: 'confirmed', priceCents: 6000 },
  ];
}
export function demoAvailability(): { value: string; label: string }[] {
  const base = Date.now();
  return [0, 1, 2, 3].map((d) => {
    const t = new Date(base + (d + 1) * 3_600_000 * 6);
    return { value: t.toISOString(), label: t.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) };
  });
}

export interface DemoNotification {
  id: string;
  category: 'wave' | 'order' | 'payout' | 'dispute' | 'verification' | 'message' | 'system';
  title: string;
  body: string;
  at: string;
  read: boolean;
  deeplink?: string;
}
export function demoNotifications(): DemoNotification[] {
  return [
    { id: 'n1', category: 'wave', title: 'Taco Loco accepted your wave', body: 'They’re ~3 min away.', at: secs(-120), read: false, deeplink: '/wave/wave_demo' },
    { id: 'n2', category: 'order', title: 'Order ready for pickup', body: 'Bean Bus — order #2214', at: secs(-1800), read: false, deeplink: '/orders' },
    { id: 'n3', category: 'payout', title: 'Payout on the way', body: '$42.00 to your bank (Bronze, 3-day hold cleared).', at: daysAgo(1), read: true, deeplink: '/profile/wallet' },
    { id: 'n4', category: 'verification', title: 'You reached Silver', body: 'Bank linked — next-day payouts unlocked.', at: daysAgo(2), read: true, deeplink: '/profile/verification' },
  ];
}

export interface NotificationCategory {
  key: DemoNotification['category'];
  label: string;
  /** Safety-critical categories are un-mutable (Flow 12). */
  locked: boolean;
}
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { key: 'wave', label: 'Wave-downs & queue', locked: false },
  { key: 'order', label: 'Orders & bookings', locked: false },
  { key: 'message', label: 'Messages', locked: false },
  { key: 'payout', label: 'Payouts', locked: true },
  { key: 'dispute', label: 'Disputes', locked: true },
  { key: 'verification', label: 'Verification', locked: true },
];

export type HistoryKind = 'order' | 'wave' | 'booking';
export interface DemoHistoryItem {
  id: string;
  kind: HistoryKind;
  title: string;
  subtitle: string;
  amountCents: number;
  at: string;
  status: string;
  deeplink: string;
}
export function demoOrderHistory(): DemoHistoryItem[] {
  return [
    { id: 'h1', kind: 'order', title: 'Taco Loco', subtitle: 'Birria Tacos + Elote', amountCents: 1500, at: secs(-1800), status: 'Completed', deeplink: '/order/txn_demo/receipt' },
    { id: 'h2', kind: 'wave', title: 'Bean Bus', subtitle: 'Wave-down · 10% line-up discount', amountCents: 540, at: daysAgo(1), status: 'Completed', deeplink: '/order/txn_demo/receipt' },
    { id: 'h3', kind: 'booking', title: 'Fix-It Mobile', subtitle: 'Phone screen repair', amountCents: 6000, at: new Date(Date.now() + 2 * 86_400_000).toISOString(), status: 'Confirmed', deeplink: '/booking/bk_1' },
    { id: 'h4', kind: 'order', title: 'Wok This Way', subtitle: 'Dan Dan Noodles', amountCents: 1200, at: daysAgo(3), status: 'Completed', deeplink: '/order/txn_demo/receipt' },
  ];
}

/**
 * A completed demo receipt so the order-history deeplinks (`/order/txn_demo/receipt`) resolve on
 * direct navigation, when nothing was placed in this session (no cached create result).
 */
export function demoReceipt(id: string) {
  const subtotalCents = 1500;
  const discountCents = 150; // 10% line-up discount
  const tipCents = 135; // round-up
  const discounted = subtotalCents - discountCents;
  return {
    id,
    businessId: 'biz_taco',
    businessName: 'Taco Loco',
    context: 'ahead' as const,
    status: 'completed' as const,
    breakdown: {
      subtotalCents,
      discountCents,
      tipCents,
      platformFeeCents: Math.round(discounted * 0.1),
      totalCents: discounted + tipCents,
      discountPercent: 10,
    },
    items: [
      { name: 'Birria Tacos', qty: 1, priceCents: 1100 },
      { name: 'Elote', qty: 1, priceCents: 400 },
    ],
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
    payoutTiming: 'Bronze — payout held 3 days',
    transactionId: 'demo_txn_receipt',
  };
}

export function demoVendorAnalytics() {
  return {
    salesTodayCents: 48200,
    salesWeekCents: 291500,
    ordersToday: 37,
    queueConversion: 0.72,
    avgWaitMin: 6,
    weekSeries: [180, 220, 260, 240, 300, 340, 291].map((v) => v * 100),
    categoryBenchmark: 0.18, // +18% vs category avg
  };
}

// ---- Admin / Trust & Safety (Milestone 8) ----
export function demoAdminOverview() {
  return {
    city: 'Modesto, CA',
    liveSessions: 42,
    activeVendors: 118,
    gmvTodayCents: 1_284_000,
    ordersToday: 863,
    openDisputes: 3,
    fraudFlags: 4,
    pendingLicenses: 2,
    pendingVerifications: 5,
    newSignups: 27,
    // Same window yesterday — the comparison is what makes a daily number mean anything.
    previous: { gmvCents: 1_090_000, orders: 731, newSignups: 34 },
    activity: [
      { action: 'dispute.opened', entityType: 'dispute', entityId: 'dsp_1', at: new Date(Date.now() - 6 * 60_000).toISOString() },
      { action: 'subscription.lapsed', entityType: 'subscription', entityId: 'sub_1', at: new Date(Date.now() - 22 * 60_000).toISOString() },
      { action: 'rto.seller_approved', entityType: 'business', entityId: 'biz_1', at: new Date(Date.now() - 51 * 60_000).toISOString() },
      { action: 'user.suspended', entityType: 'user', entityId: 'usr_1', at: new Date(Date.now() - 96 * 60_000).toISOString() },
    ],
  };
}

export interface DemoDispute {
  id: string;
  subject: string;
  type: 'checkout' | 'transaction' | 'spot-me';
  claimant: string;
  respondent: string;
  amountCents: number;
  status: 'open' | 'awaiting-evidence' | 'resolved';
  slaDeadline: string;
  openedAt: string;
  summary: string;
  evidence: { id: string; by: string; note: string }[];
}
export function demoDisputes(): DemoDispute[] {
  return [
    { id: '4471', subject: 'Item not as described', type: 'checkout', claimant: 'Dana W.', respondent: 'Modesto Maker Market', amountCents: 24000, status: 'open', slaDeadline: new Date(Date.now() + 2 * 86_400_000).toISOString(), openedAt: daysAgo(1), summary: 'Seller claims candles arrived cracked; hub disputes condition at checkout.', evidence: [{ id: 'e1', by: 'Dana W.', note: 'Photo of cracked jars' }, { id: 'e2', by: 'Hub', note: 'Checkout condition photo (intact)' }] },
    { id: '4468', subject: 'Charged after cancel', type: 'transaction', claimant: 'Sam T.', respondent: 'Taco Loco', amountCents: 1800, status: 'awaiting-evidence', slaDeadline: new Date(Date.now() + 12 * 3_600_000).toISOString(), openedAt: daysAgo(2), summary: 'Customer says order was cancelled but a charge appeared.', evidence: [{ id: 'e1', by: 'Sam T.', note: 'Bank statement screenshot' }] },
    { id: '4460', subject: 'Spot-Me not repaid', type: 'spot-me', claimant: 'Priya K.', respondent: 'Marcus L.', amountCents: 2000, status: 'open', slaDeadline: new Date(Date.now() + 4 * 86_400_000).toISOString(), openedAt: daysAgo(1), summary: 'Lender reports Spot-Me past due repay date.', evidence: [] },
  ];
}

export interface DemoCategorySuggestion {
  id: string;
  name: string;
  suggestedBy: string;
  regulated: boolean;
  requiresLicense: boolean;
}
export interface DemoLicenseDoc {
  id: string;
  business: string;
  category: string;
  submittedAt: string;
}
export function demoCategoryReview() {
  return {
    suggestions: [
      { id: 'cs1', name: 'Mobile Barber', suggestedBy: 'Ray’s Cuts', regulated: true, requiresLicense: true },
      { id: 'cs2', name: 'Plant Stand', suggestedBy: 'Green Cart', regulated: false, requiresLicense: false },
    ] as DemoCategorySuggestion[],
    licenses: [
      { id: 'ld1', business: 'Wok This Way', category: 'Food', submittedAt: daysAgo(1) },
      { id: 'ld2', business: 'Fix-It Mobile', category: 'Services', submittedAt: daysAgo(3) },
    ] as DemoLicenseDoc[],
  };
}

export interface DemoFraudFlag {
  id: string;
  kind: 'ping-anomaly' | 'oversell' | 'device-duplicate';
  subject: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  at: string;
}
export function demoFraudFlags(): DemoFraudFlag[] {
  return [
    { id: 'f1', kind: 'device-duplicate', subject: 'user_8821', detail: '3 accounts share one device fingerprint claiming ping tips.', severity: 'high', at: secs(-1200) },
    { id: 'f2', kind: 'oversell', subject: 'co_2210', detail: 'Repeated oversell attempts on honey checkout (blocked).', severity: 'medium', at: secs(-3600) },
    { id: 'f3', kind: 'ping-anomaly', subject: 'user_4410', detail: 'Ping velocity 6× normal in 10 min.', severity: 'medium', at: daysAgo(1) },
    { id: 'f4', kind: 'ping-anomaly', subject: 'user_9902', detail: 'New account, high Spot-Me request rate.', severity: 'low', at: daysAgo(1) },
  ];
}

export interface DemoAdminUser {
  id: string;
  name: string;
  roles: string[];
  tier: string;
  status: 'active' | 'suspended';
  joinedAt: string;
}
export function demoAdminUsers(): DemoAdminUser[] {
  return [
    { id: 'u1', name: 'Dana Wells', roles: ['customer', 'seller'], tier: 'silver', status: 'active', joinedAt: daysAgo(40) },
    { id: 'u2', name: 'Marcus Lee', roles: ['customer', 'vendor'], tier: 'gold', status: 'active', joinedAt: daysAgo(120) },
    { id: 'u3', name: 'Priya Kaur', roles: ['customer'], tier: 'bronze', status: 'active', joinedAt: daysAgo(12) },
    { id: 'u4', name: 'Ray Vasquez', roles: ['customer', 'seller'], tier: 'tier0', status: 'suspended', joinedAt: daysAgo(3) },
  ];
}

export function demoSponsors() {
  return [
    { id: 'sp1', name: 'Modesto Chamber of Commerce', tier: 'Gold', spendCents: 500000, impressions: 128000 },
    { id: 'sp2', name: 'Valley Credit Union', tier: 'Silver', spendCents: 250000, impressions: 74000 },
  ];
}

// ---- V1.x features (Milestone 9) ----
export function demoGiftRedemption(code: string) {
  return { code, businessName: 'Bean Bus', item: 'Honey Lavender Latte', amountCents: 600, from: 'A friend', expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() };
}

export function demoSpotMeContext(businessId: string) {
  const b = findDemoBusiness(businessId);
  return { businessName: b?.name ?? 'Business', trustScore: b?.trustScore ?? 80, maxCents: 2000, historyDays: 45 };
}

export interface DemoPingBudget {
  fundedCents: number;
  spentCents: number;
  tipPerShareCents: number;
  paused: boolean;
  shares: number;
  conversions: number;
}
export function demoPingBudget(): DemoPingBudget {
  return { fundedCents: 5000, spentCents: 3200, tipPerShareCents: 50, paused: false, shares: 64, conversions: 41 };
}

export interface DemoGiveaway {
  id: string;
  item: string;
  dailyCap: number;
  claimedToday: number;
  active: boolean;
}
export function demoGiveaways(): DemoGiveaway[] {
  return [{ id: 'gv1', item: 'Free birria taco', dailyCap: 20, claimedToday: 12, active: true }];
}

// Jobs fixtures moved to lib/demo.jobs.ts — the gig lifecycle needs mutable state (claim → check
// in → check out), which a bare fixture function can't hold.

export const COACHING_OBJECTIONS = [
  { key: 'price', label: 'It’s too expensive', response: 'Acknowledge, then anchor to value: “I hear you — these are hand-poured and last 40+ hours. That’s about 12¢ an hour of cozy.” Offer the bundle for better per-unit value.' },
  { key: 'thinking', label: 'I’ll think about it', response: 'Lower the risk: “Totally — want me to hold one for 10 minutes while you look around? No pressure.” Scarcity + a soft close.' },
  { key: 'cash', label: 'I don’t have cash', response: 'Remove the barrier: “No worries — I take card, Apple Pay, and Google Pay right here.” Show the reader.' },
  { key: 'comparing', label: 'The one down the street is cheaper', response: 'Differentiate, don’t discount: “They’re great! Mine are [unique thing]. Want to smell the difference?” Engage the senses.' },
];

export function demoHubForecast() {
  return {
    topMovers: [
      { name: 'Soy Candles (12-pack)', sellRate: 0.42, restock: true },
      { name: 'Local Honey Jars (24)', sellRate: 0.83, restock: true },
      { name: 'Canvas Tote Bags (10)', sellRate: 0.18, restock: false },
    ],
    reallocation: 'Move 2 candle cases from the west station to Graceada — demand is 2× there this weekend.',
  };
}

export interface DemoShelterPartner {
  id: string;
  name: string;
  status: 'pending' | 'approved';
  residentsEnrolled: number;
  cap: number;
}
export function demoShelterPartners(): DemoShelterPartner[] {
  return [
    { id: 'sh1', name: 'Modesto Gospel Mission', status: 'approved', residentsEnrolled: 18, cap: 30 },
    { id: 'sh2', name: 'Salvation Army Modesto', status: 'pending', residentsEnrolled: 0, cap: 25 },
  ];
}

export function demoVendorOrders(): DemoVendorOrder[] {
  return [
    { id: 'vo_1', customerName: 'Sam T.', items: [{ name: 'Birria Tacos (3)', qty: 1 }, { name: 'Elote', qty: 2 }], totalCents: 2100, status: 'pending', placedAt: secs(-120) },
    { id: 'vo_2', customerName: 'Priya K.', items: [{ name: 'Al Pastor Burrito', qty: 1 }], totalCents: 1000, status: 'pending', placedAt: secs(-60) },
    { id: 'vo_3', customerName: 'Marcus L.', items: [{ name: 'Birria Tacos (3)', qty: 2 }], totalCents: 2200, status: 'preparing', placedAt: secs(-300) },
  ];
}
