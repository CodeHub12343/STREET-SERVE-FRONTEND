'use client';

/**
 * Root error boundary (App Router convention). Human-readable message + Retry, in the shell's
 * language (NEXTJS_ARCHITECTURE.md §7).
 */
import { useEffect } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(observability): forward to the error pipeline (LOGGING_AND_MONITORING).
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: '60dvh', display: 'grid', placeItems: 'center' }}>
      <ErrorState
        title="This didn't load"
        message="An unexpected error occurred. You can retry."
        onRetry={reset}
      />
    </div>
  );
}
