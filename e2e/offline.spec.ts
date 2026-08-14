import { test, expect } from '@playwright/test';

/**
 * M10 offline-state verification (PWA_IMPLEMENTATION.md §4). Proves the global offline
 * indicator reacts to connectivity and the app shell survives losing the network — the
 * "offline state verified on every screen" launch gate, exercised on the shared shell.
 */
test('offline banner appears when the network drops and clears on reconnect', async ({
  page,
  context,
}) => {
  await page.goto('/map/list');
  await expect(page.getByText('Taco Loco')).toBeVisible();

  // Drop the network — the OfflineBanner (role=status) should announce offline.
  await context.setOffline(true);
  const banner = page.getByText(/You’re offline/);
  await expect(banner).toBeVisible();

  // The already-rendered shell content stays put (no white-screen crash).
  await expect(page.getByText('Taco Loco')).toBeVisible();

  // Reconnect — the offline banner clears once nothing is queued.
  await context.setOffline(false);
  await expect(banner).toBeHidden();
});
