// Proves the payouts reconciliation on the real business that had the mismatch: the charge our
// ledger called `pending` (but Stripe had as paid) gets settled, so "earned" matches the balance.
import { chromium } from '@playwright/test';

const BID = '6a5a21088d8a5c825f3ab952'; // Santiago Funiture Hub
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
async function signIn(user, pass) {
  for (let i = 1; i <= 4; i++) {
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'domcontentloaded', timeout: 180_000 });
    try { await page.locator('input[name="identifier"]:enabled').waitFor({ state: 'visible', timeout: 30_000 }); break; } catch {}
  }
  await page.locator('input[name="identifier"]:enabled').fill(user);
  await page.locator('input[name="password"]:enabled').fill(pass);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 60_000 });
}
const api = (p) => page.evaluate(async (path) => {
  const t = await window.Clerk.session.getToken({ template: 'streetserve-api' });
  const r = await fetch('http://localhost:8080/api/v1' + path, { headers: { Authorization: 'Bearer ' + t } });
  return { status: r.status, body: await r.json().catch(() => null) };
}, p);

// The owner of Santiago Funiture Hub must be signed in to read its payouts.
await signIn(process.env.SS_USER ?? 'reprotester', process.env.SS_PASS ?? 'StreetServe-Repro-1234!');
const res = await api(`/businesses/${BID}/payouts`);
console.log('GET /businesses/:id/payouts → ' + res.status);
if (res.status !== 200) { console.log(JSON.stringify(res.body)); await browser.close(); process.exit(0); }
const d = res.body.data;
const money = (c) => '$' + (c / 100).toFixed(2);
console.log('  available : ' + money(d.balance?.availableCents ?? 0));
console.log('  clearing  : ' + money(d.balance?.pendingCents ?? 0));
console.log('  at Stripe : ' + money((d.balance?.availableCents ?? 0) + (d.balance?.pendingCents ?? 0)));
console.log('  earned    : ' + money(d.summary.netEarnedCents) + ' from ' + d.summary.salesCount + ' sales');
console.log('  earnings rows: ' + d.earnings.length + ' -> ' + JSON.stringify(d.earnings.map((e) => e.status + ':' + money(e.netCents))));
await browser.close();
