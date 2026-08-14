/**
 * Paid placement contracts (F-1/F-3, spec §32). Mirrors `adsService.view()` and `serve()`.
 *
 * ── The rule this whole feature is built around ────────────────────────────────────────────────
 * Paid placement is **disclosed and additive**. Every served ad carries a `label` the client MUST
 * render, and the backend caps ads at a share of any feed so they can never bury organic results.
 * The renderers in this folder treat both as non-negotiable: there is no prop that hides the label.
 */
import type { Cents } from '@/types';

export type AdPlacementSurface = 'map_banner' | 'discovery_card' | 'earn_slot';

export type PlacementKind = 'featured_product' | 'featured_hub' | 'ad';

export type PlacementStatus = 'pending_payment' | 'active' | 'paused' | 'exhausted' | 'ended';

/** A campaign as its buyer sees it on the dashboard. */
export interface Placement {
  id: string;
  kind: PlacementKind;
  subjectId: string | null;
  placement: AdPlacementSurface | null;
  headline: string | null;
  budgetCents: Cents;
  spentCents: Cents;
  remainingCents: Cents;
  cpmCents: Cents;
  impressions: number;
  clicks: number;
  /** Server-computed so CTR means the same thing on every surface. */
  clickThroughRate: number;
  status: PlacementStatus;
  citySlug: string | null;
  startsAt: string;
  endsAt: string | null;
  tierDays: number | null;
  tierLabel: string | null;
  /** True until the charge settles — an unpaid row must never be presented as running. */
  awaitingPayment: boolean;
  label: string;
  spendLabel: string;
  /** What the buyer bought, in their words: a window for a tier, spend-of-budget for CPM. */
  deliveryLabel: string;
}

/** A newly created placement also hands back the secret needed to complete its charge. */
export interface CreatedPlacement extends Placement {
  clientSecret: string | null;
}

/** Server-published price list. Never hardcode these — a drifting price is a mischarge. */
export interface AdPricing {
  tiers: { days: number; label: string; priceCents: Cents; priceLabel: string }[];
  cpm: { placement: AdPlacementSurface; cpmCents: Cents; cpmLabel: string }[];
  /** Spec §32's "does not guarantee sales" sentence. Shown before every purchase. */
  disclosure: string;
  label: string;
  maxShareOfFeed: number;
}

/** One ad, as served to a surface. `label` is always present and always rendered. */
export interface ServedAd {
  placementId: string;
  headline: string;
  body: string | null;
  imageUrl: string | null;
  clickUrl: string | null;
  label: string;
}

export interface CreateCampaignInput {
  placement: AdPlacementSurface;
  headline: string;
  body?: string;
  imageUrl?: string;
  clickUrl?: string;
  /** Exactly one of these two — the API rejects both or neither. */
  tierDays?: number;
  budgetCents?: Cents;
  citySlug?: string;
  categories?: string[];
  businessId?: string;
}

export interface CreateFeaturedInput {
  kind: 'featured_product' | 'featured_hub';
  subjectId: string;
  citySlug?: string;
  tierDays?: number;
  budgetCents?: Cents;
}
