import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import {
  NotificationToaster,
  priorityOf,
  useNotificationToast,
  type IncomingNotification,
} from './NotificationToaster';

/**
 * The real-time toast layer.
 *
 * These assertions are about a system that interrupts people, so they are behavioural rather than
 * cosmetic: what gets shown, what gets suppressed, what refuses to disappear on its own, and what a
 * screen reader is told.
 */
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

/** Audio is meaningless in jsdom and WebAudio is absent — the toast must not depend on it. */
vi.mock('./notificationSound', () => ({
  playNotificationSound: vi.fn(),
  isNotificationSoundEnabled: () => true,
  setNotificationSoundEnabled: vi.fn(),
}));

/** Drives the provider from outside, the way the socket does. */
let fire: (n: IncomingNotification) => void = () => undefined;
function Harness() {
  const { notify } = useNotificationToast();
  fire = notify;
  return null;
}

function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

function mount() {
  return render(
    <Providers>
      <NotificationToaster>
        <Harness />
      </NotificationToaster>
    </Providers>,
  );
}

const NOTIFICATION: IncomingNotification = {
  category: 'order',
  title: 'Payment received',
  body: '$125.00 paid — your $74.75 is waiting on a payout account.',
  deeplink: '/orders/o1',
};

beforeEach(() => {
  push.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => vi.useRealTimers());

describe('notification toast — arrival', () => {
  it('shows an incoming notification without the user having to be on the inbox', async () => {
    mount();
    act(() => fire(NOTIFICATION));

    expect(await screen.findByText('Payment received')).toBeInTheDocument();
  });

  it('takes the user to the notification’s screen when tapped', async () => {
    mount();
    act(() => fire(NOTIFICATION));
    await userEvent.click(await screen.findByText('Payment received'));

    expect(push).toHaveBeenCalledWith('/orders/o1');
  });

  it('auto-dismisses an ordinary notification', async () => {
    mount();
    act(() => fire(NOTIFICATION));
    expect(await screen.findByText('Payment received')).toBeInTheDocument();

    // Past the informational duration, plus the exit animation.
    act(() => void vi.advanceTimersByTime(6000));
    await waitFor(() => expect(screen.queryByText('Payment received')).not.toBeInTheDocument());
  });
});

describe('notification toast — urgency', () => {
  /**
   * Priority is derived centrally rather than chosen by callers. A caller that can pick its own
   * urgency eventually makes everything urgent, and a system where everything is urgent has none.
   */
  it('derives urgency from the category', () => {
    expect(priorityOf('dispute')).toBe('critical');
    expect(priorityOf('payout')).toBe('important');
    expect(priorityOf('verification')).toBe('important');
    expect(priorityOf('order')).toBe('informational');
    expect(priorityOf('message')).toBe('informational');
  });

  /**
   * A fraud alert that vanished while the phone was face down has told nobody anything. Critical
   * notifications wait to be dealt with.
   */
  it('never auto-dismisses a critical notification', async () => {
    mount();
    act(() => fire({ category: 'dispute', title: 'Chargeback opened', body: 'Respond by Friday.' }));
    expect(await screen.findByText('Chargeback opened')).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(30_000));
    expect(screen.getByText('Chargeback opened')).toBeInTheDocument();
  });

  /** Urgency must survive greyscale and colour-blindness, so it is stated in words too. */
  it('labels a critical notification in text, not colour alone', async () => {
    mount();
    act(() => fire({ category: 'dispute', title: 'Chargeback opened', body: 'Respond by Friday.' }));

    expect(await screen.findByText('Urgent')).toBeInTheDocument();
  });

  /** Assertive interrupts a screen-reader mid-sentence — right for fraud, rude for a receipt. */
  it('only interrupts a screen reader for something critical', async () => {
    const { rerender } = mount();
    act(() => fire(NOTIFICATION));
    await screen.findByText('Payment received');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');

    rerender(
      <Providers>
        <NotificationToaster>
          <Harness />
        </NotificationToaster>
      </Providers>,
    );
    act(() => fire({ category: 'dispute', title: 'Fraud alert', body: 'Unusual activity.' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive'),
    );
  });
});

describe('notification toast — several at once', () => {
  /** Retries and multi-device fan-out deliver the same thing twice; showing it twice looks broken. */
  it('suppresses an identical notification already on screen', async () => {
    mount();
    act(() => {
      fire(NOTIFICATION);
      fire(NOTIFICATION);
    });

    expect(await screen.findByText('Payment received')).toBeInTheDocument();
    expect(screen.queryByText(/more notification/)).not.toBeInTheDocument();
  });

  /**
   * A burst must not become a wall. One card is readable, the rest are counted — and the count is
   * rendered as text so it reaches a screen reader, which cannot see the stacked edges behind it.
   */
  it('shows one card and counts the rest rather than stacking them', async () => {
    mount();
    act(() => {
      fire({ category: 'order', title: 'First', body: 'a' });
      fire({ category: 'order', title: 'Second', body: 'b' });
      fire({ category: 'order', title: 'Third', body: 'c' });
    });

    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();
    expect(screen.queryByText('Third')).not.toBeInTheDocument();
    expect(screen.getByText('2 more notifications')).toBeInTheDocument();
  });

  /** Urgent things get their turn first — but nothing is discarded to make room. */
  it('brings a critical notification to the front without dropping the queue', async () => {
    mount();
    act(() => {
      fire({ category: 'order', title: 'Ordinary', body: 'a' });
      fire({ category: 'order', title: 'Also ordinary', body: 'b' });
      fire({ category: 'dispute', title: 'Chargeback opened', body: 'Respond by Friday.' });
    });

    // The urgent one is what you read first…
    expect(await screen.findByText('Chargeback opened')).toBeInTheDocument();
    // …and the other two are still queued behind it, not thrown away.
    expect(screen.getByText('2 more notifications')).toBeInTheDocument();
  });

  it('moves to the next notification when one is dismissed', async () => {
    mount();
    act(() => {
      fire({ category: 'order', title: 'First', body: 'a' });
      fire({ category: 'order', title: 'Second', body: 'b' });
    });
    await screen.findByText('First');

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    act(() => void vi.advanceTimersByTime(400));

    expect(await screen.findByText('Second')).toBeInTheDocument();
  });
});
