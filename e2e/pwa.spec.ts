import { test, expect } from '@playwright/test';

/**
 * M10 PWA installability checks — the Lighthouse-PWA acceptance criteria, asserted directly:
 * a linked web manifest, a registered service worker, and a theme-color. Full Lighthouse
 * scoring is a CI/manual step (see LAUNCH_READINESS.md + lighthouserc.json); this keeps the
 * installable contract from silently regressing.
 *
 * Serwist only registers the SW in a production build, which is exactly what the webServer runs.
 */
test('app exposes a linked, valid web manifest', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href, 'a <link rel="manifest"> must be present').toBeTruthy();

  const res = await request.get(href!);
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.start_url).toBeTruthy();
  expect(manifest.display).toBe('standalone');
  expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeTruthy();
});

test('theme-color meta is set', async ({ page }) => {
  await page.goto('/');
  const themeColor = await page.locator('meta[name="theme-color"]').first().getAttribute('content');
  expect(themeColor).toBeTruthy();
});

test('service worker registers in the production build', async ({ page }) => {
  await page.goto('/');
  const registered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    // Serwist registers on load; give it a beat, then confirm a registration exists.
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) return true;
    return await new Promise<boolean>((resolve) => {
      const t = setTimeout(() => resolve(false), 8000);
      navigator.serviceWorker.ready.then(() => {
        clearTimeout(t);
        resolve(true);
      });
    });
  });
  expect(registered).toBeTruthy();
});
