'use client';

/**
 * Weekly booking-hours data layer. The backend computes bookable slots ONLY from these windows
 * (PUT /businesses/:id/availability) — with none configured, every date on the customer's booking
 * flow says "No open times". This hook + the BookingHours editor are the missing write path.
 * Times are minutes-from-midnight UTC (the backend's pilot simplification).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  startMin: number;
  endMin: number;
}

const windowsKey = (businessId: string) => ['availability-windows', businessId] as const;

export function useAvailabilityWindows(businessId: string) {
  return useQuery({
    queryKey: windowsKey(businessId),
    enabled: Boolean(businessId),
    queryFn: async (): Promise<AvailabilityWindow[]> => {
      if (isMapDemo) {
        // Weekdays 9:00–17:00 so the demo editor isn't empty.
        return [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startMin: 540, endMin: 1020 }));
      }
      const res = await api.get<{ windows: AvailabilityWindow[] }>(
        endpoints.business(businessId).availabilityWindows,
      );
      return res.windows;
    },
    staleTime: 60_000,
  });
}

export function useSetAvailabilityWindows(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (windows: AvailabilityWindow[]) =>
      isMapDemo
        ? Promise.resolve({ windows: windows.length })
        : api.put(endpoints.business(businessId).availability, { windows }),
    onSuccess: (_r, windows) => {
      qc.setQueryData(windowsKey(businessId), windows);
      // Customers' slot queries are keyed ['availability', businessId, ...] — drop them so the
      // booking flow reflects the new hours immediately.
      void qc.invalidateQueries({ queryKey: ['availability', businessId] });
    },
  });
}
