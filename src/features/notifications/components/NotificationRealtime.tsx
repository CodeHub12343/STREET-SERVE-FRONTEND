'use client';

/**
 * Mounts the notification socket for the whole app.
 *
 * Deliberately a provider-level component rather than a call inside NotificationBell: the bell is
 * absent from focused flows (checkout, onboarding, the wave screens), and a notification arriving
 * while a seller is mid-checkout is exactly the one that matters. Attaching the connection to a
 * component that comes and goes would also reconnect the socket on every navigation that mounts or
 * unmounts it.
 *
 * Renders nothing — it exists only to own the subscription's lifetime.
 */
import { useNotificationSocket } from '../hooks/useNotificationSocket';

export function NotificationRealtime(): null {
  useNotificationSocket();
  return null;
}
