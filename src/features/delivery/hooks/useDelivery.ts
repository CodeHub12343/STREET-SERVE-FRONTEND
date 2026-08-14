'use client';

/**
 * Delivery data layer (ADR-004).
 *
 * Note what is absent: there is no `useDeclineOffer`. Declining is free and leaves no trace, so
 * there is nothing to send — a driver simply does not accept, and the offer expires. A "decline"
 * endpoint would be the first step toward counting declines, which ADR-004 prohibits.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type {
  ApplyToDriveInput,
  Delivery,
  DeliveryOffer,
  DriverEligibility,
  DriverProfile,
  RequestDeliveryInput,
} from '../types';

const DEMO_PROFILE: DriverProfile = {
  userId: 'u_demo',
  vehicleType: 'bicycle',
  vehicleDescription: 'Blue hybrid',
  status: 'approved',
  backgroundCheckStatus: 'passed',
  insuranceExpiresAt: new Date(Date.now() + 200 * 86_400_000).toISOString(),
  licenceExpiresAt: new Date(Date.now() + 300 * 86_400_000).toISOString(),
  suspendedReason: null,
  emergencyContactName: 'Sam',
};

const DEMO_OFFERS: DeliveryOffer[] = [
  {
    deliveryId: 'dl_demo',
    payoutCents: 800,
    pickup: { lng: -122.42, lat: 37.77 },
    dropOffArea: { lng: -122.43, lat: 37.78, city: 'San Francisco' },
    expiresAt: new Date(Date.now() + 80_000).toISOString(),
  },
];

export function useDriverProfile() {
  return useQuery<DriverProfile | null>({
    queryKey: keys.driverProfile,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_PROFILE) : api.get<DriverProfile | null>(endpoints.drivers.me),
    staleTime: 60_000,
  });
}

export function useDriverEligibility() {
  return useQuery<DriverEligibility>({
    queryKey: keys.driverEligibility,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ eligible: true, reasons: [] })
        : api.get<DriverEligibility>(endpoints.drivers.eligibility),
    staleTime: 30_000,
  });
}

export function useApplyToDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyToDriveInput) =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_PROFILE, ...input, status: 'pending' as const })
        : api.post<DriverProfile>(endpoints.drivers.apply, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.driverProfile });
      void qc.invalidateQueries({ queryKey: keys.driverEligibility });
    },
  });
}

/** Re-attest after a lapse. Only a DATE suspension lifts itself — the server decides, not this. */
export function useRenewAttestation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { licenceExpiresAt: string; insuranceExpiresAt: string }) =>
      isMapDemo
        ? Promise.resolve(DEMO_PROFILE)
        : api.post<DriverProfile>(endpoints.drivers.attestation, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.driverProfile });
      void qc.invalidateQueries({ queryKey: keys.driverEligibility });
    },
  });
}

/**
 * Live offers. Polled rather than pushed for now: the realtime `/delivery` namespace exists
 * server-side, and wiring the socket is a separate change with its own reconnect semantics. A short
 * interval is honest in the meantime — an offer that appears 10s late is still worth taking, where
 * one that never appears is not.
 */
export function useDeliveryOffers(enabled = true) {
  return useQuery<DeliveryOffer[]>({
    queryKey: keys.deliveryOffers,
    enabled,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_OFFERS) : api.get<DeliveryOffer[]>(endpoints.deliveries.offers),
    refetchInterval: 10_000,
    staleTime: 0,
  });
}

export function useDelivery(deliveryId: string | undefined, opts: { poll?: boolean } = {}) {
  return useQuery<Delivery | null>({
    queryKey: keys.delivery(deliveryId ?? 'none'),
    enabled: Boolean(deliveryId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(null)
        : api.get<Delivery>(endpoints.deliveries.byId(deliveryId!).root),
    refetchInterval: opts.poll ? 8_000 : false,
    staleTime: 0,
  });
}

function useDeliveryAction<TArgs = void>(
  deliveryId: string,
  path: (id: string) => string,
  body?: (args: TArgs) => unknown,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) =>
      isMapDemo
        ? Promise.resolve({ ok: true })
        : api.post<unknown>(path(deliveryId), body ? body(args) : {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.delivery(deliveryId) });
      void qc.invalidateQueries({ queryKey: keys.deliveryOffers });
    },
  });
}

export function useAcceptDelivery(deliveryId: string) {
  return useDeliveryAction(deliveryId, (id) => endpoints.deliveries.byId(id).accept);
}
export function useMarkPickedUp(deliveryId: string) {
  return useDeliveryAction(deliveryId, (id) => endpoints.deliveries.byId(id).pickUp);
}
export function useCompleteDelivery(deliveryId: string) {
  return useDeliveryAction<string>(
    deliveryId,
    (id) => endpoints.deliveries.byId(id).complete,
    (code) => ({ code }),
  );
}
export function useMarkUndeliverable(deliveryId: string) {
  return useDeliveryAction<string>(
    deliveryId,
    (id) => endpoints.deliveries.byId(id).undeliverable,
    (reason) => ({ reason }),
  );
}
export function useCancelDelivery(deliveryId: string) {
  return useDeliveryAction<string | undefined>(
    deliveryId,
    (id) => endpoints.deliveries.byId(id).cancel,
    (reason) => ({ reason }),
  );
}
export function useReportIncident(deliveryId: string) {
  return useDeliveryAction<{ kind: string; detail?: string }>(
    deliveryId,
    (id) => endpoints.deliveries.byId(id).incidents,
    (input) => input,
  );
}

/**
 * Push the driver's position while a delivery is live.
 *
 * The server applies its own interval ceiling and drops anything inside it, so this is fire-and-
 * forget by design: a rejected ping is not an error the driver should ever see, and surfacing one
 * would put a red toast on somebody's phone while they are cycling.
 */
export function useReportPosition(deliveryId: string) {
  return useMutation({
    mutationFn: (pos: { lng: number; lat: number }) =>
      isMapDemo
        ? Promise.resolve({ accepted: true })
        : api.post<{ accepted: boolean }>(endpoints.deliveries.byId(deliveryId).position, pos),
  });
}

/** Vendor: ask for a driver on an order they have already accepted. */
export function useRequestDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestDeliveryInput): Promise<{ id: string }> =>
      isMapDemo
        ? Promise.resolve({ id: 'dl_demo' })
        : api.post<Delivery>(endpoints.deliveries.root, input),
    onSuccess: (d) => {
      if (d.id) void qc.invalidateQueries({ queryKey: keys.delivery(d.id) });
    },
  });
}
