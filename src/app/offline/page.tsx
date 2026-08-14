'use client';

/**
 * Offline fallback for document navigations (PWA_IMPLEMENTATION.md §4: "actions that require the
 * network are disabled with explanation, not silent failures").
 *
 * Without this, a navigation that misses the runtime cache left the service worker with nothing to
 * return, and Serwist rejected the FetchEvent outright:
 *
 *     The FetchEvent for "/onboarding/profile" resulted in a network error response
 *     Uncaught (in promise) no-response :: [{"url": ".../onboarding/profile"}]
 *
 * The browser renders its own dead-end error page for that, which is exactly the silent failure the
 * spec rules out. This page is precached, so it is always available to serve instead.
 *
 * A client component on purpose: the retry has to re-check connectivity at the moment it is pressed.
 */
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/primitives/Button';

export default function Offline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return (
    <div style={{ minHeight: '70dvh', display: 'grid', placeItems: 'center' }}>
      <EmptyState
        icon="📡"
        title={online ? "That page didn't load" : "You're offline"}
        description={
          online
            ? 'The connection dropped while loading this page. Your work has not been sent.'
            : 'This page needs a connection. Anything you had typed is still here once you reconnect.'
        }
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            {online ? 'Try again' : 'Retry when connected'}
          </Button>
        }
      />
    </div>
  );
}
