import { test, expect, type Page } from '@playwright/test';

/**
 * M10 cross-device smoke: every public/demo surface must load, render its real content,
 * and raise no uncaught page errors on any of the three device profiles.
 */

/** Fail the test if the page throws an uncaught error or logs a console error. */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test('marketing home renders and links into the app', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('on the move');
  await expect(page.getByRole('link', { name: /Customer · Map/ })).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('map list view renders real demo vendors', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/map/list');
  await expect(page.getByText('Taco Loco')).toBeVisible();
  await expect(page.getByText('Bean Bus')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('business profile deep-link opens with real data', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/business/biz_taco');
  await expect(page.getByText('Taco Loco')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('onboarding welcome carousel is reachable', async ({ page }) => {
  await page.goto('/welcome');
  // The carousel + a way forward must render (keyless demo boot).
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByRole('button').first()).toBeVisible();
});
