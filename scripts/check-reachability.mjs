#!/usr/bin/env node
/**
 * A-1 — the reachability gate.
 *
 * The single most common finding in the 2026-08 audit was not a bug. It was **complete, tested,
 * revenue-bearing backend code that no user could reach**, because the frontend for it was never
 * built: rent-to-own (§42–53), paid placements (RV-11/17/18), and consignment-RTO (§54–56) were all
 * shipped as endpoints with zero callers. The clearest artefact was `useRtoDisclosure` — written,
 * exported, and consumed by nothing.
 *
 * That was found by grepping for callers. No automated signal existed, which is why roughly 30% of
 * the audit's findings were the same shape. This script is that grep, run in CI.
 *
 * ## What it checks
 *
 * Every leaf in `src/lib/api/endpoints.ts` must be referenced somewhere outside that file. An
 * endpoint definition with no caller is either a feature that was never wired up, or dead weight
 * that still carries maintenance cost and API surface.
 *
 * ## Why an allowlist exists
 *
 * Some endpoints are legitimately defined ahead of their UI — a backend contract landing before the
 * screen that consumes it is a normal sequencing choice, not a mistake. The allowlist makes that
 * choice **explicit and dated** rather than invisible. Each entry needs a reason. An entry that
 * becomes reachable must be removed: a stale allowlist is how this check would quietly stop working.
 *
 * Run:  node scripts/check-reachability.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, 'src');
const ENDPOINTS_FILE = join(SRC, 'lib', 'api', 'endpoints.ts');

/**
 * Endpoints defined ahead of the UI that consumes them, with the reason.
 *
 * This is the **Phase 4 baseline**, and it is longer than anyone would like — 26 endpoints with no
 * caller. That is the finding, not a workaround: the audit identified three unreachable backends
 * (RTO, paid placements, consignment-RTO) by hand and this gate shows the same pattern is broader.
 * Each line below is a working backend capability that no user can currently reach.
 *
 * The list is a ratchet. It may shrink, never grow: a NEW unreachable endpoint fails the build, and
 * an entry that becomes reachable must be deleted or the script reports it as stale. That is what
 * keeps an allowlist from quietly becoming an off switch.
 */
const ALLOWLIST = {
  notificationsReadAll: 'Bell UI marks items read individually; no "mark all read" control yet.',
  publicProfile: 'Public user profiles are not a screen; the app shows seller profiles instead.',
  launch: 'The landing page reads its prelaunch/live state from an env var, not this endpoint.',
  sponsors: 'Public sponsor listing has no screen; only the admin management view is built.',
  'liveSessions.location':
    'Location updates ride the heartbeat; the standalone location PATCH is unused.',
  'business.reviews':
    'Reviews are fetched through the generic /reviews endpoint with a subject filter.',
  'business.registerHub': 'Hub self-registration UI is not built (hubs are created by admins).',
  'queue.checkout': 'Checkout-from-queue is not wired; customers check out from the order flow.',
  transactions: 'Global transaction list is admin-only and unbuilt; the app uses transactionsMine.',
  transaction: 'No single-transaction detail screen; the receipt renders from the list payload.',
  'checkout.commission': '§36 commission change — backend complete, seller UI not built (D-1).',
  rtoReturnComplete:
    '§51 return: the customer can request one, but the seller-side completion screen is not built.',
  waiverHistory: 'Stock-protection waiver history has no screen; only the current state is shown.',
  coursePurchase: 'Paid courses are configured but the purchase flow is not built.',
  outcomeStats: 'AI outcome statistics are collected and have no reporting screen.',
  events: 'The events feed backs the AI demand signals; there is no events browser.',
  'shelterPartner.exit': 'Shelter enrollment exit is handled by staff off-platform.',
  trustScore: 'Trust scores drive fees server-side; no screen displays the raw score.',
  dispute: 'No dispute detail screen — the app can open disputes but not view one.',
  aiRecommendationsLocations: 'Location recommendations are surfaced through the Income Coach.',
  aiPricingSuggestion: 'Pricing suggestions are not surfaced in the seller UI.',
  aiSalesCoaching: 'Sales coaching is not surfaced in the seller UI.',
  disputeEvidence: 'Evidence upload is not built; disputes are opened with text only.',
  salePaymentsForCheckout: 'Consignment sale payments are read through the checkout detail payload.',
  hubTaxStatement: 'Hub tax statements have no screen; only seller statements are rendered.',
  saleRefunds: 'Per-sale refund history has no screen.',
  'admin.auditLogs': 'Audit log viewer is not built; logs are queried directly in ops.',
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

/**
 * Collect every leaf path in the `endpoints` object literal by tracking brace depth and the key
 * stack. Textual rather than an import: this runs before/without a build, and the file is a single
 * flat literal of string and arrow-function values, which makes the parse cheap and reliable.
 */
function collectLeafPaths(source) {
  const body = source.slice(source.indexOf('export const endpoints = {'));
  const lines = body.split('\n');
  const stack = [];
  const leaves = [];

  for (const raw of lines) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line || line.startsWith('*') || line.startsWith('/*')) continue;

    // Two shapes open a nested group:
    //   `admin: {`                       — a plain sub-object
    //   `business: (id: string) => ({`   — a parameterised group, which is how most of this file is
    //                                      written, because the path needs the id
    const open = line.match(/^([A-Za-z0-9_]+)\s*:\s*(?:\([^)]*\)\s*=>\s*)?\(?\{$/);
    if (open) {
      stack.push(open[1]);
      continue;
    }
    if (line.startsWith('}')) {
      stack.pop();
      continue;
    }
    // `key: '...'` or `key: (args) => \`...\``
    const leaf = line.match(/^([A-Za-z0-9_]+)\s*:/);
    if (leaf) leaves.push([...stack, leaf[1]].join('.'));
  }
  return leaves;
}

