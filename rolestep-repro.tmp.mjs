/* Authenticated repro (exact-match Continue buttons this time). */
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 800)));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 600));
});
page.on('response', async (r) => {
  if (r.url().includes('/auth/roles') || (r.url().includes(':8080') && r.status() >= 400)) {
    let body = '';
    try { body = (await r.text()).slice(0, 300); } catch { /* */ }
    console.log('API', r.request().method(), r.status(), r.url().slice(0, 90), body);
  }
});

await page.goto('http://localhost:3000/sign-in', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);

await page.locator('input[name="identifier"]').fill('reprotester');
await page.getByRole('button', { name: 'Continue', exact: true }).click();
await page.waitForTimeout(3500);

const pw = page.locator('input[name="password"]:visible');
await pw.waitFor({ timeout: 15000 });
await pw.fill('StreetServe-Repro-1234!');
await page.getByRole('button', { name: 'Continue', exact: true }).click();
await page.waitForTimeout(8000);
console.log('after sign-in url:', page.url());

await page.goto('http://localhost:3000/onboarding/role', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
console.log('role page url:', page.url());

const runBiz = page.locator('text=Run a business');
if ((await runBiz.count()) === 0) {
  console.log('role step missing; body:', (await page.evaluate(() => document.body.innerText.slice(0, 250))).replace(/\n+/g, ' | '));
} else {
  await runBiz.click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForTimeout(9000);
  console.log('after continue url:', page.url());
  console.log('error boundary shown:', (await page.getByText('An unexpected error occurred').count()) > 0);
  console.log('body:', (await page.evaluate(() => document.body.innerText.slice(0, 300))).replace(/\n+/g, ' | '));
  await page.screenshot({ path: String.raw`C:\Users\HP\AppData\Local\Temp\claude\c--Users-HP-STREET-SERVE-APPLICATION\73068357-c514-4125-ae82-21f8b54d80a3\scratchpad\rolestep-after.png` });
}
await browser.close();
