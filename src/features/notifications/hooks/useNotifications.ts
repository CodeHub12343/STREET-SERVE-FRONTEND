'use client';

/**
 * Notifications data layer (REALTIME_IMPLEMENTATION.md §7, GAP-3). The inbox powers both the bell
 * and reconnect catch-up; live events arrive on the /notifications socket in production. Per-category
 * preferences are read/written here; safety-critical categories are un-mutable. Demo mode seeds the
 * inbox so the center + bell work offline. (Web Push subscription itself lands in Milestone 9, GAP-4.)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { NOTIFICATION_CATEGORIES, demoNotifications, type DemoNotification, type NotificationCategory } from '@/lib/demo';

export type AppNotification = DemoNotification;
export type { NotificationCategory };

/**
 * Raw GET /notifications row (notifications.service `shape`). The wire shape is NOT the UI shape:
 * it carries `createdAt` (not `at`), a richer `category` vocabulary (`wave_down`, `popup_delay`,
 * `booking`…), and a `data` bag — but no `deeplink`. Left unmapped, the center showed "NaN min ago"
 * (undefined `at`) and every row was inert (undefined `deeplink`).
 */
interface RawNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

/** Map the backend category vocabulary onto the seven the center has icons for. */
function toUiCategory(raw: string): AppNotification['category'] {
  switch (raw) {
    case 'wave_down':
    case 'popup_delay':
      return 'wave';
    case 'order':
    case 'booking':
    case 'consignment':
    case 'rto':
      return 'order';
    case 'payout':
    case 'payments':
    case 'spot_me':
      return 'payout';
    case 'dispute':
      return 'dispute';
    case 'verification':
      return 'verification';
    case 'message':
      return 'message';
    default:
      return 'system';
  }
}

/**
 * Where tapping a notification should land. Routes live in the client, so the mapping does too; the
 * one thing the client can't infer — whether a shared-category event (wave_down, order, booking) is
 * for the vendor or the customer — the server tags as `data.audience`.
 */
function toDeeplink(raw: string, data?: Record<string, unknown> | null): string | undefined {
  const d = (data ?? {}) as Record<string, unknown>;
  const forVendor = d.audience === 'vendor';
  const id = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : undefined);
  switch (raw) {
    case 'message':
      return id('threadId') ? `/messages/${id('threadId')}` : '/messages';
    case 'wave_down':
      return forVendor ? '/vendor/wave-downs' : id('waveDownId') ? `/wave/${id('waveDownId')}` : undefined;
    case 'popup_delay':
      return id('waveDownId') ? `/wave/${id('waveDownId')}` : undefined;
    case 'order':
      return forVendor ? '/vendor/orders' : '/orders';
    case 'booking':
      // The customer's landing is the booking detail — there is no /booking list page.
      return forVendor ? '/vendor/bookings' : id('bookingId') ? `/booking/${id('bookingId')}` : '/profile';
    case 'consignment': {
      // Hub-owner vs seller: the server tags `audience`; older rows are untagged, so fall back to
      // the data shape (only hub-facing consignment events carry `hubId`).
      const hubFacing = d.audience === 'hub' || (d.audience === undefined && id('hubId'));
      if (hubFacing) return d.auto === true ? '/hub/products' : '/hub/approvals';
      return '/seller/inventory';
    }
    case 'payments': {
      // Land on the recipient's central money screen. Hub vs seller comes from the audience tag;
      // for older untagged rows, the presence of a hub-share amount marks a hub-facing event.
      const hubFacing = d.audience === 'hub' || (d.audience === undefined && d.hubShareCents !== undefined);
      return hubFacing ? '/hub/settlements' : '/seller/balance';
    }
    case 'rto':
      return id('agreementId') ? `/rto/${id('agreementId')}` : undefined;
    case 'job':
      return '/seller/jobs';
    case 'spot_me':
      return '/profile/wallet';
    case 'proximity':
    case 'follow_status':
    case 'block_party':
      // "A followed vendor/business is nearby/active" or "Block Party nearby" — send them to the map.
      return '/map';
    case 'dispute':
      // Currently only the overdue-consignment-return alert (seller-facing) uses this category.
      return '/seller/inventory';
    case 'license':
      return '/vendor/license';
    case 'payout':
      return '/profile/wallet';
    case 'verification':
      return '/profile/verification';
    default:
      return undefined;
  }
}

