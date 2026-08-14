'use client';

/**
 * Scheduling data layer (docs/13 C-26/C-27/V-07, SCREEN_TO_API_MAPPING.md §3,§7). Availability,
 * create/reschedule/cancel bookings. Demo seeds slots + bookings so the flow completes offline.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoAvailability, demoBookings } from '@/lib/demo';

export interface Booking {
  id: string;
  businessId: string;
  businessName: string;
  service: string;
  startAt: string;
  status: 'confirmed' | 'proposed' | 'cancelled' | 'completed' | 'no_show';
  priceCents: number;
}

/** Raw booking row from the backend (schedulingService.view + name/price enrichment). */
interface RawBooking {
  id: string;
  customerId: string;
  businessId: string;
  serviceId: string;
  scheduledAt: string;
  durationMin: number;
  status: string; // server lifecycle: booked | cancelled | completed | no_show
  businessName?: string;
  serviceName?: string;
  customerName?: string;
  priceCents?: number;
}

/** Server 'booked' is the UI's 'confirmed' (bookings auto-confirm — there is no accept step). */
function mapBookingStatus(s: string): Booking['status'] {
  return s === 'booked' ? 'confirmed' : (s as Booking['status']);
}

function toBooking(r: RawBooking): Booking {
  return {
    id: r.id,
    businessId: r.businessId,
    businessName: r.businessName ?? 'Business',
    service: r.serviceName ?? 'Service',
    startAt: r.scheduledAt,
    status: mapBookingStatus(r.status),
    priceCents: r.priceCents ?? 0,
  };
}

/** A bookable service (backend GET /businesses/:id/services). */
export interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
}

export interface Slot {
  value: string; // ISO datetime — the backend's scheduledAt
  label: string; // human-friendly time
}

const DEMO_SERVICES: Service[] = [
  { id: 'svc_demo', name: 'Service appointment', durationMin: 30, priceCents: 6000 },
];

export function useServices(businessId: string) {
  return useQuery({
    queryKey: ['services', businessId],
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_SERVICES)
        : api.get<Service[]>(endpoints.business(businessId).services),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}

/** Backend returns ISO slot strings for a given service + date; map to display slots. */
export function useAvailability(businessId: string, serviceId?: string, date?: string) {
  return useQuery({
    queryKey: ['availability', businessId, serviceId, date],
    enabled: isMapDemo || Boolean(serviceId && date),
    queryFn: async (): Promise<Slot[]> => {
      if (isMapDemo) return demoAvailability();
      const res = await api.get<{ slots: string[] }>(endpoints.business(businessId).availability, {
        query: { serviceId: serviceId!, date: date! },
      });
      return res.slots.map((iso) => ({
        value: iso,
        label: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      }));
    },
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

export function useBookings() {
  return useQuery<Booking[]>({
    queryKey: keys.bookings,
    // The raw row uses scheduledAt/serviceName and status 'booked' — reading it as Booking
    // directly left every field undefined, so the list rendered empty rows. Map it.
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoBookings())
        : api.get<RawBooking[]>(endpoints.bookingsMine).then((rows) => rows.map(toBooking)),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function useBooking(id: string) {
  const qc = useQueryClient();
  return useQuery<Booking | undefined>({
    queryKey: keys.booking(id),
    // Cold loads (a notification deeplink, a refresh) used to resolve undefined — the cache was
    // the only source. Fall back to fetching the list and finding the booking there.
    queryFn: async () => {
      const fromList = qc.getQueryData<Booking[]>(keys.bookings)?.find((b) => b.id === id);
      if (fromList) return fromList;
      if (isMapDemo) return demoBookings().find((b) => b.id === id);
      const rows = await api.get<RawBooking[]>(endpoints.bookingsMine).then((r) => r.map(toBooking));
      qc.setQueryData(keys.bookings, rows);
      return rows.find((b) => b.id === id);
    },
    staleTime: 30_000,
  });
}

// ---- Vendor side (V-07): the business's bookings + lifecycle actions ----

export interface BusinessBooking {
  id: string;
  customerId: string;
  customerName: string;
  service: string;
  startAt: string;
  status: Booking['status'];
  priceCents: number;
}

const businessBookingsKey = (businessId: string) => ['business-bookings', businessId] as const;

const DEMO_BUSINESS_BOOKINGS: BusinessBooking[] = [
  {
    id: 'bk_demo_1',
    customerId: 'user_demo',
    customerName: 'Ada',
    service: 'Service appointment',
    startAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
    status: 'confirmed',
    priceCents: 6000,
  },
];

export function useBusinessBookings(businessId: string) {
  return useQuery<BusinessBooking[]>({
    queryKey: businessBookingsKey(businessId),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_BUSINESS_BOOKINGS)
        : api.get<RawBooking[]>(endpoints.business(businessId).bookings).then((rows) =>
            rows.map((r) => ({
              id: r.id,
              customerId: r.customerId,
              customerName: r.customerName ?? 'A customer',
              service: r.serviceName ?? 'Service',
              startAt: r.scheduledAt,
              status: mapBookingStatus(r.status),
              priceCents: r.priceCents ?? 0,
            })),
          ),
    staleTime: isMapDemo ? Infinity : 15_000,
    // New bookings arrive from customers on their own schedule — keep the worklist fresh.
    refetchInterval: isMapDemo ? false : 20_000,
  });
}

/** Complete / no-show / cancel a booking from the vendor worklist. */
export function useVendorBookingAction(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'complete' | 'no_show' | 'cancel' }) => {
      if (isMapDemo) return Promise.resolve();
      if (action === 'complete') return api.post(endpoints.bookingComplete(id));
      if (action === 'no_show') return api.post(endpoints.bookingNoShow(id));
      return api.del(endpoints.booking(id));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: businessBookingsKey(businessId) }),
  });
}

