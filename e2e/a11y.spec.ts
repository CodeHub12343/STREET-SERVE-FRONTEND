import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * M10 in-browser accessibility audit. Unlike the jsdom/vitest-axe gate, this runs axe in a
 * real rendering engine, so it also covers `color-contrast` — the check jsdom can't compute.
 * We assert zero serious/critical violations against WCAG 2.1 A/AA on the key public screens,
 * across the full cross-device matrix.
 */
const SCREENS = [
  { name: 'marketing home', path: '/' },
  { name: 'map list view', path: '/map/list' },
  { name: 'business profile', path: '/business/biz_taco' },
];

for (const screen of SCREENS) {
  test(`${screen.name} has no serious/critical a11y violations`, async ({ page }) => {
    await page.goto(screen.path);
    await page.waitForLoadState('networkidle');

    // @axe-core/playwright bundles its own playwright-core Page type, which is structurally
    // identical but nominally distinct from @playwright/test's — cast across the seam.
    const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    const summary = blocking
      .map(
        (v) =>
          `  ✖ ${v.id} (${v.impact}) — ${v.nodes.length} node(s): ${v.help}\n` +
          v.nodes
            .slice(0, 4)
            .map((n) => `      ${n.target.join(' ')} :: ${n.html.slice(0, 90)}`)
            .join('\n'),
      )
      .join('\n');

    // Assert on the count so a failure prints our readable summary, not axe's giant object diff.
    expect(blocking.length, `\n${screen.name} a11y violations:\n${summary}`).toBe(0);
  });
}
