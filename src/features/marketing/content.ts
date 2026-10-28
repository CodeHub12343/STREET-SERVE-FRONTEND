/**
 * Landing-page copy — the D1 draft copy from LANDING_PAGE_SECTION_BREAKDOWN.md, in one module so
 * client sign-off edits happen in exactly one place. Binding copy rules (Strategy §6): AI is
 * always "smart"/"AI-assisted", no blanket license claims, no unqualified instant-payout claims,
 * real numbers only.
 */
import { launchState, marketingConfig } from './marketing.config';

/**
 * Resolves a launch-state copy variant. The page has always had a `prelaunch | live` switch, but
 * nothing read it — so every CTA said "Join the waitlist" no matter what the flag was set to.
 * Anything whose wording depends on whether the product is actually usable goes through here,
 * which keeps both versions of a line side by side in the same file the client signs off on.
 */
function v<T>(variants: { prelaunch: T; live: T }): T {
  return variants[launchState];
}

/**
 * The primary conversion label, shared by the hero, nav, sticky bar and final CTA so they can
 * never drift apart — two of those had it hardcoded, which is part of why the flag was inert.
 */
export const cta = {
  primary: v({ prelaunch: 'Get early access', live: 'Get started free' }),
  compact: v({ prelaunch: 'Get early access', live: 'Get started' }),
} as const;

/**
 * Main nav. Two kinds of entry now live here: `#anchor` links that scroll within the landing page,
 * and real routes that navigate away. The nav used to assume every entry was an anchor — it fed
 * `href.slice(1)` straight to `getElementById` for the active-section highlight — so a route entry
 * would have been observed as the element `map`, which does not exist. Callers must branch on
 * `href.startsWith('#')`; `sectionAnchors` below does that once for the observer.
 *
 * The live map earns a top-level slot because it is the product; sponsorship and investment share
 * one entry because they share one page (client requirement: a single link, not two).
 */
/**
 * Nav entry. A top-level entry is either a plain link (`href`) or a dropdown parent (`children`,
 * no `href`) — the parent reveals its children on hover/focus and never navigates on its own.
 * The split exists so a sponsor can see the two sponsorship programs without the page having to
 * pack them into one entry: "Sponsor / Invest" and "Great Ice Cream Giveaway" are different
 * surfaces with different rate cards and should not share a landing page.
 */
export type NavChild = { readonly href: string; readonly label: string; readonly description?: string };
export type NavLink =
  | { readonly href: string; readonly label: string }
  | { readonly label: string; readonly children: readonly NavChild[] };

