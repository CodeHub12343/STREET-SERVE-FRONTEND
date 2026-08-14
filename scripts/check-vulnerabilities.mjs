#!/usr/bin/env node
/**
 * 6.1 — dependency CVE gate.
 *
 * ## Why this exists instead of `npm audit --audit-level=high`
 *
 * The plain command was already in CI here, and it is the wrong shape for two reasons:
 *
 * 1. **It audits dev dependencies.** Storybook and webpack advisories are real, and they are
 *    build-time issues in packages that never reach a user. Failing a deploy on a Storybook CVE
 *    trains people to add `--force` or delete the step, which is how a security gate dies.
 * 2. **It is all-or-nothing.** When a transitive advisory has no fix available, the only options are
 *    "ship broken CI" or "remove the check". Neither is a decision anyone would defend out loud.
 *
 * This script audits **production dependencies only** and supports a reviewed-exception list where
 * every entry carries a reason and an **expiry date**. An expired entry fails the build. That is the
 * mechanism that stops an exception list from silently becoming a permanent waiver — the same
 * ratchet the Phase 4 gates use.
 *
 * Dev-dependency advisories are still printed, as information. Visible, not blocking.
 *
 * Run:  node scripts/check-vulnerabilities.mjs
 */
import { execFileSync } from 'node:child_process';

const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical'];
const FAIL_AT = 'high';

/**
 * Advisories reviewed and accepted, with the reason and the date the acceptance expires.
 *
 * **An entry here is a decision, not a mute.** It says: someone looked at this advisory, understood
 * how it reaches (or does not reach) this application, and accepted the risk until a date. On that
 * date the build fails and someone looks again.
 */
const NEXT_MAJOR = 'Fixed only in Next 15/16. Next was moved 14.2.15 → 14.2.35 (the last 14.x), which cleared the critical middleware-authorization-bypass CVE-2025-29927. The rest need a framework major — tracked as its own project, not a patch.';

