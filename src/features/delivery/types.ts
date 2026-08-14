import type { Cents } from '@/types';

/**
 * Delivery Assist Network (ADR-004).
 *
 * Two shapes in this file exist because of a decision rather than a data need, and both are worth
 * knowing before changing anything here:
 *
 *  • **There is no acceptance rate, decline count, or driver score.** ADR-004 prohibits
 *    acceptance-rate pressure; the surest way to reintroduce a prohibited mechanic is to start
 *    displaying the number that would drive it. Nothing on `DriverProfile` counts declines because
 *    nothing on the server does.
 *  • **A destination is one of two different shapes**, depending on who is asking and when — a
 *    coarse area before a driver accepts, the exact address after. That is a privacy rule (A-15),
 *    so it is modelled as a union rather than as optional fields nobody remembers to check.
 */

export type DriverStatus = 'pending' | 'approved' | 'suspended';
export type BackgroundCheckStatus = 'pending' | 'passed' | 'failed';
export type VehicleType = 'bicycle' | 'scooter' | 'motorcycle' | 'car' | 'van';

export interface DriverProfile {
  userId: string;
  vehicleType: VehicleType;
  vehicleDescription: string | null;
  status: DriverStatus;
  backgroundCheckStatus: BackgroundCheckStatus;
  /**
   * The date the DRIVER told us their cover runs out. The platform records it; it does not verify
   * the policy and never tells the driver they are covered (CR-3).
   */
  insuranceExpiresAt: string | null;
  licenceExpiresAt: string | null;
  suspendedReason: string | null;
  emergencyContactName: string | null;
}

/** Every reason a driver cannot take work right now — all of them, not just the first. */
export interface DriverEligibility {
  eligible: boolean;
  reasons: string[];
}

export interface DeliveryOffer {
  deliveryId: string;
  payoutCents: Cents;
  pickup: { lng: number; lat: number };
  /** A-15 — an approximate area, never the address, until the offer is accepted. */
  dropOffArea: { lng: number; lat: number; city: string };
  expiresAt: string;
}

export type DeliveryStatus =
  | 'broadcasting'
  | 'accepted'
  | 'picked_up'
  | 'delivered'
  | 'expired'
  | 'cancelled'
  | 'undeliverable';

/** Coarse: what a driver sees before accepting, and what anyone sees once it is over. */
export interface CoarseDestination {
  city: string;
  lng: number;
  lat: number;
  line1?: undefined;
}

/** Exact: the customer, the vendor, and the accepted driver while the delivery is live. */
export interface ExactDestination {
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string | null;
  lng: number;
  lat: number;
  notes: string | null;
  contactPhone: string | null;
}

export interface Delivery {
  id: string;
  orderId: string;
  status: DeliveryStatus;
  pickup: { lng: number; lat: number };
  destination: CoarseDestination | ExactDestination;
  payoutCents: Cents;
  coordinationFeeCents: Cents;
  customerTotalCents: Cents;
  /** Customer only — they are the one who reads it out at the door. */
  proofCode?: string;
  /** Customer only — A-14, so somebody else can watch the trip. */
  shareToken?: string;
  expiresAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  endedReason: string | null;
}

/** Narrowing helper — the union exists to force this check rather than allow an optional-field peek. */
export function hasExactAddress(
  d: CoarseDestination | ExactDestination,
): d is ExactDestination {
  return typeof (d as ExactDestination).line1 === 'string';
}

export interface ApplyToDriveInput {
  vehicleType: VehicleType;
  vehicleDescription?: string;
  licenceExpiresAt: string;
  insuranceExpiresAt: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface RequestDeliveryInput {
  orderId: string;
  /** The VENDOR names this, and the driver sees it before accepting (ADR-004 §2). */
  driverPayoutCents: Cents;
}
