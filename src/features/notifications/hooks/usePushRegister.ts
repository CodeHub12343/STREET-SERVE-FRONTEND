'use client';

/**
 * Web Push registration (PWA_IMPLEMENTATION.md §6, GAP-4). Requests permission, subscribes via the
 * service worker's PushManager with the VAPID key, and registers the token
 * (POST /users/me/push-tokens). Degrades gracefully: without a VAPID key or service worker it just
 * requests OS permission. Safe to call from Settings or the onboarding primer.
 */
import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { env, isPushConfigured } from '@/lib/env';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushState = 'idle' | 'requesting' | 'subscribed' | 'denied' | 'unsupported';

export function usePushRegister() {
  const [state, setState] = useState<PushState>('idle');

  const enable = async () => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }
    setState('requesting');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setState('denied');
      return;
    }
    try {
      if (isPushConfigured && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey!) as BufferSource,
        });
        await api.post(endpoints.pushTokens, { subscription: sub.toJSON(), platform: 'web' });
      }
      setState('subscribed');
    } catch {
      // Permission granted but subscription failed (no VAPID / SW) — still "on" for OS-level alerts.
      setState('subscribed');
    }
  };

  return { state, enable };
}