function toNotification(r: RawNotification): AppNotification {
  return {
    id: r.id,
    category: toUiCategory(r.category),
    title: r.title,
    body: r.body,
    at: r.createdAt,
    read: r.read,
    deeplink: toDeeplink(r.category, r.data),
  };
}

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: keys.notifications,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoNotifications())
        : api.get<RawNotification[]>(endpoints.notifications).then((rows) => rows.map(toNotification)),
    staleTime: isMapDemo ? Infinity : 20_000,
    /**
     * Safety net under the socket, not a replacement for it.
     *
     * A WebSocket is the first thing a captive portal, a corporate proxy or an aggressive mobile
     * network drops, and a phone kills it on screen-lock. When that happens the inbox must still
     * advance on its own rather than sit frozen until the user reloads — which is precisely the
     * failure being fixed here, and it should not be able to come back silently.
     *
     * React Query pauses intervals for a hidden document by default, so a backgrounded PWA is not
     * polling in the user's pocket; the socket's reconnect refetch covers the return to foreground.
     */
    refetchInterval: isMapDemo ? false : 60_000,
  });
}

/** Exported for unit tests — the pure category + deeplink derivation. */
export const __notificationMap = { toUiCategory, toDeeplink };

export function useUnreadCount(): number {
  const { data } = useNotifications();
  return (data ?? []).filter((n) => !n.read).length;
}

export function useMarkRead() {
  const qc = useQueryClient();

  /** Snapshot before an optimistic write, so a failed request can put the badge back honestly. */
  const snapshot = () => qc.getQueryData<AppNotification[]>(keys.notifications);

  const writeOne = (id: string) =>
    qc.setQueryData<AppNotification[]>(keys.notifications, (prev) =>
      (prev ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

  const one = useMutation({
    mutationFn: (id: string) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.notificationRead(id)),
    onMutate: (id) => {
      const previous = snapshot();
      writeOne(id);
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.notifications, ctx.previous);
    },
    // The server owns `read`; re-read it rather than trusting the optimistic write to have stuck.
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.notifications }),
  });

  const all = useMutation({
    /**
     * This used to be `() => Promise.resolve()` — "mark all as read" edited the local cache and
     * called nothing. The endpoint existed on both sides the whole time (`notificationsReadAll`,
     * and POST /me/notifications/read-all server-side); it was simply never wired.
     *
     * So the badge cleared and then came back on the next reload, because the server had never been
     * told. Now that the inbox also refetches on a timer and on socket reconnect, the same bug
     * would undo the badge within a minute without any reload at all.
     */
    mutationFn: () => (isMapDemo ? Promise.resolve() : api.post(endpoints.notificationsReadAll)),
    onMutate: () => {
      const previous = snapshot();
      qc.setQueryData<AppNotification[]>(keys.notifications, (prev) =>
        (prev ?? []).map((n) => ({ ...n, read: true })),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.notifications, ctx.previous);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.notifications }),
  });

  return { one, all };
}

// ---- Per-category preferences (C-37) ----
export function useNotificationPrefs() {
  const qc = useQueryClient();
  /**
   * Previously the queryFn short-circuited on its own cache with `staleTime: Infinity`, so the
   * real preferences were fetched at most once and never re-read — which hid the fact that the
   * endpoint did not exist at all.
   */
  const prefs = useQuery<Record<string, boolean>>({
    queryKey: keys.notificationPrefs,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.key, true])))
        : api.get<Record<string, boolean>>(endpoints.notificationPreferences),
    staleTime: 60_000,
  });

  const update = useMutation({
    mutationFn: (patch: Record<string, boolean>) =>
      isMapDemo
        ? Promise.resolve(null)
        : api.patch<Record<string, boolean>>(endpoints.notificationPreferences, patch),
    // Optimistic, so the switch reacts instantly…
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: keys.notificationPrefs });
      const previous = qc.getQueryData<Record<string, boolean>>(keys.notificationPrefs);
      qc.setQueryData<Record<string, boolean>>(keys.notificationPrefs, (prev) => ({
        ...(prev ?? {}),
        ...patch,
      }));
      return { previous };
    },
    // …but a failed write MUST snap back. Without this the switch kept the user's position while
    // the server never changed, so someone who muted a category still received it — the worst kind
    // of settings bug, because the UI is the only evidence the user has.
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.notificationPrefs, ctx.previous);
    },
    // Trust the server's echo of the resulting state over the optimistic guess.
    onSuccess: (data) => {
      if (data) qc.setQueryData(keys.notificationPrefs, data);
    },
  });

  return {
    prefs: prefs.data ?? {},
    isLoading: prefs.isLoading,
    isError: prefs.isError,
    update,
    categories: NOTIFICATION_CATEGORIES,
  };
}