export const navLinks: readonly NavLink[] = [
  { href: '/map', label: 'Live map' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#benefits', label: 'Who it’s for' },
  {
    label: 'Sponsorships',
    children: [
      {
        href: '/sponsor',
        label: 'Platform sponsorships',
        description: 'Long-running placement on the live map and landing page.',
      },
      {
        href: '/sponsor/ice-cream-giveaway',
        label: 'Great Ice Cream Giveaway',
        description: '90-day campaign sponsorship — Silver through Diamond.',
      },
    ],
  },
  { href: '#faq', label: 'FAQ' },
] as const;

/** The subset of nav targets that are sections of this page — the only ones scroll-spy can track. */
export const sectionAnchors = navLinks
  .filter((l): l is { href: string; label: string } => 'href' in l && l.href.startsWith('#'))
  .map((l) => l.href.slice(1));

export const hero = {
  // Pre-launch the old eyebrow claimed "Live" while the button underneath said "Get early access" —
  // the page contradicted itself in two adjacent lines. Each state now says one thing.
  eyebrow: v({
    prelaunch: 'The mobile economy, on the map',
    live: 'Live now — the mobile economy, on the map',
  }),
  h1Lead: 'Your city is open for business.',
  h1Accent: 'Right now.',
  support:
    'Every food truck, mobile pro, and street seller on one live map. Wave them down. Skip the line with early-bird discounts. Or start earning today — no inventory, nothing upfront.',
  ctaPrimary: cta.primary,
  ctaSecondary: 'Explore the live map',
  trustLine: v({
    prelaunch: `Launching first in ${marketingConfig.launchCity} · Free for customers · Works on any phone`,
    live: `Live in ${marketingConfig.coverage} · Free for customers · Works on any phone`,
  }),
  simChip: 'Simulated preview',
  /** Offscreen text alternative for the map scene (LANDING_PAGE_ACCESSIBILITY.md §5). */
  mapAlt:
    'Simulated preview: a live map of Modesto showing food trucks and mobile vendors — some driving, some parked — receiving wave-down requests and forming discount lines.',
} as const;

export const howItWorks = {
  eyebrow: 'How it works',
  title: 'Find it. Earn from it. Grow with it.',
  steps: [
    {
      key: 'find',
      title: 'Find',
      audience: 'For customers',
      body: 'See who’s live near you, wave them down, and lock an early-bird discount by getting in line first.',
      link: { href: '#benefits', label: 'For customers' },
    },
    {
      key: 'earn',
      title: 'Earn',
      audience: 'For sellers',
      body: 'Reserve products from local businesses with nothing upfront. Sell on the live map. Return what doesn’t sell for $0. Get paid automatically.',
      link: { href: '#benefits', label: 'For sellers' },
    },
    {
      key: 'grow',
      title: 'Grow',
      audience: 'For vendors',
      body: 'Broadcast where you are, turn your line into loyalty with tiered discounts, and let customers ping your next customers.',
      link: { href: '#benefits', label: 'For vendors' },
    },
  ],
} as const;

export const features = {
  eyebrow: 'Core features',
  title: 'Built for the street.',
  cards: [
    {
      key: 'wave',
      size: 'large',
      icon: '👋',
      title: 'Wave Down',
      body: 'See a vendor moving? Wave. They come to you or drop a stop.',
    },
    {
      key: 'lineup',
      size: 'large',
      icon: '🏷️',
      title: 'Line-Up Discounts',
      body: 'The earlier you line up, the less you pay. Vendors set the cap.',
    },
    {
      key: 'ping',
      size: 'medium',
      icon: '📣',
      title: 'Ping Your Squad',
      body: 'Forward the alert. If your ping brings a buyer, you earn the tip.',
    },
    {
      key: 'blockparty',
      size: 'medium',
      icon: '🎉',
      title: 'Block Party',
      body: 'When vendors cluster, the whole neighborhood gets the alert.',
    },
    {
      key: 'consignment',
      size: 'medium',
      icon: '📦',
      title: 'Consignment Selling',
      body: 'Sell real products with zero upfront cost. Split the profit automatically.',
    },
    {
      key: 'assistant',
      size: 'medium',
      icon: '✨',
      title: 'Smart Seller Assistant',
      body: 'Smart suggestions on what to sell and where — it gets sharper as the street does.',
    },
    {
      key: 'gifting',
      size: 'small',
      icon: '🎁',
      title: 'Gifting & Spot Me',
      body: 'Buy for a friend to redeem — or spot someone now, they pay it back later.',
    },
    {
      key: 'scheduling',
      size: 'small',
      icon: '📅',
      title: 'Scheduling',
      body: 'Book the mobile groomer for Tuesday. Reminders included.',
    },
    /**
     * Direct-mail postcards were fully built — ordering wizard, artwork moderation, print
     * fulfilment — and named nowhere a prospective vendor could see before signing up. A paid
     * feature that only existing users can discover is a feature nobody buys.
     */
    {
      key: 'postcards',
      size: 'small',
      icon: '📮',
      title: 'Direct-Mail Postcards',
      body: 'Print and mail real postcards to the streets around you. Pick the area, we handle the rest.',
    },
  ],
  categories: [
    'Food',
    'Coffee',
    'Detailing',
    'Grooming',
    'Beauty',
    'Repairs',
    'Handmade',
    '+90 more',
  ],
} as const;

export const showcase = {
  eyebrow: 'Real-time map',
  title: 'Watch a wave-down happen.',
  simChip: 'Simulated preview',
  beats: [
    {
      step: '01',
      title: 'Tacos El Rey goes live',
      body: 'One tap and the truck is on the map — status ring green, pin moving with them down the street.',
    },
    {
      step: '02',
      title: 'Maria waves them down',
      body: 'She’s two blocks away. The driver accepts, the route redraws to her corner, and the ETA starts counting.',
    },
    {
      step: '03',
      title: 'The line forms — early birds win',
      body: 'First in line locks 15% off. Next takes 10%. The discount ladder is set by the vendor, visible to everyone.',
    },
    {
      step: '04',
      title: 'One tap to pay. Everyone’s square.',
      body: 'Base price, discount, round-up tip — itemized and split transparently the moment the sale settles.',
    },
  ],
} as const;

export type BenefitRole = 'customers' | 'vendors' | 'sellers' | 'businesses';

export const benefits = {
  eyebrow: 'Who it’s for',
  title: 'Which one are you?',
  roles: [
    {
      key: 'customers' as BenefitRole,
      tab: 'Customers',
      heading: 'Never miss the truck again.',
      items: [
        {
          title: 'Know before you go',
          body: 'Live pins and proximity alerts — no more driving to an empty corner.',
        },
        {
          title: 'Pay less for showing up first',
          body: 'Early-bird line-up discounts, locked the moment you join the line.',
        },
        {
          title: 'One tap to tip, gift, or spot a friend',
          body: 'Round-up tips, giftable orders, and community credit built in.',
        },
      ],
      cta: { label: v({ prelaunch: 'Join the waitlist', live: 'Get started' }), role: 'customer' },
    },
    {
      key: 'vendors' as BenefitRole,
      tab: 'Vendors',
      heading: 'Fewer wasted stops. Louder word of mouth.',
      items: [
        {
          title: 'See where demand actually is',
          body: 'Wave-downs and live queues show you where to park before you park.',
        },
        {
          title: 'Turn your line into loyalty',
          body: 'Tiered line-up discounts and Pop-Up mode keep your regulars coming early.',
        },
        {
          title: 'Reach without ad spend',
          body: 'Ping-to-ping sharing and Block Party alerts put your pin in front of new customers.',
        },
      ],
      cta: { label: 'List your business', role: 'vendor' },
    },
    {
      key: 'sellers' as BenefitRole,
      tab: 'Sellers',
      heading: 'Start earning today. Nothing upfront.',
      items: [
        {
          title: '$0 to start',
          body: 'Reserve consignment inventory from local businesses — you owe nothing until you sell, and returns cost $0.',
        },
        {
          title: 'Smart guidance in your corner',
          body: 'AI-assisted suggestions on what to sell and where — it gets smarter as more sellers use it.',
        },
        {
          title: 'Fast, automatic payouts',
          body: 'Your share splits out automatically as sales settle. Build trust, unlock more.',
        },
      ],
      cta: { label: 'Start earning', role: 'seller' },
    },
    {
      key: 'businesses' as BenefitRole,
      tab: 'Businesses & Hubs',
      heading: 'Your products, a street-level salesforce.',
      items: [
        {
          title: 'Distribution without a storefront',
          body: 'Upload inventory and let verified sellers move it across the city.',
        },
        {
          title: 'See where your inventory moves',
          body: 'A real-time view of what’s checked out, where it’s selling, and what’s coming back.',
        },
        {
          title: 'Become a hub, earn on every checkout',
          body: 'Retail stores, churches, community centers — pickup points earn on the flow.',
        },
      ],
      cta: { label: 'Supply the street', role: 'hub' },
    },
  ],
} as const;

export const impact = {
  eyebrow: 'Community',
  title: 'See good, do good.',
  body: 'StreetServe is built with shelter and community partners from day one. Verified partners help residents get trained, start with sponsored inventory, and build a real track record — an on-ramp to income, run with dignity. Donated goods and handmade products from nonprofits move through the same map as everything else.',
  vignette:
    'A community church turns donated goods into local income. A shelter partner co-signs a resident’s first inventory. A first sale becomes a first streak.',
  /**
   * Points at the real thing now. This was a `mailto:` — the only way to sponsor StreetServe was to
   * email someone and hope, which is why the sponsor feature had no sponsors: there was no path in.
   */
  cta: { label: 'Sponsor StreetServe', href: '/sponsor' },
} as const;

export const trust = {
  eyebrow: 'Security & trust',
  title: 'Real money moves here. We treat it that way.',
  tiles: [
    {
      icon: '🔒',
      title: 'Verified payouts',
      body: 'Payments processed by Stripe. Funds split automatically the moment a sale settles.',
    },
    {
      icon: '🪪',
      title: 'Verified people',
      body: 'Tiered ID verification — Bronze to Gold. More trust unlocks more access.',
    },
    {
      icon: '🧾',
      title: 'Transparent splits',
      body: 'You always see the split before you commit. No hidden fees, no surprises at payout.',
    },
    {
      icon: '⚖️',
      title: 'Disputes handled',
      body: 'A real resolution process with evidence, timelines, and humans — not a black hole.',
    },
  ],
  feeExample: {
    label: 'Example split on a $20 sale',
    note: 'Illustrative example — final fee schedule is shown in-app before you commit.',
    rows: [
      { label: 'Seller share', value: '$14.00', pct: 70 },
      { label: 'Inventory owner', value: '$4.50', pct: 22.5 },
      { label: 'StreetServe fee', value: '$1.50', pct: 7.5 },
    ],
  },
} as const;

/**
 * Annual sponsorship tiers (client brief, 2027 program). Five fixed packages — $10K → $1M.
 * The landing section renders these as a card grid; the full self-serve purchase lives on
 * `/sponsor`. Numbers are the client's proposed annual deliverables and are what a sponsor
 * is quoted. Keep them in one place so the comparison table and the per-card stats cannot
 * drift apart.
 */
export const sponsorshipTiers = {
  eyebrow: 'Sponsorships',
  title: 'Five ways to put your brand on the map.',
  support:
    'Annual packages from $10,000 to $1,000,000. Every tier includes 12-month logo placement, a full company profile with a clickable link, and a monthly delivery schedule for shoutouts, social videos, and direct-mail postcards.',
  cta: { label: 'See full details & become a sponsor', href: '/sponsor#sponsorships' },
  /** The one tier card we lift visually. The client called out Platinum as the headline tier. */
  featuredSlug: 'platinum',
  tiers: [
    {
      slug: 'silver',
      name: 'Silver',
      kicker: 'Small Business Sponsor',
      priceAnnual: 10_000,
      summary:
        'An entry-level annual package for local businesses, startups, restaurants, retailers, and service companies seeking consistent exposure.',
      deliverables: { shoutouts: 100, videos: 48, postcards: 5_000 },
      perks: [
        '12-month logo placement',
        'Dedicated business profile + clickable link',
        'Promotional posts featuring your products',
        'Postcards with branded QR codes',
        'Quarterly performance reports',
      ],
    },
    {
      slug: 'gold',
      name: 'Gold',
      kicker: 'Business Growth Sponsor',
      priceAnnual: 50_000,
      summary:
        'For growing businesses, regional companies, and service providers that want a daily marketing presence and consistent customer outreach.',
      deliverables: { shoutouts: 365, videos: 100, postcards: 10_000 },
      perks: [
        '12-month logo placement',
        'Enhanced profile + sponsor directory listing',
        'Daily shoutout cadence (365/yr)',
        'Postcard ads with QR codes & offers',
        'Quarterly performance reports',
      ],
    },
    {
      slug: 'platinum',
      name: 'Platinum',
      kicker: 'Premium Business Sponsor',
      priceAnnual: 100_000,
      summary:
        'Frequent social media exposure, consistent video marketing, and substantial postcard distribution — the headline mid-tier.',
      deliverables: { shoutouts: 730, videos: 200, postcards: 50_000 },
      perks: [
        'Priority sponsor logo placement',
        'Enhanced profile with product highlights',
        'Two shoutouts daily (730/yr)',
        'Branded postcards with QR codes & offers',
        'Monthly reports + quarterly planning',
      ],
    },
    {
      slug: 'diamond',
      name: 'Diamond',
      kicker: 'Elite Corporate Sponsor',
      priceAnnual: 500_000,
      summary:
        'For established national and regional brands seeking continuous visibility, premium placement, and a major social presence.',
      deliverables: { shoutouts: 730, videos: 300, postcards: 20_000 },
      perks: [
        'Premium placement in all sponsor areas',
        'Dedicated promotional landing page',
        'Featured sponsor-directory positioning',
        'Priority scheduling for launches & seasons',
        'Monthly reports + quarterly strategy reviews',
      ],
    },
    {
      slug: 'kingdom-legacy',
      name: 'Kingdom Legacy',
      kicker: 'Premier Corporate Sponsor',
      priceAnnual: 1_000_000,
      summary:
        'National-scale brand exposure and a leading promotional partnership — our highest tier, for major corporations.',
      deliverables: { shoutouts: 730, videos: 365, postcards: 500_000 },
      perks: [
        'Premier logo placement site-wide',
        'Dedicated sponsor landing page + trackable QR',
        'Priority scheduling & co-branded campaigns',
        'Monthly reports + quarterly strategy meetings',
        '~41,667 postcards distributed monthly',
      ],
    },
  ],
  pillars: [
    'Website logo placement — prominence by tier',
    'Full sponsor profile with clickable links',
    'Social shoutouts & branded videos',
    'Direct-mail postcards with trackable QR',
  ],
  footnote:
    'All figures are proposed annual deliverables. Monthly cadence is averaged; exact schedules are agreed in each contract and the full annual quantity is guaranteed.',
} as const;

export const partners = {
  eyebrow: 'Partners',
  title: 'Backed by people who believe in the street.',
  /**
   * There is no named lead partner any more. The honest thing to show when the sponsor roster is
   * empty is an invitation, not a placeholder name — a logo band naming a partner we cannot point
   * at is the same fabrication the flags elsewhere in this file exist to avoid.
   */
  empty: 'The first logos here are still open. Sponsors appear once their placement is approved.',
  cta: { label: 'Become a launch sponsor', href: marketingConfig.sponsorHref },
} as const;

/**
 * ═══ Sponsorships & Investors — one public page, two audiences. ═══
 *
 * Sponsorship and investment used to be the same thing here: a `mailto:`. They are not the same
 * thing, and conflating them is how a serious investor enquiry ended up in the same inbox as a
 * logo placement. They share a page because the client asked for a single nav entry, but the page
 * separates them, because what each one is buying is different:
 *
 *  • A **sponsor** buys a placement. It is priced, it is self-serve, and it is transactional.
 *  • An **investor** is not buying anything on a web page. There is no instrument to sell and no
 *    price to quote, so the only honest CTA is a conversation — anything resembling a "buy in"
 *    button would be a solicitation this page is in no position to make.
 */
export const sponsorPage = {
  title: 'Sponsorships & Investors',
  lede:
    'Two ways to back the street economy: put your name on the map, or back the company building it.',
  sponsor: {
    eyebrow: 'Platform sponsorships',
    title: 'Put your logo on the map.',
    body:
      'Your logo on the landing page and a link that credits you with every person who signs up through it. One payment for the term you choose — no recurring charge, no auto-renewal.',
    /**
     * A visible pointer to the second sponsorship program (Great Ice Cream Giveaway). The
     * platform page and the giveaway page share this file; a sponsor who lands here looking for
     * the giveaway should see a one-line link out instead of being stranded.
     */
    giveawayHint: {
      label: 'Sponsoring the Great Ice Cream Giveaway?',
      cta: 'See the giveaway packages →',
      href: '/sponsor/ice-cream-giveaway',
    },
  },
  investors: {
    eyebrow: 'Investors',
    title: 'Back the company.',
    body:
      'StreetServe is building the live map of the mobile economy — food trucks, mobile pros, and street sellers, on one map, in all states Nationwide. If you invest in early-stage marketplaces, we would like to talk.',
    /**
     * Deliberately not a payment. Nothing on this page offers or sells a security, and no figure
     * appears that we cannot stand behind — an investor page that quotes a valuation or a return
     * it has not committed to is a liability, not a lead.
     */
    points: [
      'Three sides on one map: customers, vendors, and sellers.',
      'Consignment, rent-to-own, and direct-mail marketing already shipped and in use.',
      'Revenue from transaction fees, vendor subscriptions, and marketing placements.',
    ],
    cta: { label: 'Contact us about investing', href: `mailto:${marketingConfig.contactEmail}?subject=${encodeURIComponent('StreetServe — investor enquiry')}` },
    note: 'This page is information only. It is not an offer to sell, or a solicitation of an offer to buy, any security.',
  },
} as const;

export const faq = {
  eyebrow: 'FAQ',
  title: 'Fair questions.',
  items: [
    {
      slug: 'free',
      q: 'Is StreetServe free?',
      a: 'Free for customers — browsing, waving down, and joining lines cost nothing. Vendors and sellers pay a fee on completed transactions, and you always see it before you commit.',
    },
    {
      slug: 'cities',
      q: 'What cities do you cover?',
      a: v({
        prelaunch:
          'We’re launching first in Modesto, CA. Pre-register from anywhere — your city and role help us decide where the map lights up next.',
        live: `We’re live in ${marketingConfig.coverage}. Sign up from anywhere — your city and role help us decide where the map lights up brightest next.`,
      }),
    },
    {
      slug: 'start-money',
      q: 'Do I need money to start selling?',
      a: 'No. Consignment means you reserve inventory with nothing upfront — you owe nothing until you sell, and you can return anything unsold for $0.',
    },
    {
      slug: 'nothing-sells',
      q: 'What if nothing sells?',
      a: 'You return the inventory within the agreed window and owe nothing. Your time is the only thing you risked — and the smart assistant exists to make that less likely next time.',
    },
    {
      slug: 'license',
      q: 'Do vendors need a license?',
      a: 'It depends on your category and city — mobile food and personal services are regulated almost everywhere. Onboarding walks you through exactly what your category requires before you go live.',
    },
    {
      slug: 'payouts',
      q: 'How fast do I get paid?',
      a: 'Your share splits out automatically as sales settle. New accounts may see a short hold while identity verification completes — as you build trust, payouts get faster and limits rise.',
    },
    {
      slug: 'location',
      q: 'How does the wave-down work? Is my location shared?',
      a: 'Your location stays approximate until you actively wave a vendor down. Vendors control when their pin broadcasts. You can read the full policy on our privacy page.',
    },
    {
      slug: 'ai',
      q: 'Is the AI actually AI?',
      a: 'Honest answer: smart, rules-first recommendations that get sharper as more people sell. We’d rather under-promise than dress up guesses as predictions.',
    },
  ],
} as const;

export const finalCta = {
  eyebrow: 'Get started',
  title: v({ prelaunch: 'Claim your spot on the map.', live: 'Get on the map today.' }),
  support: v({
    prelaunch: 'Be first in line when the map goes live in Modesto — and vote your city next.',
    live: 'Join the map in Modesto in about a minute — and vote your city next.',
  }),
  ctaPrimary: cta.primary,
  ctaSecondary: 'Explore the live map',
  footnote: v({
    prelaunch: 'Free to join · No spam · Works on any phone — no app store needed',
    live: 'Free to join · Free for customers · Works on any phone — no app store needed',
  }),
} as const;

export const footer = {
  tagline: 'The live map of your city’s mobile economy.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Live map', href: '/map' },
        { label: 'How it works', href: '#how-it-works' },
        { label: 'For vendors', href: '#benefits' },
        { label: 'For sellers', href: '#benefits' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Our mission', href: '#impact' },
        { label: 'Partners', href: '#partners' },
        { label: 'Contact', href: `mailto:${marketingConfig.contactEmail}` },
        { label: 'Sponsorships & Investors', href: marketingConfig.sponsorHref },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of service', href: '/terms' },
        { label: 'Privacy policy', href: '/privacy' },
      ],
    },
  ],
  newsletter: {
    title: 'Stay in the loop',
    body: v({
      prelaunch:
        'Launch news, new cities, and founding-member updates — join the waitlist and you’re on the list.',
      live: 'New cities, new features, and founding-member updates — straight to your inbox.',
    }),
    cta: { label: v({ prelaunch: 'Join the waitlist', live: 'Get started' }), href: '#cta' },
  },
  legalLine: v({
    prelaunch: `© ${new Date().getFullYear()} StreetServe · Launching first in ${marketingConfig.launchCity}`,
    live: `© ${new Date().getFullYear()} StreetServe · Live in ${marketingConfig.coverage}`,
  }),
} as const;