function main() {
  const endpointSource = readFileSync(ENDPOINTS_FILE, 'utf8');
  const leaves = collectLeafPaths(endpointSource);

  if (leaves.length < 50) {
    console.error(
      `\n✖ Reachability check FAILED\n  Parsed only ${leaves.length} endpoints — the parser is ` +
        `probably broken. A check that finds nothing passes vacuously.\n`,
    );
    process.exit(1);
  }

  const callers = walk(SRC)
    .filter((f) => f !== ENDPOINTS_FILE)
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  const unreachable = [];
  const staleAllowlist = [];
  // The other half of the same problem: a caller that hardcodes the path bypasses the registry
  // entirely, so the endpoint looks unreachable AND the raw string is back in feature code — which
  // is exactly what this module exists to prevent ("keeps raw path strings out of feature code").
  const bypasses = [];
  const bypassPattern = /api\s*\.\s*(?:get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*[`'"](\/[^`'"]*)/g;
  for (const file of walk(SRC)) {
    if (file.startsWith(join(SRC, 'lib', 'api'))) continue; // the client itself may build paths
    for (const match of readFileSync(file, 'utf8').matchAll(bypassPattern)) {
      bypasses.push(`${relative(ROOT, file)} → api call to '${match[1]}'`);
    }
  }

  for (const path of leaves) {
    const segments = path.split('.');
    // A group may be parameterised, so `business.dashboard` is called as
    // `endpoints.business(id).dashboard` — the separator has to tolerate an argument list.
    const SEP = '(?:\\([^)]*\\))?\\s*\\.\\s*';
    let reached = new RegExp(`endpoints\\s*\\.\\s*${segments.join(SEP)}\\b`).test(callers);
    // Also reachable if an ancestor is handed around as a whole object (`const q = endpoints.queue(id)`),
    // which genuinely reaches every leaf under it.
    for (let i = 1; i < segments.length && !reached; i++) {
      const prefix = segments.slice(0, i).join(SEP);
      reached = new RegExp(`endpoints\\s*\\.\\s*${prefix}\\s*(?:\\([^)]*\\))?(?![.\\w(])`).test(callers);
    }

    if (reached) {
      if (ALLOWLIST[path]) staleAllowlist.push(path);
    } else if (!ALLOWLIST[path]) {
      unreachable.push(path);
    }
  }

  if (unreachable.length === 0 && staleAllowlist.length === 0 && bypasses.length === 0) {
    const allowed = Object.keys(ALLOWLIST).length;
    console.log(
      `✔ Reachability: all ${leaves.length - allowed} endpoints have a caller` +
        (allowed ? `, ${allowed} allowlisted as built-but-unreachable` : ''),
    );
    return;
  }

  console.error('\n✖ Reachability check FAILED\n');
  if (unreachable.length > 0) {
    console.error(
      `  ${unreachable.length} endpoint(s) defined in ${relative(ROOT, ENDPOINTS_FILE)} with no ` +
        `caller anywhere in src/.\n  Either build the UI that uses them, delete them, or add them ` +
        `to ALLOWLIST with a reason:\n`,
    );
    for (const path of unreachable) console.error(`    endpoints.${path}`);
    console.error('');
  }
  if (staleAllowlist.length > 0) {
    console.error(
      `  ${staleAllowlist.length} ALLOWLIST entr(ies) are now reachable — remove them, or the ` +
        `allowlist stops describing reality:\n`,
    );
    for (const path of staleAllowlist) console.error(`    ${path}`);
    console.error('');
  }
  if (bypasses.length > 0) {
    console.error(
      `  ${bypasses.length} api call(s) hardcode a path instead of using the endpoints registry.\n` +
        `  Add the path to endpoints.ts and call it from there:\n`,
    );
    for (const line of bypasses) console.error(`    ${line}`);
    console.error('');
  }
  process.exit(1);
}

main();
