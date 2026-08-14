import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { ActionRow } from '@/features/business/components/ActionRow';

/**
 * The Message button on a business profile must open the conversation WITH THAT BUSINESS.
 *
 * Regression: it pushed a bare '/messages', which threw the business away and dropped the user in
 * an inbox whose empty state told them to "message a business from its profile" — the exact thing
 * they had just done.
 */

const push = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
const show = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/feedback/ToastProvider', () => ({ useToast: () => ({ show }) }));
vi.mock('@/lib/env', () => ({ isMapDemo: false, isAuthConfigured: false }));
vi.mock('@/lib/api/client', () => ({
  api: { post, get: vi.fn().mockResolvedValue([]), del: vi.fn(), patch: vi.fn() },
}));

function Providers({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

const BIZ = 'biz_santiago_hub';

beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({ id: 'th_777' });
});

describe('messaging a business from its profile', () => {
  it('opens the thread with that business, never the bare inbox', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <ActionRow businessId={BIZ} following={false} />
      </Providers>,
    );

    await user.click(screen.getByRole('button', { name: 'Message' }));

    // The thread is opened for THIS business...
    await waitFor(() => expect(post).toHaveBeenCalledWith('/message-threads', { businessId: BIZ }));
    // ...and we land in that conversation, not the inbox.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/messages/th_777'));
    expect(push).not.toHaveBeenCalledWith('/messages');
  });

  it('reports a failure instead of navigating nowhere', async () => {
    const user = userEvent.setup();
    post.mockRejectedValue(new Error('boom'));
    render(
      <Providers>
        <ActionRow businessId={BIZ} following={false} />
      </Providers>,
    );

    await user.click(screen.getByRole('button', { name: 'Message' }));

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith('Couldn’t open the conversation. Please try again.', 'danger'),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('does not fire a second request while the first is in flight', async () => {
    const user = userEvent.setup();
    let resolve: (v: { id: string }) => void = () => {};
    post.mockReturnValue(new Promise((r) => (resolve = r)));
    render(
      <Providers>
        <ActionRow businessId={BIZ} following={false} />
      </Providers>,
    );

    const button = screen.getByRole('button', { name: 'Message' });
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    await user.click(button);

    expect(post).toHaveBeenCalledTimes(1);
    resolve({ id: 'th_777' });
  });
});
