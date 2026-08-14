'use client';

/**
 * Provides the TanStack Query client. The client is created lazily in state so it is stable
 * across renders and unique per browser session (STATE_MANAGEMENT.md §2).
 */
import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from './queryClient';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
