/**
 * Postcard Marketing — wire types (ADR-007).
 *
 * Mirrors the backend's response shapes. Two properties are worth noticing because they are load
 * bearing rather than incidental:
 *
 *  • **`isBinding` does not exist here, and `isExpired` does.** The print vendor publishes prices
 *    but does not reserve them, so every quote is a snapshot that goes stale. The UI has to be able
 *    to say so rather than quietly showing an old number (audit F-8).
 *  • **an audience is a count, never a list.** `containsRecipientData` is sent by the server on
 *    every audience and is always `false`; it exists so this claim is visible in the payload rather
 *    than being something you have to know (ADR-007 §6).
 */

export type MailClass = 'standard' | 'first_class';

export interface PostcardProduct {
  sku: string;
  label: string;
  /** Sides the BUYER designs. Always 1 — a mailed card still prints two sides. */
  designedSides: 1;
  trim: string;
  widthIn: number;
  heightIn: number;
  mailClasses: MailClass[];
  minQuantity: number;
  maxQuantity: number;
}

/** The exact requirements a designer needs, plus a link to the vendor's own templates. */
export interface ArtworkSpec {
  sku: string;
  label: string;
  designedSides: 1;
  trimWidthIn: number;
  trimHeightIn: number;
  fullWidthIn: number;
  fullHeightIn: number;
  bleedIn: number;
  safeAreaIn: number;
  targetDpi: number;
  minDpi: number;
  recommendedWidthPx: number;
  recommendedHeightPx: number;
  minimumWidthPx: number;
  minimumHeightPx: number;
  acceptedFormats: string[];
  templatesUrl: string;
}

export type AudienceSelectionType = 'zip' | 'carrier_route' | 'radius';

export interface AudienceRadius {
  miles: number;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface PostcardAudience {
  id: string;
  selectionType: AudienceSelectionType;
  selectionKeys: string[];
  radius: AudienceRadius | null;
  listType: string;
  /** Deliverable addresses, per the vendor. Never computed here. */
  recordCount: number;
  breakdown: { code: string; label: string; total: number }[];
  resolvedAt: string;
  /** Always false. Present so the privacy property is visible, not assumed. */
  containsRecipientData: false;
}

export interface ListType {
  key: string;
  label: string;
}

export type PrepressStatus = 'awaiting_upload' | 'passed' | 'failed';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface PrepressFinding {
  code: string;
  message: string;
}

export interface PostcardAsset {
  id: string;
  prepressStatus: PrepressStatus;
  moderationStatus: ModerationStatus;
  format: string | null;
  widthPx: number | null;
  heightPx: number | null;
  /** Resolution at PRINTED size — the number that decides whether it looks good. */
  effectiveDpi: number | null;
  colorSpace: string | null;
  sizeBytes: number | null;
  errors: PrepressFinding[];
  warnings: PrepressFinding[];
  validatedSku: string | null;
  moderationReason: string | null;
}

export type PostcardOrderStatus =
  | 'draft'
  | 'quoted'
  | 'paid'
  | 'payment_failed'
  | 'submitted'
  | 'submission_failed'
  | 'refunded'
  | 'cancelled';

/** The physical run's progress. Deliberately separate from order status; stops at `mailed`. */
export type FulfilmentStage = 'preparing' | 'printing' | 'mailed';

export interface PostcardOrder {
  id: string;
  businessId: string;
  status: PostcardOrderStatus;
  sku: string;
  mailClass: MailClass;
  audienceId: string | null;
  assetId: string | null;
  quantity: number | null;
  price: {
    vendorUnitCostCents: number;
    vendorCostCents: number;
    marginCents: number;
    totalCents: number;
    quotedAt: string | null;
    expiresAt: string | null;
    /** A stale quote must be re-priced before payment, never silently honoured. */
    isExpired: boolean;
  } | null;
  payment: {
    taxCents: number;
    chargedCents: number;
    paidAt: string | null;
    failureReason: string | null;
    refundedAt: string | null;
    refundReason: string | null;
  } | null;
  fulfilment: {
    stage: FulfilmentStage | null;
    stageAt: string | null;
    label: string;
    description: string;
    vendorOrderId: string | null;
    submittedAt: string | null;
  } | null;
  submissionProblem: { message: string | null; attempts: number } | null;
  mailDate: string | null;
  cancelledReason: string | null;
  createdAt: string | null;
}

export interface CreateAudienceInput {
  type: AudienceSelectionType;
  listType: string;
  keys?: string[];
  radius?: AudienceRadius;
}

export interface ConfigureOrderInput {
  audienceId?: string;
  assetId?: string;
  quantity?: number;
  mailDate?: string;
}

export interface CheckoutResult {
  orderId: string;
  clientSecret: string;
  chargedCents: number;
}

/** Reviewer-facing. Carries the screening flags the buyer never sees. */
export interface ModerationQueueItem extends PostcardAsset {
  businessId: string;
  screeningFlags: string[];
  uploadedAt: string | null;
}
