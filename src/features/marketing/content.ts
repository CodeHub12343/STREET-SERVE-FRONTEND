/**
 * Landing-page copy — the D1 draft copy from LANDING_PAGE_SECTION_BREAKDOWN.md, in one module so
 * client sign-off edits happen in exactly one place. Binding copy rules (Strategy §6): AI is
 * always "smart"/"AI-assisted", no blanket license claims, no unqualified instant-payout claims,
 * real numbers only.
 */
import { launchState } from './marketing.config';

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

export const navLinks = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#benefits', label: 'Who it’s for' },
  { href: '#faq', label: 'FAQ' },
] as const;

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
    prelaunch: 'Launching first in Modesto, CA · Backed by Wonder Ice · Free for customers',
    live: 'Live in Modesto, CA · Backed by Wonder Ice · Free for customers',
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

export const partners = {
  eyebrow: 'Partners',
  title: 'Backed by people who believe in the street.',
  lead: 'Wonder Ice — national launch partner',
  cta: { label: 'Become a launch sponsor', href: 'mailto:partners@streetserve.app' },
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
        live: 'We’re live in Modesto, CA. You can sign up from anywhere — your city and role help us decide where the map lights up next.',
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
        { label: 'Contact', href: 'mailto:hello@streetserve.app' },
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
    prelaunch: `© ${new Date().getFullYear()} StreetServe · Launching first in Modesto, CA`,
    live: `© ${new Date().getFullYear()} StreetServe · Live in Modesto, CA`,
  }),
} as const;