const REVIEWED = {
  // ── Next.js: all require a major upgrade off 14.x ────────────────────────────────────────────
  'GHSA-36qx-fr4f-26g5': {
    package: 'next',
    reason: `NOT APPLICABLE: the bypass requires the Pages Router with i18n. This app is App Router only and configures no i18n. ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },
  'GHSA-89xv-2m56-2m9x': {
    package: 'next',
    reason: `NOT APPLICABLE: SSRF in Server Actions on a CUSTOM server. This app has no custom server and no Server Actions (\`'use server'\` appears nowhere). ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },
  'GHSA-p9j2-gv94-2wf4': {
    package: 'next',
    reason: `NOT APPLICABLE: SSRF through \`rewrites\` with an attacker-controlled destination hostname. next.config declares no rewrites. ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },
  'GHSA-m99w-x7hq-7vfj': {
    package: 'next',
    reason: `NOT APPLICABLE: DoS in App Router Server Actions. No Server Actions in this app. ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },
  'GHSA-c4j6-fc7j-m34r': {
    package: 'next',
    reason: `LOW EXPOSURE: SSRF via WebSocket upgrades handled by Next. This app's realtime traffic goes to the separate backend's Socket.IO server, not through Next. ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },
  'GHSA-h25m-26qc-wcjf': {
    package: 'next',
    reason: `ACCEPTED RISK: request-deserialization DoS in React Server Components. The App Router does use RSC, so this is reduced but NOT eliminated by the absence of Server Actions — availability only, no data exposure. ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },
  'GHSA-q4gf-8mx6-v5v3': {
    package: 'next',
    reason: `ACCEPTED RISK: DoS with Server Components. Availability only. ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },
  'GHSA-8h8q-6873-q5fj': {
    package: 'next',
    reason: `ACCEPTED RISK: DoS with Server Components (second advisory, same class). Availability only. ${NEXT_MAJOR}`,
    until: '2026-11-01',
  },

  // ── Clerk ───────────────────────────────────────────────────────────────────────────────────
  // (js-cookie's GHSA-qjx8-664m-686j is NOT listed: it reaches this repo only through dev
  //  dependencies, so it never ships. The gate reports it as informational.)
  'GHSA-w24r-5266-9c3c': {
    package: '@clerk/clerk-react',
    reason:
      'NOT APPLICABLE: the bypass requires Clerk organization, billing, or reverification checks. This app uses none of them — Clerk answers "is there a session?" and nothing more; every role and permission decision is made server-side by the backend RBAC matrix against our own database. Fixed in Clerk 6.x (a major upgrade); tracked with the Next upgrade.',
    until: '2026-11-01',
  },
};

function severityAtLeast(severity, threshold) {
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(threshold);
}

function runJson(args) {
  try {
    // `npm audit` and `npm ls` both exit non-zero when they find something, so a throw is normal.
    return JSON.parse(execFileSync('npm', args, { encoding: 'utf8', shell: true, maxBuffer: 64e6 }));
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

function audit() {
  return runJson(['audit', '--json']);
}

/**
 * The set of packages that actually reach production.
 *
 * `npm audit --omit=dev` is **not** reliable for this — it still reports devDependencies
 * (`@playwright/test` shows up in this repo's `--omit=dev` output), so trusting it would gate
 * deploys on a test runner's advisories while claiming to audit only shipped code. Walking
 * `npm ls --omit=dev --all` gives the real production tree.
 */
function productionPackages() {
  const tree = runJson(['ls', '--omit=dev', '--all', '--json']);
  const names = new Set();
  const visit = (node) => {
    for (const [name, child] of Object.entries(node.dependencies ?? {})) {
      if (names.has(name)) continue;
      names.add(name);
      visit(child);
    }
  };
  visit(tree);
  return names;
}

/** Flatten npm's advisory tree into { id, package, severity, title, url }. */
function advisoriesFrom(report) {
  const out = new Map();
  for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of entry.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue;
      const id = via.url.split('/').pop();
      if (!out.has(id)) {
        out.set(id, {
          id,
          package: via.name ?? name,
          severity: via.severity ?? entry.severity,
          title: via.title ?? '(no title)',
          url: via.url,
        });
      }
    }
  }
  return [...out.values()];
}

function main() {
  const today = new Date().toISOString().slice(0, 10);

  const shipped = productionPackages();
  const all = advisoriesFrom(audit()).filter((a) => severityAtLeast(a.severity, FAIL_AT));
  const prod = all.filter((a) => shipped.has(a.package));
  const blocking = [];
  const accepted = [];
  const expired = [];

  for (const advisory of prod) {
    const exception = REVIEWED[advisory.id];
    if (!exception) blocking.push(advisory);
    else if (exception.until < today) expired.push({ ...advisory, ...exception });
    else accepted.push({ ...advisory, ...exception });
  }

  // Reviewed entries for advisories that no longer appear — a fixed dependency should not leave a
  // standing exception behind, because the next advisory on that package would inherit the waiver.
  const present = new Set(prod.map((a) => a.id));
  const stale = Object.keys(REVIEWED).filter((id) => !present.has(id));

  // Informational: dev-only advisories. Never blocking — they do not ship.
  const devOnly = all.filter((a) => !shipped.has(a.package));

  if (devOnly.length > 0) {
    console.log(`\nℹ  ${devOnly.length} dev-dependency advisor(ies) at ${FAIL_AT}+ (not shipped, not blocking):`);
    for (const a of devOnly) console.log(`     ${a.severity.padEnd(8)} ${a.package} — ${a.title}`);
  }
  if (accepted.length > 0) {
    console.log(`\n⏳ ${accepted.length} reviewed exception(s) still in force:`);
    for (const a of accepted) console.log(`     ${a.package} (${a.id}) until ${a.until} — ${a.reason}`);
  }

  if (blocking.length === 0 && expired.length === 0 && stale.length === 0) {
    console.log(`\n✔ No unreviewed ${FAIL_AT}+ advisories in production dependencies.\n`);
    return;
  }

  console.error('\n✖ Dependency vulnerability check FAILED\n');
  if (blocking.length > 0) {
    console.error(`  ${blocking.length} unreviewed ${FAIL_AT}+ advisor(ies) in PRODUCTION dependencies.`);
    console.error('  Upgrade, or add to REVIEWED with a reason and an expiry date:\n');
    for (const a of blocking) {
      console.error(`    ${a.severity.padEnd(8)} ${a.package}  ${a.id}`);
      console.error(`             ${a.title}`);
      console.error(`             ${a.url}`);
    }
    console.error('');
  }
  if (expired.length > 0) {
    console.error(`  ${expired.length} reviewed exception(s) have EXPIRED — re-review them:\n`);
    for (const a of expired) console.error(`    ${a.package} (${a.id}) expired ${a.until} — ${a.reason}`);
    console.error('');
  }
  if (stale.length > 0) {
    console.error(`  ${stale.length} REVIEWED entr(ies) no longer match any advisory — delete them,`);
    console.error('  or the next advisory on that package inherits the waiver:\n');
    for (const id of stale) console.error(`    ${id}`);
    console.error('');
  }
  process.exit(1);
}

main();