/**
 * ═══ THE GREAT ICE CREAM GIVEAWAY — sponsorship landing content. ═══
 *
 * Separate from `sponsorPage` because the Great Ice Cream Giveaway is a different sponsorship
 * program (`program: 'ice_cream_giveaway'` on the backend): different tier names, a one-time
 * price for a fixed 90-day window instead of a monthly recurring commitment, and a different
 * benefit mix (shout-outs, promotional videos, postcards). Reuses the SAME checkout and the
 * SAME admin review path — only the rate card and the comparison matrix differ.
 *
 * Prices are mirrored from `GIVEAWAY_SPONSOR_TIERS` in the backend; the server re-derives the
 * amount on purchase, so these are display-only. The rate-card figures after each benefit are
 * what the sponsor would otherwise pay for that item, kept so the "proposed value" line matches
 * the one quoted in the backend constants.
 */
export const giveawayProgram = {
  slug: 'ice_cream_giveaway' as const,
  title: 'The Great Ice Cream Giveaway',
  tagline: 'A 90-day Silicon Valley community campaign — pursuing the Guinness World Records attempt for most ice creams given away through one mobile platform in 24 hours.',
  hero: {
    eyebrow: '90-day sponsorship & advertising program',
    h1: 'Give away ice cream. Get your brand on every cone.',
    body:
      'StreetServes is bringing together mobile ice cream vendors, community supporters, and corporate sponsors to give away hundreds — potentially thousands — of free ice creams throughout Silicon Valley. Your sponsorship covers shout-outs, giveaway videos, printed postcards distributed to real households, and logo placement across every giveaway event. Every package runs 90 days.',
    bullets: [
      'Professional social-media shout-outs and branded promotional videos.',
      'Printed postcards distributed directly to consumers.',
      'Logo placement and sponsor recognition on StreetServes.com.',
      'Promotional exposure through participating ice-cream giveaway events.',
      'Campaign performance tracking and reporting.',
    ],
    aim: 'Our ambition is to expand this initiative into a Guinness World Records attempt for ice creams distributed through an online platform within 24 hours, subject to official approval.',
  },
  packages: [
    {
      slug: 'silver',
      name: 'Silver',
      priceCents: 300_000,
      rateCardCents: 290_000,
      kicker: 'Local community visibility',
      pitch: 'Ideal for landscaping, plumbing, HVAC, locksmith, cleaning, and other local businesses.',
      lines: [
        { label: 'Website logo placement', valueCents: 25_000 },
        { label: '10 shout-outs', valueCents: 25_000 },
        { label: '14 giveaway videos', valueCents: 140_000 },
        { label: '500 postcards', valueCents: 100_000 },
      ],
    },
    {
      slug: 'gold',
      name: 'Gold',
      priceCents: 500_000,
      rateCardCents: 600_000,
      kicker: 'Expanded local exposure',
      pitch: 'Established businesses wanting broader local reach and a featured sponsor profile.',
      lines: [
        { label: 'Premium website logo', valueCents: 50_000 },
        { label: '30 shout-outs', valueCents: 75_000 },
        { label: '20 giveaway videos', valueCents: 200_000 },
        { label: '1,000 postcards', valueCents: 200_000 },
        { label: 'Event recognition', valueCents: 50_000 },
        { label: 'Featured sponsor profile', valueCents: 25_000 },
      ],
    },
    {
      slug: 'platinum',
      name: 'Platinum',
      priceCents: 1_000_000,
      rateCardCents: 1_260_000,
      kicker: 'Premium regional campaign',
      pitch: 'Established regional businesses looking for a premium promotional partnership.',
      lines: [
        { label: 'Priority website logo', valueCents: 75_000 },
        { label: '60 shout-outs', valueCents: 150_000 },
        { label: '40 giveaway videos', valueCents: 400_000 },
        { label: '2,500 postcards', valueCents: 500_000 },
        { label: 'Featured sponsor profile', valueCents: 35_000 },
        { label: 'Giveaway recognition', valueCents: 75_000 },
        { label: 'Monthly reporting', valueCents: 25_000 },
      ],
      /** Co-branded + spotlight are included benefits; the rate-card total omits a line value. */
      note: 'Dedicated sponsor spotlight and co-branded giveaway are included benefits but are not assigned separate values in this rate-card total.',
    },
    {
      slug: 'diamond',
      name: 'Diamond',
      priceCents: 2_500_000,
      rateCardCents: 2_725_000,
      /**
       * Diamond is Contact-us, not self-serve. The checkout refuses it server-side; the landing
       * page renders a mailto CTA on this card instead of a scroll-to-checkout button. The real
       * reason the tier differs from Platinum is "negotiated category exclusivity", and
       * negotiation does not fit on a form.
       */
      contactOnly: true,
      contactCta: {
        label: 'Contact us about Diamond',
        href: `mailto:${marketingConfig.contactEmail}?subject=${encodeURIComponent('Great Ice Cream Giveaway — Diamond sponsorship enquiry')}`,
      },
      kicker: 'Premier campaign partnership',
      pitch: 'Major regional sponsors looking for premier recognition and negotiated category exclusivity.',
      lines: [
        { label: 'Premier website logo', valueCents: 150_000 },
        { label: '120 shout-outs', valueCents: 300_000 },
        { label: '80 giveaway videos', valueCents: 800_000 },
        { label: '5,000 postcards', valueCents: 1_000_000 },
        { label: 'Featured sponsor profile', valueCents: 50_000 },
        { label: 'Premium event branding', valueCents: 150_000 },
        { label: '3 additional spotlight videos', valueCents: 75_000 },
        { label: 'Co-branded giveaway promotion', valueCents: 150_000 },
        { label: 'Reporting and tracking', valueCents: 50_000 },
      ],
    },
  ],
  comparison: {
    rows: [
      { label: 'Advertising period', values: ['90 days', '90 days', '90 days', '90 days'] },
      { label: 'Social-media shout-outs', values: ['10', '30', '60', '120'] },
      { label: 'Branded promotional videos', values: ['14', '20', '40', '80'] },
      { label: 'Printed & distributed postcards', values: ['500', '1,000', '2,500', '5,000'] },
      { label: 'Sponsor logo placement', values: ['Standard', 'Premium', 'Priority', 'Premier'] },
      { label: 'Featured business profile', values: ['—', 'Yes', 'Yes', 'Yes'] },
      { label: 'Dedicated sponsor spotlight videos', values: ['—', '—', '1', '3'] },
      { label: 'Giveaway event recognition', values: ['Standard', 'Premium', 'Premium', 'Premier'] },
      { label: 'Co-branded giveaway opportunity', values: ['—', '—', 'Yes', 'Yes'] },
      { label: 'Campaign reporting', values: ['Final', 'Final', 'Monthly', 'Monthly'] },
      { label: 'Category exclusivity', values: ['—', '—', 'Optional', 'Negotiable'] },
    ],
    columnNames: ['Silver $3K', 'Gold $5K', 'Platinum $10K', 'Diamond $25K'],
  },
  roster: {
    eyebrow: 'Sponsors',
    title: 'Partners of the Great Ice Cream Giveaway.',
    empty:
      'The first sponsor logos are open. New partners appear here once their logo has been approved.',
  },
  disclaimer:
    'All advertising values are proposed StreetServes rate-card figures, not independently verified market valuations. Specific distribution locations, social channels, video formats, event availability, and category exclusivity are documented in the sponsorship agreement before any payment is accepted.',
  contact: {
    label: 'Questions? Email',
    email: marketingConfig.contactEmail,
    phone: '209-622-9391',
  },
} as const;

