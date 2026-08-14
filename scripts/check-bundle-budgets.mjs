#!/usr/bin/env node
/**
 * M10 performance budgets — fail the build when client JS regresses.
 *
 * Reads Next's `.next/app-build-manifest.json` (route → static JS chunks) and measures the
 * gzipped bytes each route ships on first load, plus the shared baseline every route pays.
 * These are the same "First Load JS" numbers `next build` prints, made enforceable.
 *
 * Run after `next build`:  node scripts/check-bundle-budgets.mjs
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(process.cwd());
const NEXT_DIR = join(ROOT, '.next');

// Budgets in KB of *gzipped* JavaScript. Tighten as the app is optimized; never loosen
// silently — a bump here should be a reviewed decision.
const BUDGETS = {
  sharedFirstLoadKB: 130, // JS every route loads (framework + shared app chunks)
  perRouteFirstLoadKB: 260, // worst-case route (shared + route-specific)
};

const KB = 1024;

function fail(msg) {
  console.error(`\n✖ Performance budget check FAILED\n  ${msg}\n`);
  process.exit(1);
}

if (!existsSync(NEXT_DIR)) fail('.next not found — run `next build` first.');

const appManifestPath = join(NEXT_DIR, 'app-build-manifest.json');
const buildManifestPath = join(NEXT_DIR, 'build-manifest.json');
if (!existsSync(appManifestPath)) fail(`${appManifestPath} not found — is this an App Router build?`);

const appManifest = JSON.parse(readFileSync(appManifestPath, 'utf8'));
const buildManifest = existsSync(buildManifestPath)
  ? JSON.parse(readFileSync(buildManifestPath, 'utf8'))
  : { rootMainFiles: [] };

const gzipCache = new Map();
function gzipKB(file) {
  if (gzipCache.has(file)) return gzipCache.get(file);
  const abs = join(NEXT_DIR, file);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    gzipCache.set(file, 0);
    return 0;
  }
  const kb = gzipSync(readFileSync(abs)).length / KB;
  gzipCache.set(file, kb);
  return kb;
}

/** Sum gzipped size of a list of static files (js only). */
function sizeKB(files) {
  return (files || [])
    .filter((f) => f.endsWith('.js'))
    .reduce((sum, f) => sum + gzipKB(f), 0);
}

// Shared baseline = the root main files every App Router route boots with.
const sharedFiles = buildManifest.rootMainFiles?.length
  ? buildManifest.rootMainFiles
  : appManifest.pages?.['/layout'] || [];
const sharedKB = sizeKB(sharedFiles);

const routes = Object.entries(appManifest.pages || {})
  .map(([route, files]) => ({ route, kb: sizeKB(files) }))
  .sort((a, b) => b.kb - a.kb);

const worst = routes[0] ?? { route: '(none)', kb: 0 };

console.log('\nPerformance budgets (gzipped JS)');
console.log('────────────────────────────────');
console.log(`Shared first-load JS : ${sharedKB.toFixed(1)} KB  (budget ${BUDGETS.sharedFirstLoadKB} KB)`);
console.log(`Heaviest route       : ${worst.kb.toFixed(1)} KB  (${worst.route})  (budget ${BUDGETS.perRouteFirstLoadKB} KB)`);
console.log('\nTop 8 routes by first-load JS:');
for (const r of routes.slice(0, 8)) {
  console.log(`  ${r.kb.toFixed(1).padStart(7)} KB  ${r.route}`);
}

const failures = [];
if (sharedKB > BUDGETS.sharedFirstLoadKB) {
  failures.push(`Shared first-load JS ${sharedKB.toFixed(1)}KB > ${BUDGETS.sharedFirstLoadKB}KB budget.`);
}
if (worst.kb > BUDGETS.perRouteFirstLoadKB) {
  failures.push(`Route ${worst.route} ${worst.kb.toFixed(1)}KB > ${BUDGETS.perRouteFirstLoadKB}KB budget.`);
}

if (failures.length) fail(failures.join('\n  '));
console.log('\n✔ All performance budgets satisfied.\n');