interface CreateBookingArgs {
  businessId: string;
  businessName: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string; // ISO datetime
  priceCents: number;
  idempotencyKey: string;
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CreateBookingArgs): Promise<Booking> => {
      const local: Booking = {
        id: `bk_${Date.now()}`,
        businessId: args.businessId,
        businessName: args.businessName,
        service: args.serviceName,
        startAt: args.scheduledAt,
        priceCents: args.priceCents,
        status: 'confirmed',
      };
      if (isMapDemo) return local;
      // Backend CreateBookingBody: { businessId, serviceId, scheduledAt }. Its response omits the
      // display fields (name/price), so merge the server id + scheduledAt into the local view.
      const res = await api.post<{ id: string; scheduledAt: string; status: string }>(
        endpoints.bookings,
        { businessId: args.businessId, serviceId: args.serviceId, scheduledAt: args.scheduledAt },
        { idempotencyKey: args.idempotencyKey },
      );
      return { ...local, id: res.id, startAt: res.scheduledAt ?? args.scheduledAt };
    },
    onSuccess: (booking) => {
      qc.setQueryData<Booking[]>(keys.bookings, (prev) => [booking, ...(prev ?? [])]);
      qc.setQueryData(keys.booking(booking.id), booking);
    },
  });
}

export function useCancelBooking(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => (isMapDemo ? Promise.resolve() : api.del(endpoints.booking(id))),
    onSuccess: () => {
      const patch = (b: Booking) => (b.id === id ? { ...b, status: 'cancelled' as const } : b);
      qc.setQueryData<Booking[]>(keys.bookings, (prev) => (prev ?? []).map(patch));
      qc.setQueryData<Booking | undefined>(keys.booking(id), (b) => (b ? patch(b) : b));
    },
    // A rejected cancel usually means the screen is out of date with the server (already cancelled
    // elsewhere, or the vendor cancelled first). Refetch so the user sees the real state instead of
    // a stale page with a button that keeps failing.
    onError: () => {
      void qc.invalidateQueries({ queryKey: keys.bookings });
      void qc.invalidateQueries({ queryKey: keys.booking(id) });
    },
  });
}
