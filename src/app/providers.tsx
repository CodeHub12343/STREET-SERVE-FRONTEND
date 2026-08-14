'use client';

/**
 * The single client provider tree (NEXTJS_ARCHITECTURE.md §4), mounted once by the root layout.
 * Order (outer → inner): Clerk → styled-components registry → theme → Query → auth-bridge →
 * socket → toast. ClerkProvider is included only when configured so the shell boots without keys.
 */
import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { StyledComponentsRegistry } from '@/lib/registry';
import { ThemeModeProvider } from '@/lib/theme/ThemeModeProvider';
import { QueryProvider } from '@/lib/query/QueryProvider';
import { AuthTokenBridge } from '@/lib/auth/AuthTokenBridge';
import { SocketProvider } from '@/lib/socket/SocketProvider';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { env, isAuthConfigured } from '@/lib/env';

function Inner({ children }: { children: ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeModeProvider>
        <QueryProvider>
          <AuthTokenBridge>
            <SocketProvider>
              <ToastProvider>
                <OfflineBanner />
                {children}
                <InstallPrompt />
              </ToastProvider>
            </SocketProvider>
          </AuthTokenBridge>
        </QueryProvider>
      </ThemeModeProvider>
    </StyledComponentsRegistry>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) {
    // Dev/boot without Clerk keys — everything else still works; auth is inert.
    return <Inner>{children}</Inner>;
  }
  // isAuthConfigured guarantees the key is present here.
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey as string}>
      <Inner>{children}</Inner>
    </ClerkProvider>
  );
}
